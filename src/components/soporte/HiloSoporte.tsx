"use client";

import { Lock, MessageSquareText, Paperclip, Send, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatoTamano } from "@/lib/adjuntos";
import type { Resultado } from "@/lib/resultado";
import type { TicketVista } from "@/lib/server/soporte";
import { ACCEPT_CAPTURA, INTERVALO_SONDEO_MS, MAX_CUERPO_SOPORTE, NOMBRE_CATEGORIA } from "@/lib/soporte";
import { cn } from "@/lib/utils";
import { InsigniaEstadoTicket, InsigniaPrioridad } from "./EstadoTicket";

const formatoHora = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });

function iniciales(nombre: string): string {
  const limpio = nombre.replace(/^Equipo Khipu · /, "");
  return limpio.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "K";
}

type Props = {
  lado: "colegio" | "khipu";
  inicial: TicketVista;
  refrescar: (id: string) => Promise<TicketVista>;
  /** Recibe `id`, `cuerpo` y, según el lado, `interno` o `adjunto`. */
  enviar: (datos: FormData) => Promise<Resultado>;
  puedeEscribir: boolean;
  /** Texto en lugar de la caja de envío cuando no se puede escribir. */
  motivoCerrado?: string;
  permiteNotas?: boolean;
  permiteAdjunto?: boolean;
  /** Prefijo de descarga de capturas: «/archivos/» (colegio) o «/mesa-ayuda/archivos/» (Khipu). */
  rutaAdjunto: string;
  /** Acciones a la derecha del encabezado (resolver, cerrar…). */
  acciones?: ReactNode;
};

