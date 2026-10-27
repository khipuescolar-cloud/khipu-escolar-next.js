"use client";

import type { IScannerControls } from "@zxing/browser";
import { Camera, CameraOff, Maximize, Search, UserRound, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { EstadoAsistencia } from "@/components/EstadoAsistencia";
import { Boton } from "@/components/ui/Boton";
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
      <div ref={contenedor} className="flex flex-col gap-3 bg-fondo">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-arena bg-black">
          <video ref={video} className="h-full w-full object-cover" muted playsInline aria-label="Cámara para leer el carnet" />
          {camara !== "encendida" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-white">
              <CameraOff className="h-10 w-10" strokeWidth={2} aria-hidden />
              <p>{camara === "error" ? "No se pudo abrir la cámara. Revisa los permisos o usa la búsqueda manual." : "La cámara está apagada."}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {camara === "encendida" ? (
            <Boton type="button" variante="secundario" onClick={apagar}>
              <CameraOff className="h-4 w-4" strokeWidth={2} aria-hidden /> Apagar cámara
            </Boton>
          ) : (
            <Boton type="button" onClick={encender}>
              <Camera className="h-4 w-4" strokeWidth={2} aria-hidden /> Encender cámara
            </Boton>
          )}
          <Boton type="button" variante="secundario" onClick={() => contenedor.current?.requestFullscreen?.()}>
            <Maximize className="h-4 w-4" strokeWidth={2} aria-hidden /> Pantalla completa
          </Boton>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sonido} onChange={(e) => setSonido(e.target.checked)} className="h-4 w-4" />
            Sonido y vibración
          </label>
        </div>
        <Resultado resultado={resultado} />
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="titulo-manual">
        <h2 id="titulo-manual" className="font-titulo text-lg font-semibold">¿No trae su carnet?</h2>
        <form onSubmit={buscar} className="flex gap-2">
          <label htmlFor="busqueda" className="sr-only">Nombre, apellido o código</label>
          <input
            id="busqueda"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            minLength={2}
            placeholder="Nombre, apellido o código"
            className="min-w-0 flex-1 rounded-md border border-arena bg-superficie px-3 py-2.5 text-base"
          />
          <Boton type="submit" variante="secundario" disabled={pendiente}>
            <Search className="h-4 w-4" strokeWidth={2} aria-hidden /> Buscar
          </Boton>
        </form>
        <ul className="flex flex-col gap-2">
          {encontrados.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-arena bg-superficie p-3">
              <span>
                <span className="font-semibold">{a.nombre}</span>
                <span className="block text-sm text-pizarra">
                  {a.salon}
                  {a.codigo ? ` · ${a.codigo}` : ""}
                </span>
              </span>
              <Boton
                type="button"
                disabled={pendiente}
                onClick={() => iniciar(async () => mostrar(await registrarManualAction(slug, a.id)))}
              >
                Registrar llegada
              </Boton>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Resultado({ resultado }: { resultado: ResultadoPorteria | null }) {
  if (!resultado) return null;
  if (!resultado.ok) {
    return (
      <div role="alert" className="flex items-center gap-3 rounded-lg bg-falta-fondo p-5 text-falta">
        <XCircle className="h-10 w-10 shrink-0" strokeWidth={2} aria-hidden />
        <p className="text-xl font-bold">{resultado.mensaje}</p>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center gap-4 rounded-lg border border-arena bg-superficie p-5">
      {resultado.alumno.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resultado.alumno.fotoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
      ) : (
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-superficie-2">
          <UserRound className="h-10 w-10 text-pizarra" strokeWidth={2} aria-hidden />
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-bold">{resultado.alumno.nombre}</p>
        <p className="text-pizarra">{resultado.alumno.salon}</p>
        <div className="flex flex-wrap items-center gap-2">
          <EstadoAsistencia estado={resultado.estado} />
          <span className="text-lg font-semibold">{resultado.mensaje}</span>
        </div>
      </div>
    </div>
  );
}
