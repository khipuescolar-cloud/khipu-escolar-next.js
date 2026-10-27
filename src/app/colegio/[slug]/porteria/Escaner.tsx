"use client";

import type { IScannerControls } from "@zxing/browser";
import { Camera, CameraOff, Loader2, Maximize, ScanLine, Search, UserRound, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { EstadoAsistencia, ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { Boton } from "@/components/ui/Boton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ResultadoPorteria } from "@/lib/server/porteria";
import { buscarAlumnosAction, registrarManualAction, registrarPorQrAction } from "./actions";

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
  const [resultado, setResultado] = useState<ResultadoPorteria | null>(null);
  const [sonido, setSonido] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [encontrados, setEncontrados] = useState<Encontrado[]>([]);
  const [pendiente, iniciar] = useTransition();

  const mostrar = useCallback(
    (r: ResultadoPorteria) => {
      setResultado(r);
      if (sonido) avisar(r.ok);
    },
    [sonido],
  );

  const alLeer = useCallback(
    (texto: string) => {
      const ahora = Date.now();
      const ultima = ultimaLectura.current;
      if (ultima && ultima.texto === texto && ahora - ultima.at < PAUSA_MS) return;
      ultimaLectura.current = { texto, at: ahora };
      iniciar(async () => mostrar(await registrarPorQrAction(slug, texto)));
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
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-sidebar">
          <video ref={video} className="h-full w-full object-cover" muted playsInline aria-label="Cámara para leer el carnet" />
          {camara === "encendida" ? (
            <span aria-hidden className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-maiz/90" />
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
        <Resultado resultado={resultado} />
      </div>

      <section aria-labelledby="titulo-manual">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h2 id="titulo-manual" className="text-xl font-semibold">¿No trae su carnet?</h2>
              <p className="text-sm text-muted-foreground">Busca al alumno y registra su llegada a mano.</p>
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
              <Boton type="submit" variante="secundario" tamano="lg" disabled={pendiente}>
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
                    <Boton type="button" disabled={pendiente} onClick={() => iniciar(async () => mostrar(await registrarManualAction(slug, a.id)))}>
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

function Resultado({ resultado }: { resultado: ResultadoPorteria | null }) {
  if (!resultado) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <ScanLine className="size-5 shrink-0" strokeWidth={2} aria-hidden /> Acerca el carnet a la cámara. Aquí verás el resultado.
      </p>
    );
  }
  if (!resultado.ok) {
    return (
      <div role="alert" className="flex items-center gap-4 rounded-xl border border-falta/30 bg-falta-fondo p-5 text-falta">
        <XCircle className="size-12 shrink-0" strokeWidth={2} aria-hidden />
        <p className="text-xl font-bold">{resultado.mensaje}</p>
      </div>
    );
  }
  const { clase } = ESTADOS_ASISTENCIA[resultado.estado];
  return (
    <div role="status" className={`flex items-center gap-4 rounded-xl border border-current/20 p-5 ${clase}`}>
      {resultado.alumno.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resultado.alumno.fotoUrl} alt="" className="size-20 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
          <UserRound className="size-10" strokeWidth={2} aria-hidden />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-2xl font-bold text-balance text-foreground">{resultado.alumno.nombre}</p>
        <p className="text-muted-foreground">{resultado.alumno.salon}</p>
        <div className="flex flex-wrap items-center gap-2">
          <EstadoAsistencia estado={resultado.estado} />
          <span className="text-lg font-semibold">{resultado.mensaje}</span>
        </div>
      </div>
    </div>
  );
}
