"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { X, Send } from "lucide-react";
import { enviarMensajeNuditoAction } from "@/app/colegio/[slug]/nudito/actions";
import type { AccionNudito } from "@/lib/server/nudito/tipos";
import { NuditoMascota } from "./NuditoMascota";

type Burbuja = { id: number; autor: "usuario" | "nudito"; texto: string; acciones?: AccionNudito[] };

const MAX = 500;

export function NuditoWidget({ slug }: { slug: string }) {
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

  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 font-nudito" data-testid="nudito-widget">
      {abierto && (
        <div
          id="nudito-panel"
          role="dialog"
          aria-label="Nudito, tu asistente"
          className="flex h-[min(32rem,calc(100dvh-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-arena bg-superficie shadow-lg"
        >
          <div className="flex items-center gap-2 bg-indigo px-3 py-2 text-white">
            <NuditoMascota tamano={32} animada={false} />
            <p className="flex-1 text-base font-bold">Nudito</p>
            <button type="button" onClick={cerrar} aria-label="Cerrar Nudito" className="rounded-md p-1.5 hover:bg-white/15">
              <X className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div role="log" aria-live="polite" aria-label="Conversación con Nudito" className="flex flex-1 flex-col gap-2 overflow-y-auto p-3 text-sm">
            <p className="max-w-[85%] self-start whitespace-pre-line rounded-lg bg-superficie-2 px-3 py-2">
              ¡Hola! Soy Nudito. Pregúntame por las tareas, las fechas o el horario del colegio.
            </p>
            {mensajes.map((m) => (
              <div key={m.id} className={`flex max-w-[85%] flex-col gap-2 ${m.autor === "usuario" ? "self-end" : "self-start"}`}>
                <p
                  className={`whitespace-pre-line rounded-lg px-3 py-2 ${m.autor === "usuario" ? "bg-acento text-sobre-acento" : "bg-superficie-2"}`}
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
                          className="rounded-pildora border border-acento px-3 py-1.5 text-sm font-semibold text-acento hover:bg-superficie-2 disabled:opacity-60"
                        >
                          {a.etiqueta}
                        </button>
                      ) : (
                        <Link
                          key={a.etiqueta}
                          href={a.valor}
                          onClick={cerrar}
                          className="rounded-pildora bg-acento px-3 py-1.5 text-sm font-semibold text-sobre-acento hover:opacity-90"
                        >
                          {a.etiqueta}
                        </Link>
                      ),
                    )}
                  </div>
                )}
              </div>
            ))}
            {pendiente && <p className="self-start text-pizarra">Nudito está escribiendo…</p>}
            {error && <p role="alert" className="self-start rounded-lg bg-falta-fondo px-3 py-2 text-falta">{error}</p>}
            <div ref={finRef} />
          </div>

          <form
            className="flex items-center gap-2 border-t border-arena p-2"
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
          >
            <label htmlFor="nudito-entrada" className="sr-only">Escribe tu pregunta</label>
            <input
              id="nudito-entrada"
              ref={inputRef}
              value={texto}
              maxLength={MAX}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe tu pregunta"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-md border border-arena bg-superficie px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={pendiente || !texto.trim()}
              aria-label="Enviar"
              className="rounded-md bg-acento p-2.5 text-sobre-acento hover:opacity-90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </form>
        </div>
      )}

      <button
        ref={botonRef}
        type="button"
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        aria-expanded={abierto}
        aria-controls="nudito-panel"
        aria-label={abierto ? "Cerrar Nudito" : "Abrir Nudito, tu asistente"}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-arena bg-superficie shadow-lg hover:shadow-xl"
      >
        <NuditoMascota tamano={40} />
      </button>
    </div>
  );
}
