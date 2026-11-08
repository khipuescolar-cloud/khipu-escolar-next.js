"use client";

import { MessageSquare, MessagesSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { Resultado } from "@/lib/resultado";
import { MAX_COMENTARIO_TAREA } from "@/lib/tareas";
import { cn } from "@/lib/utils";
import { FormularioEnLinea } from "../../FormularioEnLinea";

/** Alto del campo según su contenido: de 1 a 3 filas; con más texto, scroll interno. */
function ajustar(el: HTMLTextAreaElement) {
  const estilo = getComputedStyle(el);
  const linea = parseFloat(estilo.lineHeight) || 20;
  const bordes = parseFloat(estilo.borderTopWidth) + parseFloat(estilo.borderBottomWidth);
  const maximo = linea * 3 + parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom) + bordes;
  el.style.height = "auto";
  const alto = el.scrollHeight + bordes; // border-box: scrollHeight ya incluye el padding
  el.style.height = `${Math.min(alto, maximo)}px`;
  el.style.overflowY = alto > maximo + 1 ? "auto" : "hidden";
}

export type MensajeChat = { id: string; autor: string; texto: string; cuando: string; esDocente: boolean };

/**
 * Comentarios privados de un estudiante en una tarea (specs/39), como chat en un panel lateral: el botón con ícono de
 * chat lleva un punto si hay un comentario sin responder; el docente responde desde abajo.
 */
export function ChatComentarios({ alumno, subtitulo, mensajes, asignacionId, sinResponder, abiertoInicial = false, responder }: {
  alumno: string;
  subtitulo: string;
  mensajes: MensajeChat[];
  asignacionId: string;
  sinResponder: boolean;
  abiertoInicial?: boolean;
  /** Sin acción: solo lectura (dirección). */
  responder?: (previo: Resultado | null, datos: FormData) => Promise<Resultado>;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const fin = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  // Tras enviar, el formulario se limpia: el campo vuelve a una fila.
  useEffect(() => {
    if (campo.current) ajustar(campo.current);
  }, [mensajes.length]);
  // Al abrir y al llegar un mensaje nuevo, baja al último.
  useEffect(() => {
    if (abierto) fin.current?.scrollIntoView({ block: "end" });
  }, [abierto, mensajes.length]);
  const etiqueta = sinResponder ? `Comentarios de ${alumno}: hay uno sin responder` : mensajes.length ? `Comentarios de ${alumno} (${mensajes.length})` : `Escribir a ${alumno}`;

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger
        aria-label={etiqueta}
        title={etiqueta}
        className={cn(buttonVariants({ variant: sinResponder ? "default" : "outline", size: "sm" }), "relative w-10 px-0")}
      >
        <MessageSquare strokeWidth={2} aria-hidden />
        {sinResponder && <span aria-hidden className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-card bg-sec-nudo" />}
      </SheetTrigger>
      <SheetContent side="right" movil="lado" className="w-full gap-0 overflow-hidden data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><MessagesSquare className="size-5 text-sec-trazo" strokeWidth={2} aria-hidden />{alumno}</SheetTitle>
          <SheetDescription>{subtitulo} · Solo el estudiante, su familia y tú ven esta conversación.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-superficie-2/40 px-4 py-4" role="log" aria-label="Conversación">
          {mensajes.length === 0 ? (
            <p className="m-auto max-w-60 text-center text-cuerpo-sm text-muted-foreground">Aún no hay comentarios. Puedes escribirle al estudiante sobre esta tarea.</p>
          ) : (
            mensajes.map((m) => (
              <div key={m.id} className={cn("flex max-w-[85%] flex-col gap-1", m.esDocente ? "self-end items-end" : "self-start")}>
                <span className="text-etiqueta text-muted-foreground">{m.autor} · {m.cuando}</span>
                <p className={cn("rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line", m.esDocente ? "rounded-tr-md bg-primary text-primary-foreground" : "rounded-tl-md bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]")}>{m.texto}</p>
              </div>
            ))
          )}
          <div ref={fin} />
        </div>
        {responder && (
          <FormularioEnLinea accion={responder} etiqueta="Responder al estudiante" className="flex flex-col gap-2 border-t border-borde-sutil bg-popover px-4 py-3">
            <input type="hidden" name="asignacionId" value={asignacionId} />
            <div className="flex items-end gap-2">
              <label className="flex flex-1 flex-col text-sm">
                <span className="sr-only">Mensaje</span>
                <Textarea
                  ref={campo}
                  name="texto" rows={1} maxLength={MAX_COMENTARIO_TAREA} required
                  placeholder={sinResponder ? "Responde al estudiante…" : "Escribe un mensaje…"}
                  // Crece hacia abajo con el texto hasta 3 filas; desde ahí, scroll dentro del campo.
                  className="field-sizing-fixed min-h-11 resize-none overflow-y-hidden leading-5"
                  onInput={(e) => ajustar(e.currentTarget)}
                  onKeyDown={(e) => {
                    // Enter envía; Mayús + Enter hace un salto de línea.
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
              </label>
              <Button type="submit" size="sm" className="h-11 w-11 shrink-0 px-0" aria-label="Enviar"><Send strokeWidth={2} aria-hidden /></Button>
            </div>
          </FormularioEnLinea>
        )}
      </SheetContent>
    </Sheet>
  );
}
