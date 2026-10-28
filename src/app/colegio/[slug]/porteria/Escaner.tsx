"use client";

import type { IScannerControls } from "@zxing/browser";
import { Camera, CameraOff, CloudOff, Loader2, Maximize, ScanLine, Search, UserRound, CircleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AvisoColaFallida } from "@/components/AvisoColaFallida";
import { EstadoAsistencia, ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { IndicadorSinConexion } from "@/components/IndicadorSinConexion";
import { Boton } from "@/components/ui/Boton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useColaOffline } from "@/lib/cliente/cola-offline";
import { esErrorDeRed, textoPendientes, type ResultadoEnvio } from "@/lib/registro-offline";
import { tokenDesdeQr } from "@/lib/token-qr";
import type { ResultadoPorteria } from "@/lib/server/porteria";
import { colaEscaneos, type EscaneoPendiente } from "./colaEscaneos";
import { buscarAlumnosAction, registrarManualAction, registrarPorQrAction } from "./actions";

/** Resultado mostrado en pantalla: el del servidor o «guardado sin conexión» (no se muestran datos del alumno). */
type ResultadoLocal = ResultadoPorteria | { ok: true; tipo: "sin-conexion" };

type Encontrado = Awaited<ReturnType<typeof buscarAlumnosAction>>[number];

/** Pausa tras una lectura para no registrar el mismo carnet varias veces seguidas. */
const PAUSA_MS = 2500;

function avisar(ok: boolean) {
  try {
    navigator.vibrate?.(ok ? 80 : [60, 60, 60]);
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    osc.frequency.value = ok ? 880 : 220;
    osc.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.15);
  } catch {
    // Sonido y vibración son opcionales.
  }
}