/** Hilo de la mesa de ayuda con sondeo cada ~5 s mientras la pestaña está visible (sin websockets). */
export function HiloSoporte({ lado, inicial, refrescar, enviar, puedeEscribir, motivoCerrado, permiteNotas = false, permiteAdjunto = false, rutaAdjunto, acciones }: Props) {
  const router = useRouter();
  const [refrescada, setRefrescada] = useState<TicketVista | null>(null);
  // La vista más reciente entre la del servidor (tras una acción) y la del sondeo.
  const vista = refrescada && refrescada.generadoAt > inicial.generadoAt ? refrescada : inicial;
  const [cuerpo, setCuerpo] = useState("");
  const [interno, setInterno] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const lista = useRef<HTMLOListElement>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const estadoPrevio = useRef(vista.estado);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      refrescar(inicial.id)
        .then((v) => {
          setRefrescada(v);
          // Si el estado cambió desde el otro lado, se refrescan también las acciones del encabezado.
          if (v.estado !== estadoPrevio.current) {
            estadoPrevio.current = v.estado;
            router.refresh();
          }
        })
        .catch(() => {});
    }, INTERVALO_SONDEO_MS);
    return () => clearInterval(t);
  }, [inicial.id, refrescar, router]);

  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [vista.mensajes.length]);

  function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const texto = cuerpo.trim();
    if (!texto) return;
    setError(null);
    const datos = new FormData(e.currentTarget);
    datos.set("id", inicial.id);
    datos.set("cuerpo", texto);
    if (permiteNotas) datos.set("interno", interno ? "1" : "");
    iniciar(async () => {
      const r = await enviar(datos);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCuerpo("");
      if (archivo.current) archivo.current.value = "";
      setRefrescada(await refrescar(inicial.id));
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[28rem] flex-col overflow-hidden rounded-lg border bg-card">
      <header className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-cuerpo font-semibold leading-snug sm:text-titulo-2" data-testid="asunto-ticket">{vista.asunto}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-cuerpo-sm text-muted-foreground">
            <InsigniaEstadoTicket estado={vista.estado} lado={lado} />
            <InsigniaPrioridad prioridad={vista.prioridad} />
            <span>{NOMBRE_CATEGORIA[vista.categoria]}</span>
          </div>
        </div>
        {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
      </header>

      <ol ref={lista} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-background p-4" aria-live="polite" aria-label="Mensajes de la conversación">
        {vista.mensajes.map((m) => {
          const hora = (
            <time className="text-xs opacity-80" dateTime={m.createdAt}>
              {formatoHora.format(new Date(m.createdAt))}
            </time>
          );
          if (m.autor === "sistema") {
            return (
              <li key={m.id} className="self-center text-center text-xs text-muted-foreground" data-testid="mensaje-sistema">
                {m.cuerpo} · {hora}
              </li>
            );
          }
          const miLado = m.autor === lado;
          return (
            <li key={m.id} className={cn("flex max-w-[90%] items-end gap-2 sm:max-w-[75%]", miLado ? "self-end" : "self-start")} data-testid={m.interno ? "nota-interna" : "mensaje-soporte"}>
              {!miLado && (
                <Avatar size="sm" className="mb-0.5">
                  <AvatarFallback className="bg-maiz text-xs font-semibold text-sobre-maiz">{iniciales(m.nombre)}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "flex min-w-0 flex-col gap-1 rounded-lg px-3.5 py-2",
                  m.interno ? "border border-dashed border-tarde/50 bg-tarde-fondo text-foreground" : m.propio ? "bg-primary text-primary-foreground" : miLado ? "bg-primary/10 text-foreground" : "bg-superficie-2 text-foreground",
                )}
              >
                {m.interno && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-tarde">
                    <StickyNote className="size-3.5" strokeWidth={2} aria-hidden /> Nota interna · solo el equipo
                  </span>
                )}
                {!m.propio && <span className="text-xs font-semibold">{m.nombre}</span>}
                <span className="whitespace-pre-wrap break-words text-sm">{m.cuerpo}</span>
                {m.adjuntos.map((a) => (
                  <a key={a.id} href={`${rutaAdjunto}${a.id}`} className={cn("inline-flex items-center gap-1 text-sm underline underline-offset-4", m.propio ? "text-primary-foreground" : "enlace")}>
                    <Paperclip className="size-3.5 shrink-0" strokeWidth={2} aria-hidden /> {a.nombre} ({formatoTamano(a.bytes)})
                  </a>
                ))}
                <span className="self-end">{hora}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {puedeEscribir ? (
        <form onSubmit={alEnviar} className="flex flex-col gap-2 border-t bg-card p-3">
          {error && <Alerta tipo="error">{error}</Alerta>}
          {permiteNotas && (
            <div className="flex gap-1" role="group" aria-label="Tipo de mensaje">
              <Button type="button" size="sm" variant={interno ? "ghost" : "secondary"} aria-pressed={!interno} onClick={() => setInterno(false)}>
                <MessageSquareText strokeWidth={2} aria-hidden /> Responder al colegio
              </Button>
              <Button type="button" size="sm" variant={interno ? "secondary" : "ghost"} aria-pressed={interno} onClick={() => setInterno(true)}>
                <StickyNote strokeWidth={2} aria-hidden /> Nota interna
              </Button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <label htmlFor="cuerpo-soporte" className="sr-only">{interno ? "Nota interna" : "Tu mensaje"}</label>
            <Textarea
              id="cuerpo-soporte"
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              maxLength={MAX_CUERPO_SOPORTE}
              rows={2}
              placeholder={interno ? "Nota para el equipo (el colegio no la ve)" : "Escribe tu mensaje"}
              className={cn("max-h-40 min-h-12 resize-none", interno && "border-tarde/60")}
            />
            <Button type="submit" disabled={enviando || cuerpo.trim() === ""}>
              <Send strokeWidth={2} aria-hidden /> {enviando ? "Enviando…" : interno ? "Guardar nota" : "Enviar"}
            </Button>
          </div>
          {permiteAdjunto && (
            <label className="flex flex-wrap items-center gap-2 text-cuerpo-sm text-muted-foreground">
              <Paperclip className="size-4" strokeWidth={2} aria-hidden />
              <span>Captura (PNG, JPG o PDF, máx. 5 MB)</span>
              <input ref={archivo} type="file" name="adjunto" accept={ACCEPT_CAPTURA} className="max-w-full text-cuerpo-sm file:mr-2 file:rounded-md file:border file:bg-card file:px-2 file:py-1" />
            </label>
          )}
        </form>
      ) : (
        <p className="flex items-center gap-2 border-t bg-card p-4 text-cuerpo-sm text-muted-foreground">
          <Lock className="size-4" strokeWidth={2} aria-hidden /> {motivoCerrado ?? "Esta conversación está cerrada."}
        </p>
      )}
    </div>
  );
}
