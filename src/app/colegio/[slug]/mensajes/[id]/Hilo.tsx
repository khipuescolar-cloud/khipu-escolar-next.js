"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { MAX_MENSAJE } from "@/lib/mensajes";
import type { HiloVista } from "@/lib/server/mensajes";
import { enviarMensajeAction, refrescarHiloAction } from "../actions";

const INTERVALO_MS = 10_000;

const formatoHora = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });

/** Hilo con actualización por polling cada 10 s (sin Realtime en el MVP). */
export function Hilo({ inicial }: { inicial: HiloVista }) {
  const [mensajes, setMensajes] = useState(inicial.mensajes);
  const [cuerpo, setCuerpo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inicial.puedeEscribir) return; // Dirección solo lee: no se audita en cada refresco.
    const t = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      refrescarHiloAction(inicial.id).then((h) => setMensajes(h.mensajes)).catch(() => {});
    }, INTERVALO_MS);
    return () => clearInterval(t);
  }, [inicial.id, inicial.puedeEscribir]);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
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
    <div className="flex flex-col gap-4">
      <ol className="flex max-h-[60vh] min-h-48 flex-col gap-3 overflow-y-auto rounded-lg border border-arena bg-superficie p-4" aria-live="polite" aria-label="Mensajes">
        {mensajes.length === 0 && <li className="text-center text-sm text-pizarra">Escribe el primer mensaje.</li>}
        {mensajes.map((m) => (
          <li key={m.id} className={`flex max-w-[85%] flex-col gap-0.5 rounded-lg px-3 py-2 ${m.propio ? "self-end bg-acento text-sobre-acento" : "self-start bg-superficie-2 text-tinta"}`}>
            {!m.propio && <span className="text-xs font-semibold">{m.autor}</span>}
            <span className="whitespace-pre-wrap break-words text-sm">{m.cuerpo}</span>
            <time className="self-end text-[11px] opacity-80" dateTime={m.createdAt}>{formatoHora.format(new Date(m.createdAt))}</time>
          </li>
        ))}
        <div ref={fin} />
      </ol>

      {inicial.puedeEscribir && (
        <form onSubmit={enviar} className="flex flex-col gap-2">
          <label htmlFor="cuerpo" className="sr-only">Tu mensaje</label>
          <textarea
            id="cuerpo"
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            maxLength={MAX_MENSAJE}
            rows={3}
            placeholder="Escribe tu mensaje"
            className="rounded-md border border-arena bg-superficie px-3 py-2.5 text-base text-tinta placeholder:text-pizarra"
          />
          {error && <Alerta tipo="error">{error}</Alerta>}
          <Boton type="submit" disabled={enviando || cuerpo.trim() === ""} className="self-end">
            <Send className="h-4 w-4" strokeWidth={2} aria-hidden /> {enviando ? "Enviando…" : "Enviar"}
          </Boton>
        </form>
      )}
    </div>
  );
}