export function Escaner({ slug }: { slug: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const controles = useRef<IScannerControls | null>(null);
  const ultimaLectura = useRef<{ texto: string; at: number } | null>(null);
  const [camara, setCamara] = useState<"apagada" | "encendida" | "error">("apagada");
  const [resultado, setResultado] = useState<ResultadoLocal | null>(null);
  const [sonido, setSonido] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [encontrados, setEncontrados] = useState<Encontrado[]>([]);
  const [pendiente, iniciar] = useTransition();

  const mostrar = useCallback(
    (r: ResultadoLocal) => {
      setResultado(r);
      if (sonido) avisar(r.ok);
    },
    [sonido],
  );

  const enviarPendiente = useCallback(
    async (item: EscaneoPendiente): Promise<ResultadoEnvio> => {
      try {
        const r = await registrarPorQrAction(item.slug, item.token, item.creadoAt);
        return r.ok ? "enviado" : "descartar";
      } catch (error) {
        // Sin red no cuenta intento; un error del servidor sí (tope: MAX_INTENTOS_COLA).
        return esErrorDeRed(error, navigator.onLine) ? "reintentar" : "fallo";
      }
    },
    [],
  );
  const { pendientes, agotados, enLinea, enviando, descartar } = useColaOffline(colaEscaneos, enviarPendiente, ({ enviados, descartados, agotados }) => {
    if (enviados > 0) toast.success(enviados === 1 ? "Se sincronizó 1 llegada guardada sin conexión" : `Se sincronizaron ${enviados} llegadas guardadas sin conexión`);
    if (agotados > 0) toast.error("No se pudo enviar una llegada guardada sin conexión después de varios intentos. Descártala y vuelve a escanear el carnet.");
    if (descartados > 0) toast.error(descartados === 1 ? "1 carnet guardado sin conexión no era válido y se descartó" : `${descartados} carnets guardados sin conexión no eran válidos y se descartaron`);
  });

  const alLeer = useCallback(
    (texto: string) => {
      const ahora = Date.now();
      const ultima = ultimaLectura.current;
      if (ultima && ultima.texto === texto && ahora - ultima.at < PAUSA_MS) return;
      ultimaLectura.current = { texto, at: ahora };
      iniciar(async () => {
        const guardarSinConexion = async () => {
          const token = tokenDesdeQr(texto);
          if (!token) return mostrar({ ok: false, mensaje: "Carnet no válido para este colegio" });
          const iso = new Date().toISOString();
          await colaEscaneos.agregarSiNoExiste({ id: token, creadoAt: iso, slug, token });
          mostrar({ ok: true, tipo: "sin-conexion" });
        };
        if (!navigator.onLine) return guardarSinConexion();
        try {
          mostrar(await registrarPorQrAction(slug, texto));
        } catch (error) {
          if (esErrorDeRed(error, navigator.onLine)) return guardarSinConexion();
          throw error;
        }
      });
    },
    [slug, mostrar],
  );

  async function encender() {
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const lector = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
      controles.current = await lector.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        video.current!,
        (lectura) => {
          if (lectura) alLeer(lectura.getText());
        },
      );
      setCamara("encendida");
    } catch {
      setCamara("error");
    }
  }

  function apagar() {
    controles.current?.stop();
    controles.current = null;
    setCamara("apagada");
  }

  useEffect(() => () => controles.current?.stop(), []);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => setEncontrados(await buscarAlumnosAction(slug, busqueda)));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div ref={contenedor} className="flex flex-col gap-4 bg-background">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-sidebar">
          <video ref={video} className="h-full w-full object-cover" muted playsInline aria-label="Cámara para leer el carnet" />
          {camara === "encendida" ? (
            <span aria-hidden className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-maiz/90" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sidebar-foreground">
              <CameraOff className="size-10" strokeWidth={2} aria-hidden />
              <p className="max-w-xs">{camara === "error" ? "No se pudo abrir la cámara. Revisa los permisos o usa la búsqueda manual." : "La cámara está apagada."}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {camara === "encendida" ? (
            <Boton type="button" variante="secundario" tamano="lg" onClick={apagar}>
              <CameraOff className="size-4" strokeWidth={2} aria-hidden /> Apagar cámara
            </Boton>
          ) : (
            <Boton type="button" tamano="lg" onClick={encender}>
              <Camera className="size-4" strokeWidth={2} aria-hidden /> Encender cámara
            </Boton>
          )}
          <Boton type="button" variante="secundario" tamano="lg" onClick={() => contenedor.current?.requestFullscreen?.()}>
            <Maximize className="size-4" strokeWidth={2} aria-hidden /> Pantalla completa
          </Boton>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={sonido} onChange={(e) => setSonido(e.target.checked)} className="size-5 accent-primary" />
            Sonido y vibración
          </label>
        </div>
        <IndicadorSinConexion enLinea={enLinea} enviando={enviando} pendientes={pendientes} textoPendientes={textoPendientes(pendientes, "llegada", "llegadas", "guardada")} />
        <AvisoColaFallida cantidad={agotados.length} singular="llegada" plural="llegadas" onDescartar={() => void Promise.all(agotados.map((e) => descartar(e.id)))} />
        <Resultado resultado={resultado} />
      </div>

      <section aria-labelledby="titulo-manual">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h2 id="titulo-manual" className="text-titulo-2">¿No trae su carnet?</h2>
              <p className="text-sm text-muted-foreground">{enLinea ? "Busca al alumno y registra su llegada a mano." : "La búsqueda manual necesita conexión. Los carnets sí se guardan sin conexión."}</p>
            </div>
            <form onSubmit={buscar} className="flex gap-2">
              <label htmlFor="busqueda" className="sr-only">Nombre, apellido o código</label>
              <Input
                id="busqueda"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                minLength={2}
                placeholder="Nombre, apellido o código"
                className="h-11 min-w-0 flex-1"
              />
              <Boton type="submit" variante="secundario" tamano="lg" disabled={pendiente || !enLinea}>
                {pendiente ? <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden /> : <Search className="size-4" strokeWidth={2} aria-hidden />} Buscar
              </Boton>
            </form>
            {encontrados.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <ScanLine className="size-4 shrink-0" strokeWidth={2} aria-hidden /> Los resultados de la búsqueda aparecerán aquí.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {encontrados.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                    <span>
                      <span className="font-semibold">{a.nombre}</span>
                      <span className="block text-sm text-muted-foreground">
                        {a.salon}
                        {a.codigo ? ` · ${a.codigo}` : ""}
                      </span>
                    </span>
                    <Boton type="button" disabled={pendiente || !enLinea} onClick={() => iniciar(async () => mostrar(await registrarManualAction(slug, a.id)))}>
                      Registrar llegada
                    </Boton>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Resultado({ resultado }: { resultado: ResultadoLocal | null }) {
  if (!resultado) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <ScanLine className="size-5 shrink-0" strokeWidth={2} aria-hidden /> Acerca el carnet a la cámara. Aquí verás el resultado.
      </p>
    );
  }
  if (!resultado.ok) {
    return (
      <div role="alert" className="flex items-center gap-4 rounded-lg border border-falta/30 bg-falta-fondo p-5 text-falta">
        <CircleAlert className="size-12 shrink-0" strokeWidth={2} aria-hidden />
        <p className="text-titulo-2">{resultado.mensaje}</p>
      </div>
    );
  }
  if (resultado.tipo === "sin-conexion") {
    return (
      <div role="status" className="flex items-center gap-4 rounded-lg border border-tarde/30 bg-tarde-fondo p-5 text-tarde">
        <CloudOff className="size-12 shrink-0" strokeWidth={2} aria-hidden />
        <div>
          <p className="text-titulo-2">Guardado sin conexión</p>
          <p className="text-sm text-foreground">Se registrará la llegada cuando vuelva la conexión.</p>
        </div>
      </div>
    );
  }
  const { clase } = ESTADOS_ASISTENCIA[resultado.estado];
  return (
    <div role="status" className={`flex items-center gap-4 rounded-lg border border-current/20 p-5 ${clase}`}>
      {resultado.alumno.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resultado.alumno.fotoUrl} alt="" className="size-20 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
          <UserRound className="size-10" strokeWidth={2} aria-hidden />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-titulo-2 text-balance text-foreground">{resultado.alumno.nombre}</p>
        <p className="text-muted-foreground">{resultado.alumno.salon}</p>
        <div className="flex flex-wrap items-center gap-2">
          <EstadoAsistencia estado={resultado.estado} />
          <span className="text-cuerpo font-semibold">{resultado.mensaje}</span>
        </div>
      </div>
    </div>
  );
}
