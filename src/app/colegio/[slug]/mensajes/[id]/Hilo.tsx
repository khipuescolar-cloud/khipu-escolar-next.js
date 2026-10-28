"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MENSAJE } from "@/lib/mensajes";
import type { HiloVista } from "@/lib/server/mensajes";
import { cn } from "@/lib/utils";
import { enviarMensajeAction, refrescarHiloAction } from "../actions";
import { iniciales } from "../ListaConversaciones";

const INTERVALO_MS = 10_000;

const formatoHora = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });

/** Hilo con actualización por polling cada 10 s (sin Realtime en el MVP). */
export function Hilo({ inicial }: { inicial: HiloVista }) {
  const [mensajes, setMensajes] = useState(inicial.mensajes);
  const [cuerpo, setCuerpo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const lista = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!inicial.puedeEscribir) return; // Dirección solo lee: no se audita en cada refresco.
    const t = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      refrescarHiloAction(inicial.id).then((h) => setMensajes(h.mensajes)).catch(() => {});
    }, INTERVALO_MS);
    return () => clearInterval(t);
  }, [inicial.id, inicial.puedeEscribir]);

  // Desplaza solo la lista (no la página) al último mensaje.
  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes.length]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const texto = cuerpo.trim();
    if (!texto) return;
    setError(null);
    iniciar(async () => {
      const r = await enviarMensajeAction(inicial.id, texto);
      if (r.error) {
        setError(r.error);
        return;
      }
      setCuerpo("");
      setMensajes((await refrescarHiloAction(inicial.id)).mensajes);
    });
  }

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-96 flex-col overflow-hidden rounded-lg border bg-card">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Avatar size="lg">
          <AvatarFallback className="bg-maiz text-sm font-semibold text-sobre-maiz">{iniciales(inicial.etiqueta)}</AvatarFallback>
        </Avatar>
        <h1 className="min-w-0 text-cuerpo font-semibold leading-snug sm:text-titulo-2">{inicial.etiqueta}</h1>
      </header>

      <ol ref={lista} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-background p-4" aria-live="polite" aria-label="Mensajes">
        {mensajes.length === 0 && <li className="my-auto text-center text-sm text-muted-foreground">Escribe el primer mensaje.</li>}
        {mensajes.map((m) => (
          <li key={m.id} className={cn("flex max-w-[85%] items-end gap-2 sm:max-w-[75%]", m.propio ? "self-end" : "self-start")}>
            {!m.propio && (
              <Avatar size="sm" className="mb-0.5">
                <AvatarFallback className="bg-superficie-2 text-xs font-semibold">{iniciales(m.autor)}</AvatarFallback>
              </Avatar>
            )}
            <div className={cn("flex min-w-0 flex-col gap-0.5 px-3.5 py-2", m.propio ? "rounded-lg bg-primary text-primary-foreground" : "rounded-lg bg-superficie-2 text-foreground")}>
              {!m.propio && <span className="text-xs font-semibold">{m.autor}</span>}
              <span className="whitespace-pre-wrap break-words text-sm">{m.cuerpo}</span>
              <time className={cn("self-end text-xs", m.propio ? "text-primary-foreground/80" : "text-muted-foreground")} dateTime={m.createdAt}>
                {formatoHora.format(new Date(m.createdAt))}
              </time>
            </div>
          </li>
        ))}
      </ol>

      {inicial.puedeEscribir && (
        <form onSubmit={enviar} className="flex flex-col gap-2 border-t bg-card p-3">
          {error && <Alerta tipo="error">{error}</Alerta>}
          <div className="flex items-end gap-2">
            <label htmlFor="cuerpo" className="sr-only">Tu mensaje</label>
            <Textarea
              id="cuerpo"
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              maxLength={MAX_MENSAJE}
              rows={1}
              placeholder="Escribe tu mensaje"
              className="max-h-32 min-h-10 resize-none"
            />
            <Button type="submit" disabled={enviando || cuerpo.trim() === ""}>
              <Send strokeWidth={2} aria-hidden /> {enviando ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
