"use client";

import type { IScannerControls } from "@zxing/browser";
import { Camera, CameraOff, CloudOff, Loader2, LogIn, LogOut, Maximize, ScanLine, Search, UserRound, CircleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AvisoColaFallida } from "@/components/AvisoColaFallida";
import { ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { IndicadorSinConexion } from "@/components/IndicadorSinConexion";
import { Boton } from "@/components/ui/Boton";
import { Input } from "@/components/ui/input";
import { useColaOffline } from "@/lib/cliente/cola-offline";
import { esErrorDeRed, textoPendientes, type ResultadoEnvio } from "@/lib/registro-offline";
import { tokenDesdeQr } from "@/lib/token-qr";
import type { ResultadoPorteria } from "@/lib/server/porteria";
import { colaEscaneos, type EscaneoPendiente } from "./colaEscaneos";
import { buscarAlumnosAction, registrarManualAction, registrarPorQrAction } from "./actions";

/** Resultado mostrado en pantalla: el del servidor o «guardado sin conexión» (no se muestran datos del alumno). */
type ResultadoLocal = ResultadoPorteria | { ok: true; tipo: "sin-conexion"; movimiento?: Movimiento };

/** Modo de la portería: registrar la llegada (por defecto) o la salida del colegio (specs/05). */
type Movimiento = "llegada" | "salida";

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
  const [modo, setModo] = useState<Movimiento>("llegada");

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
        const r = await registrarPorQrAction(item.slug, item.token, item.creadoAt, item.movimiento ?? "llegada");
        return r.ok ? "enviado" : "descartar";
      } catch (error) {
        // Sin red no cuenta intento; un error del servidor sí (tope: MAX_INTENTOS_COLA).
        return esErrorDeRed(error, navigator.onLine) ? "reintentar" : "fallo";
      }
    },
    [],
  );
  const { pendientes, agotados, enLinea, enviando, descartar } = useColaOffline(colaEscaneos, enviarPendiente, ({ enviados, descartados, agotados }) => {
    if (enviados > 0) toast.success(enviados === 1 ? "Se sincronizó 1 lectura guardada sin conexión" : `Se sincronizaron ${enviados} lecturas guardadas sin conexión`);
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
          // La salida va con otra clave: no se confunde con la llegada del mismo carnet.
          await colaEscaneos.agregarSiNoExiste({ id: modo === "salida" ? `${token}:salida` : token, creadoAt: iso, slug, token, movimiento: modo });
          mostrar({ ok: true, tipo: "sin-conexion", movimiento: modo });
        };
        if (!navigator.onLine) return guardarSinConexion();
        try {
          mostrar(await registrarPorQrAction(slug, texto, undefined, modo));
        } catch (error) {
          if (esErrorDeRed(error, navigator.onLine)) return guardarSinConexion();
          throw error;
        }
      });
    },
    [slug, mostrar, modo],
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

  const verbo = modo === "salida" ? "salida" : "llegada";
  return (
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div ref={contenedor} className="flex flex-col gap-4 bg-background">
        <div role="group" aria-label="Qué registrar" className="grid grid-cols-2 gap-1 rounded-xl bg-superficie-2 p-1">
          {([
            { valor: "llegada" as const, texto: "Llegada", Icono: LogIn },
            { valor: "salida" as const, texto: "Salida", Icono: LogOut },
          ]).map(({ valor, texto, Icono }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={modo === valor}
              onClick={() => {
                setModo(valor);
                setResultado(null);
                ultimaLectura.current = null;
              }}
              className={`inline-flex min-h-14 items-center justify-center gap-2.5 rounded-[10px] px-4 font-heading text-[20px] font-semibold transition-colors duration-150 motion-reduce:transition-none ${modo === valor ? "bg-superficie text-sec-tinta shadow-xs ring-1 ring-sec-trazo" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icono className="size-6" strokeWidth={2} aria-hidden /> {texto}
            </button>
          ))}
        </div>
        <Resultado resultado={resultado} verbo={verbo} />
        <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-sidebar">
          <video ref={video} className="h-full w-full object-cover" muted playsInline aria-label="Cámara para leer el carnet" />
          {camara === "encendida" ? (
            <span aria-hidden className="pointer-events-none absolute inset-[18%] rounded-[14px] border-2 border-maiz/90" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sidebar-foreground">
              <CameraOff className="size-10" strokeWidth={2} aria-hidden />
              <p className="max-w-xs text-cuerpo">{camara === "error" ? "No se pudo abrir la cámara. Revisa los permisos o usa la búsqueda manual." : "La cámara está apagada."}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {camara === "encendida" ? (
            <Boton type="button" variante="secundario" tamano="lg" onClick={apagar}>
              <CameraOff className="size-4" strokeWidth={2} aria-hidden /> Apagar cámara
            </Boton>
          ) : (
            <Boton type="button" tamano="lg" onClick={encender}>
              <Camera className="size-4" strokeWidth={2} aria-hidden /> Encender cámara
            </Boton>
          )}
          <Boton type="button" variante="fantasma" tamano="lg" onClick={() => contenedor.current?.requestFullscreen?.()}>
            <Maximize className="size-4" strokeWidth={2} aria-hidden /> Pantalla completa
          </Boton>
          <label className="flex min-h-11 items-center gap-2 text-cuerpo-sm">
            <input type="checkbox" checked={sonido} onChange={(e) => setSonido(e.target.checked)} className="size-5 accent-primary" />
            Sonido y vibración
          </label>
        </div>
        <IndicadorSinConexion enLinea={enLinea} enviando={enviando} pendientes={pendientes} textoPendientes={textoPendientes(pendientes, "lectura", "lecturas", "guardada")} />
        <AvisoColaFallida cantidad={agotados.length} singular="lectura" plural="lecturas" onDescartar={() => void Promise.all(agotados.map((e) => descartar(e.id)))} />
      </div>

      <div className="flex flex-col gap-8">
        <section aria-labelledby="titulo-manual" className="flex flex-col gap-4">
          <div>
            <h2 id="titulo-manual" className="inline-flex items-center gap-2.5 font-heading text-[18px] leading-6 font-semibold">
              <span aria-hidden className="size-2.5 rounded-full bg-sec-nudo" />
              ¿No trae su carnet?
            </h2>
            <p className="mt-1 text-cuerpo-sm text-muted-foreground">{enLinea ? `Busca al alumno y registra su ${modo} a mano.` : "La búsqueda manual necesita conexión. Los carnets sí se guardan sin conexión."}</p>
          </div>
          <form onSubmit={buscar} className="flex gap-2">
            <label htmlFor="busqueda" className="sr-only">Nombre, apellido o código</label>
            <Input
              id="busqueda"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              minLength={2}
              placeholder="Nombre, apellido o código"
              className="h-12 min-w-0 flex-1 text-cuerpo"
            />
            <Boton type="submit" variante="secundario" tamano="lg" className="h-12" disabled={pendiente || !enLinea}>
              {pendiente ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={2} aria-hidden /> : <Search className="size-4" strokeWidth={2} aria-hidden />} Buscar
            </Boton>
          </form>
          {encontrados.length === 0 ? (
            <p className="flex items-center gap-2 text-cuerpo-sm text-muted-foreground">
              <Search className="size-4 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden /> Los resultados de la búsqueda aparecerán aquí.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-borde-sutil border-y border-borde-sutil">
              {encontrados.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                  <span className="min-w-0">
                    <span className="block text-cuerpo font-semibold">{a.nombre}</span>
                    <span className="block text-cuerpo-sm text-muted-foreground">
                      {a.salon}
                      {a.codigo ? ` · ${a.codigo}` : ""}
                    </span>
                  </span>
                  <Boton type="button" tamano="lg" disabled={pendiente || !enLinea} onClick={() => iniciar(async () => mostrar(await registrarManualAction(slug, a.id, modo)))}>
                    {modo === "salida" ? "Registrar salida" : "Registrar llegada"}
                  </Boton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Resultado({ resultado, verbo }: { resultado: ResultadoLocal | null; verbo: string }) {
  const base = "flex min-h-52 flex-col justify-center gap-4 rounded-[14px] p-6 sm:p-8";
  if (!resultado) {
    return (
      <div role="status" aria-live="polite" className={`${base} items-start bg-sec-suave text-sec-tinta`}>
        <ScanLine className="size-14" strokeWidth={1.75} aria-hidden />
        <p className="font-heading text-[28px] leading-8 font-bold text-balance">Esperando carnet de {verbo}</p>
        <p className="text-cuerpo">Acerca el carnet a la cámara. Aquí verás el resultado.</p>
      </div>
    );
  }
  if (!resultado.ok) {
    return (
      <div role="alert" className={`${base} bg-falta-fondo text-falta`}>
        <CircleAlert className="size-14" strokeWidth={2} aria-hidden />
        <p className="font-heading text-[30px] leading-9 font-bold text-balance">{resultado.mensaje}</p>
      </div>
    );
  }
  if (resultado.tipo === "sin-conexion") {
    return (
      <div role="status" className={`${base} bg-tarde-fondo text-tarde`}>
        <CloudOff className="size-14" strokeWidth={2} aria-hidden />
        <p className="font-heading text-[30px] leading-9 font-bold">Guardado sin conexión</p>
        <p className="text-cuerpo text-foreground">Se registrará la {resultado.movimiento === "salida" ? "salida" : "llegada"} cuando vuelva la conexión.</p>
      </div>
    );
  }
  const { clase, Icono, palabra } = ESTADOS_ASISTENCIA[resultado.estado];
  const salida = resultado.movimiento === "salida";
  return (
    <div role="status" className={`${base} ${salida ? "bg-sec-suave text-sec-tinta" : clase}`}>
      <p className="inline-flex items-center gap-3 font-heading text-[40px] leading-[44px] font-bold">
        {salida ? <LogOut className="size-11" strokeWidth={2} aria-hidden /> : <Icono className="size-11" strokeWidth={2.25} aria-hidden />}
        {salida ? "Salida" : palabra}
      </p>
      <div className="flex items-center gap-4">
        {resultado.alumno.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resultado.alumno.fotoUrl} alt="" className="size-24 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-superficie text-muted-foreground">
            <UserRound className="size-12" strokeWidth={2} aria-hidden />
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-heading text-[28px] leading-8 font-bold text-balance text-foreground">{resultado.alumno.nombre}</p>
          <p className="text-cuerpo font-medium text-foreground">{resultado.alumno.salon}</p>
        </div>
      </div>
      <p className="text-[18px] leading-6 font-semibold text-foreground tabular-nums">{resultado.mensaje}</p>
    </div>
  );
}
