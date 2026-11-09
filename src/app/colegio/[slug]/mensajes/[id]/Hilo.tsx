"use client";

import { ArrowDown, ArrowLeft, CheckCheck, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MENSAJE } from "@/lib/mensajes";
import type { HiloVista, MensajeVista } from "@/lib/server/mensajes";
import { cn } from "@/lib/utils";
import { enviarMensajeAction, refrescarHiloAction } from "../actions";
import { iniciales } from "../ListaConversaciones";

const hora = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false });
const claveDia = (valor: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(valor));
function etiquetaDia(valor: string) {
  const clave = claveDia(valor);
  if (clave === claveDia(new Date().toISOString())) return "Hoy";
  if (clave === claveDia(new Date(Date.now() - 86_400_000).toISOString())) return "Ayer";
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" }).format(new Date(valor));
}

export function Hilo({ inicial, soloDireccion = false }: { inicial: HiloVista; soloDireccion?: boolean }) {
  const [mensajes, setMensajes] = useState(inicial.mensajes);
  const [puedeEscribir, setPuedeEscribir] = useState(inicial.puedeEscribir);
  const [cuerpo, setCuerpo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const [nuevos, setNuevos] = useState(false);
  const lista = useRef<HTMLOListElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const alFinal = useRef(true);
  const primera = useRef(true);

  useEffect(() => {
    if (soloDireccion) return;
    const t = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      refrescarHiloAction(inicial.id).then((h) => {
        if (h.mensajes.length > mensajes.length && !alFinal.current) setNuevos(true);
        setMensajes(h.mensajes);
        setPuedeEscribir(h.puedeEscribir);
      }).catch(() => {});
    }, 10_000);
    return () => clearInterval(t);
  }, [inicial.id, soloDireccion, mensajes.length]);

  useEffect(() => {
    const el = lista.current;
    if (!el) return;
    if (primera.current || alFinal.current) { el.scrollTop = el.scrollHeight; setNuevos(false); primera.current = false; }
  }, [mensajes.length]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const texto = cuerpo.trim();
    if (!texto || enviando || !puedeEscribir) return;
    setError(null);
    setCuerpo("");
    alFinal.current = true;
    const temporal: MensajeVista = { id: "temporal-" + Date.now(), cuerpo: texto, createdAt: new Date().toISOString(), propio: true, autor: "Tú", leido: false };
    setMensajes((actual) => [...actual, temporal]);
    iniciar(async () => {
      try {
        const r = await enviarMensajeAction(inicial.id, texto);
        if (r.error) { setError(r.error); setCuerpo(texto); setMensajes((actual) => actual.filter((m) => m.id !== temporal.id)); return; }
        setMensajes((await refrescarHiloAction(inicial.id)).mensajes);
      } catch { setError("No se pudo enviar el mensaje. Inténtalo otra vez."); setCuerpo(texto); setMensajes((actual) => actual.filter((m) => m.id !== temporal.id)); }
    });
  }

  const [nombre, detalle] = inicial.etiqueta.split(" · ");
  return <section className="flex min-w-0 flex-1 flex-col bg-muted/40" aria-label="Conversación">
    <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">
      <Link href="/mensajes" aria-label="Volver a chats" className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-accent md:hidden"><ArrowLeft aria-hidden /></Link>
      <Avatar size="lg"><AvatarFallback className="bg-sec-suave font-semibold text-sec-tinta">{iniciales(nombre)}</AvatarFallback></Avatar>
      <span className="min-w-0"><h1 className="truncate text-base font-semibold">{nombre}</h1><span className="block truncate text-sm text-muted-foreground">{detalle?.replace(" — ", " · ")}</span></span>
    </header>
    <div className="relative min-h-0 flex-1">
      <ol ref={lista} onScroll={(e) => { const el = e.currentTarget; alFinal.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; if (alFinal.current) setNuevos(false); }} className="absolute inset-0 flex flex-col overflow-y-auto p-4" aria-live="polite" aria-label="Mensajes">
        {mensajes.length === 0 && <li className="my-auto text-center text-sm text-muted-foreground">Escribe el primer mensaje.</li>}
        {mensajes.map((m, i) => {
          const anterior = mensajes[i - 1];
          const diaNuevo = !anterior || claveDia(anterior.createdAt) !== claveDia(m.createdAt);
          const primero = diaNuevo || anterior.propio !== m.propio || anterior.autor !== m.autor;
          return <Fragment key={m.id}>{diaNuevo && <li className="sticky top-2 z-10 my-4 self-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">{etiquetaDia(m.createdAt)}</li>}<li className={cn("flex max-w-[85%] flex-col sm:max-w-[72%]", m.propio ? "self-end" : "self-start", primero ? "mt-3" : "mt-1")}>
            <div className={cn("min-w-0 px-3.5 py-2 text-sm", m.propio ? "rounded-2xl bg-primary text-primary-foreground" : "rounded-2xl border border-border bg-card text-foreground", primero && (m.propio ? "rounded-tr-sm" : "rounded-tl-sm"))}>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.cuerpo}</p>
              <span className={cn("mt-1 flex items-center justify-end gap-1 text-xs", m.propio ? "text-primary-foreground/85" : "text-muted-foreground")}><time dateTime={m.createdAt}>{hora.format(new Date(m.createdAt))}</time>{m.propio && <CheckCheck className={cn("size-4", m.leido && "text-sky-200")} aria-label={m.leido ? "Leído" : "Enviado"} strokeWidth={2} />}</span>
            </div>
          </li></Fragment>;
        })}
      </ol>
      {nuevos && <button type="button" onClick={() => { const el = lista.current; if (el) el.scrollTop = el.scrollHeight; alFinal.current = true; setNuevos(false); }} className="absolute right-4 bottom-4 flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold shadow-sm"><ArrowDown className="size-4" aria-hidden /> Nuevos mensajes</button>}
    </div>
    {puedeEscribir ? <form onSubmit={enviar} className="shrink-0 border-t border-border bg-card p-3">
      {error && <Alerta tipo="error">{error}</Alerta>}
      <div className="flex items-end gap-2"><label htmlFor="cuerpo" className="sr-only">Tu mensaje</label><Textarea ref={textarea} id="cuerpo" value={cuerpo} onChange={(e) => { setCuerpo(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px"; }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} maxLength={MAX_MENSAJE} rows={1} placeholder="Escribe tu mensaje" className="max-h-32 min-h-11 resize-none rounded-2xl" /><Button type="submit" size="icon" aria-label="Enviar" disabled={enviando || !cuerpo.trim()} className="size-11 shrink-0 rounded-full">{enviando ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}</Button></div>
      {cuerpo.length >= 1800 && <p className="mt-1 text-right text-xs text-muted-foreground">{cuerpo.length}/2000</p>}
    </form> : <div className="shrink-0 border-t border-border bg-card p-3"><Alerta tipo="info">{soloDireccion ? "Estás leyendo como Dirección. No puedes escribir en esta conversación y tu lectura queda registrada." : "Esta conversación está cerrada: ahora solo puedes escribir al tutor/a del salón"}</Alerta></div>}
  </section>;
}
