"use client";

import { ExternalLink, Plus, Send, ShieldAlert, XCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";
import { Button } from "@/components/ui/button";
import { enviarMensajeNuditoPlusAction } from "../actions";

export const AVISO_IA_NUDITO_PLUS = "Soy Nudito, un asistente con IA. Te ayudo a aprender; no reemplazo a tu profesor.";
const MAX = 800;

type Burbuja = { id: string; autor: "usuario" | "nudito"; texto: string; bloqueado?: boolean };

type Props = {
  alumnoId: string;
  nombre: string;
  conversacionId: string | null;
  mensajesIniciales: Burbuja[];
  sugerencias: string[];
};

/** Texto con enlaces https clicables (la lista blanca ya se aplicó en el servidor). */
function TextoConEnlaces({ texto }: { texto: string }) {
  const partes = texto.split(/(https:\/\/[^\s]+)/g);
  return (
    <>
      {partes.map((p, i) =>
        /^https:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold break-all underline underline-offset-4">
            {p.replace(/^https:\/\//, "")}
            <ExternalLink className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function ChatNuditoPlus({ alumnoId, nombre, conversacionId: inicial, mensajesIniciales, sugerencias }: Props) {
  const [mensajes, setMensajes] = useState<Burbuja[]>(mensajesIniciales);
  const [conversacionId, setConversacionId] = useState<string | null>(inicial);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [saludando, setSaludando] = useState(true);
  const entradaRef = useRef<HTMLTextAreaElement>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const contador = useRef(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const t = setTimeout(() => setSaludando(false), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const reducir = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    finRef.current?.scrollIntoView?.({ block: "end", behavior: reducir ? "auto" : "smooth" });
  }, [mensajes, pendiente]);

  function enviar(contenido: string) {
    const limpio = contenido.trim();
    if (!limpio || pendiente) return;
    setError(null);
    const id = `local-${++contador.current}`;
    setMensajes((m) => [...m, { id, autor: "usuario", texto: limpio }]);
    setTexto("");
    iniciar(async () => {
      try {
        const r = await enviarMensajeNuditoPlusAction({ alumnoId, conversacionId, texto: limpio });
        if (r.ok) {
          const nueva = !conversacionId && r.conversacionId;
          if (r.conversacionId) setConversacionId(r.conversacionId);
          setMensajes((m) => [...m, { id: `${id}-r`, autor: "nudito", texto: r.texto, bloqueado: r.bloqueado }]);
          // Actualiza el historial de conversaciones del costado.
          if (nueva) router.refresh();
        } else {
          setError(r.error);
          setMensajes((m) => m.filter((x) => x.id !== id));
          setTexto(limpio);
        }
      } catch {
        setError("Nudito no pudo responder ahora. Inténtalo de nuevo en un momento.");
        setMensajes((m) => m.filter((x) => x.id !== id));
        setTexto(limpio);
      } finally {
        entradaRef.current?.focus();
      }
    });
  }

  function nuevaConversacion() {
    setMensajes([]);
    setConversacionId(null);
    setError(null);
    setTexto("");
    router.push(pathname);
    entradaRef.current?.focus();
  }

  const estado = pendiente ? "pensando" : saludando ? "saludo" : "reposo";

  return (
    <section aria-label={`Conversación de ${nombre} con Nudito`} className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border bg-card font-nudito lg:h-[calc(100dvh-14rem)]" data-testid="chat-nudito-plus">
      <header className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FAF7F2]">
          <NuditoMascota tamano={36} variante="avatar" estado={estado} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight">Nudito+</p>
          <p className="truncate text-etiqueta opacity-90">Tu tutor con IA</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={nuevaConversacion} disabled={pendiente}>
          <Plus strokeWidth={2} aria-hidden />
          Nueva
          <span className="sr-only">conversación</span>
        </Button>
      </header>

      <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Mensajes con Nudito" className="flex flex-1 flex-col gap-3 overflow-y-auto bg-background p-4 text-voz-nudito text-foreground">
        <p className="max-w-[90%] self-start rounded-lg rounded-bl-sm border border-primary/30 bg-muted px-3.5 py-2.5" data-testid="aviso-ia">
          {AVISO_IA_NUDITO_PLUS}
        </p>
        {mensajes.length === 0 && !pendiente && (
          <div className="flex flex-col gap-2">
            <p className="text-cuerpo-sm font-semibold text-muted-foreground">Prueba con:</p>
            <ul className="flex flex-wrap gap-2" aria-label="Sugerencias">
              {sugerencias.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => enviar(s)}
                    className="min-h-11 rounded-pildora border border-primary/40 bg-card px-4 py-2 text-sm font-bold text-primary outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {mensajes.map((m) => (
          <div key={m.id} className={`flex max-w-[90%] flex-col gap-1 ${m.autor === "usuario" ? "self-end items-end" : "self-start"}`}>
            <span className="sr-only">{m.autor === "usuario" ? "Tú:" : "Nudito:"}</span>
            <p
              className={`whitespace-pre-line break-words px-3.5 py-2.5 ${m.autor === "usuario" ? "rounded-lg rounded-br-sm bg-primary text-primary-foreground" : "rounded-lg rounded-bl-sm bg-muted text-foreground"}`}
              data-autor={m.autor}
            >
              {m.autor === "nudito" ? <TextoConEnlaces texto={m.texto} /> : m.texto}
            </p>
            {m.autor === "nudito" && m.bloqueado && (
              <span className="inline-flex items-center gap-1 text-etiqueta text-muted-foreground">
                <ShieldAlert className="size-3.5" strokeWidth={2} aria-hidden />
                Respuesta cuidada por seguridad
              </span>
            )}
          </div>
        ))}
        {pendiente && (
          <p className="flex items-center gap-2 self-start text-muted-foreground" role="status">
            <NuditoMascota tamano={28} variante="avatar" estado="pensando" />
            Nudito está pensando…
          </p>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 self-start rounded-lg bg-falta-fondo px-3 py-2 text-falta">
            <XCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
            {error}
          </p>
        )}
        <div ref={finRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <label htmlFor="nudito-plus-entrada" className="sr-only">Escribe tu mensaje a Nudito</label>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <textarea
            id="nudito-plus-entrada"
            ref={entradaRef}
            value={texto}
            maxLength={MAX}
            rows={2}
            autoFocus
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                enviar(texto);
              } else if (e.key === "Escape" && texto) {
                e.preventDefault();
                setTexto("");
              }
            }}
            placeholder="Escribe tu duda (Enter envía, Esc borra)"
            autoComplete="off"
            aria-describedby="nudito-plus-contador"
            className="min-h-11 w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-sans text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <span id="nudito-plus-contador" className="self-end text-etiqueta font-normal text-muted-foreground">
            {texto.length}/{MAX}
          </span>
        </div>
        <Button type="submit" size="icon-lg" disabled={pendiente || !texto.trim()} aria-label="Enviar">
          <Send strokeWidth={2} aria-hidden />
        </Button>
      </form>
    </section>
  );
}
