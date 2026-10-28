"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Send, X, XCircle } from "lucide-react";
import { cargarConversacionNuditoAction, enviarMensajeNuditoAction } from "@/app/colegio/[slug]/nudito/actions";
import type { AccionNudito } from "@/lib/server/nudito/tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { elegirEstadoNudito } from "@/lib/nudito/estado";
import { NuditoMascota } from "./NuditoMascota";

type Burbuja = { id: number; autor: "usuario" | "nudito"; texto: string; acciones?: AccionNudito[] };

const MAX = 500;
export const AVISO_IA = "Soy un asistente con IA. Si no sé algo, te paso con una persona del colegio.";
const SUGERENCIAS = ["¿Qué tareas hay esta semana?", "¿Qué fechas importantes vienen?", "¿Cuál es el horario?"];

/** `horario`: horas de Lima en que Nudito está despierto (editable en Configuración de la plataforma; por defecto 7–17). */
export function NuditoWidget({ slug, horario }: { slug: string; horario?: { inicio: number; fin: number } }) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Burbuja[]>([]);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const botonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const contador = useRef(0);

  const historialCargado = useRef(false);
  // Hora de Lima: se calcula al montar para no desfasar la hidratación; fuera de 7:00–17:00 Nudito duerme.
  const [ahora, setAhora] = useState<Date | null>(null);
  const [saludando, setSaludando] = useState(false);
  useEffect(() => {
    const t0 = setTimeout(() => setAhora(new Date()), 0);
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, []);
  function abrir() {
    setAbierto(true);
    setSaludando(true);
    setTimeout(() => setSaludando(false), 1200);
  }
  const estado = elegirEstadoNudito({ ahora: ahora ?? new Date(2026, 0, 5, 12), pensando: pendiente, saludando, horario });

  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  // Al abrir por primera vez, retoma la conversación reciente con sus botones.
  useEffect(() => {
    if (!abierto || historialCargado.current) return;
    historialCargado.current = true;
    cargarConversacionNuditoAction(slug)
      .then((previa) => {
        if (!previa) return;
        setConversacionId((actual) => actual ?? previa.conversacionId);
        setMensajes((actuales) =>
          actuales.length > 0 ? actuales : previa.mensajes.map((m) => ({ id: ++contador.current, autor: m.autor, texto: m.texto, acciones: m.acciones })),
        );
      })
      .catch(() => undefined);
  }, [abierto, slug]);

  useEffect(() => {
    finRef.current?.scrollIntoView?.({ block: "end" });
  }, [mensajes, pendiente]);

  function cerrar() {
    setAbierto(false);
    botonRef.current?.focus();
  }

  // Esc cierra el panel aunque el foco haya quedado fuera (p. ej. tras enviar).
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  function enviar(contenido: string) {
    const limpio = contenido.trim();
    if (!limpio || pendiente) return;
    setError(null);
    setMensajes((m) => [...m, { id: ++contador.current, autor: "usuario", texto: limpio }]);
    setTexto("");
    iniciar(async () => {
      try {
        const r = await enviarMensajeNuditoAction({ slug, conversacionId, texto: limpio });
        if (r.ok) {
          setConversacionId(r.conversacionId);
          setMensajes((m) => [...m, { id: ++contador.current, autor: "nudito", texto: r.texto, acciones: r.acciones }]);
        } else {
          setError(r.error);
        }
      } catch {
        setError("No pude responder ahora. Inténtalo de nuevo en un momento.");
      }
    });
  }

  return (
    <div className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex flex-col items-end gap-3 font-nudito" data-testid="nudito-widget">
      {abierto && (
        <div
          id="nudito-panel"
          role="dialog"
          aria-label="Nudito, tu asistente"
          className="flex h-[min(34rem,calc(100dvh-7rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-sombra-1"
        >
          <div className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FAF7F2]">
              <NuditoMascota tamano={32} variante="avatar" estado={estado} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold leading-tight">Nudito</p>
              <p className="text-etiqueta opacity-90">Tu asistente del colegio</p>
            </div>
            <button type="button" onClick={cerrar} aria-label="Cerrar Nudito" className="flex size-10 items-center justify-center rounded-md outline-none transition-colors hover:bg-primary-foreground/15 focus-visible:ring-2 focus-visible:ring-primary-foreground">
              <X className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div role="log" aria-live="polite" aria-label="Conversación con Nudito" className="flex flex-1 flex-col gap-3 overflow-y-auto bg-background p-4 font-nudito text-voz-nudito text-foreground">
            <p className="max-w-[85%] self-start whitespace-pre-line rounded-lg rounded-bl-sm bg-muted px-3.5 py-2.5">
              ¡Hola! Soy Nudito. Pregúntame por las tareas, las fechas o el horario del colegio.
            </p>
            {mensajes.length === 0 && !pendiente && (
              <div className="flex flex-wrap gap-2" aria-label="Preguntas sugeridas">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => enviar(s)}
                    className="min-h-10 rounded-pildora border border-primary/40 bg-card px-3.5 py-1.5 text-sm font-semibold text-primary outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {mensajes.map((m) => (
              <div key={m.id} className={`flex max-w-[85%] flex-col gap-2 ${m.autor === "usuario" ? "self-end" : "self-start"}`}>
                <p
                  className={`whitespace-pre-line px-3.5 py-2.5 ${m.autor === "usuario" ? "rounded-lg rounded-br-sm bg-primary text-primary-foreground" : "rounded-lg rounded-bl-sm bg-muted text-foreground"}`}
                >
                  {m.texto}
                </p>
                {m.acciones && m.acciones.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {m.acciones.map((a) =>
                      a.tipo === "elegir_hijo" ? (
                        <button
                          key={a.etiqueta}
                          type="button"
                          onClick={() => enviar(a.valor)}
                          disabled={pendiente}
                          className="min-h-10 rounded-pildora border border-primary/40 bg-card px-3.5 py-1.5 text-sm font-semibold text-primary outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                        >
                          {a.etiqueta}
                        </button>
                      ) : (
                        <Link
                          key={a.etiqueta}
                          href={a.valor}
                          onClick={cerrar}
                          className="inline-flex min-h-10 items-center rounded-pildora bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {a.etiqueta}
                        </Link>
                      ),
                    )}
                  </div>
                )}
              </div>
            ))}
            {pendiente && (
              <p className="flex items-center gap-2 self-start text-muted-foreground">
                <NuditoMascota tamano={32} variante="avatar" estado="pensando" />
                Nudito está escribiendo…
              </p>
            )}
            {error && <p role="alert" className="flex items-start gap-2 self-start rounded-lg bg-falta-fondo px-3 py-2 text-falta"><XCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />{error}</p>}
            <div ref={finRef} />
          </div>

          <p className="border-t bg-card px-4 pt-2 text-etiqueta font-normal text-muted-foreground">{AVISO_IA}</p>
          <form
            className="flex items-center gap-2 bg-card p-3"
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
          >
            <label htmlFor="nudito-entrada" className="sr-only">Escribe tu pregunta</label>
            <Input
              id="nudito-entrada"
              ref={inputRef}
              value={texto}
              maxLength={MAX}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe tu pregunta"
              autoComplete="off"
              className="min-w-0 flex-1"
            />
            <Button type="submit" size="icon" disabled={pendiente || !texto.trim()} aria-label="Enviar">
              <Send strokeWidth={2} aria-hidden />
            </Button>
          </form>
        </div>
      )}

      <button
        ref={botonRef}
        type="button"
        onClick={() => (abierto ? cerrar() : abrir())}
        aria-expanded={abierto}
        aria-controls="nudito-panel"
        aria-label={abierto ? "Cerrar a Nudito" : "Abrir a Nudito, asistente de Khipu"}
        className="flex size-16 items-center justify-center rounded-full border bg-card shadow-sombra-1 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
      >
        <NuditoMascota tamano={52} estado={estado} />
      </button>
    </div>
  );
}
