"use client";

import { Check, Loader2, Paperclip, Send } from "lucide-react";
import { useActionState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { CLASE_CAMPO } from "@/components/ui/Selector";
import { cn } from "@/lib/utils";

export type EstadoJustificar = { ok?: boolean; error?: string };

/** Formulario corto para justificar una falta: motivo (obligatorio) y adjunto opcional (specs/07). */
export function FormJustificar({
  accion,
}: {
  accion: (prev: EstadoJustificar, formData: FormData) => Promise<EstadoJustificar>;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});

  if (estado.ok) {
    return (
      <div role="status" className="flex flex-col items-center gap-2 py-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-llego-fondo text-llego">
          <Check className="size-8" strokeWidth={2} aria-hidden />
        </span>
        <p className="text-titulo-2">Justificación enviada</p>
        <p className="text-cuerpo-sm text-muted-foreground">La tutora la revisará y te avisaremos.</p>
      </div>
    );
  }

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-cuerpo-sm">
        <span className="font-medium">Motivo de la falta</span>
        <textarea
          name="motivo"
          required
          maxLength={500}
          rows={4}
          className={cn(CLASE_CAMPO, "min-h-28 resize-y")}
          placeholder="Por ejemplo: tuvo fiebre y lo llevamos al médico."
        />
        <span className="text-muted-foreground">Hasta 500 caracteres.</span>
      </label>
      <label className="flex flex-col gap-1.5 text-cuerpo-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Paperclip className="size-4" strokeWidth={2} aria-hidden /> Adjunto (opcional)
        </span>
        <input
          name="adjunto"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className={cn(CLASE_CAMPO, "cursor-pointer py-1.5 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium file:text-secondary-foreground")}
        />
        <span className="text-muted-foreground">Foto o PDF de hasta 5 MB.</span>
      </label>
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <Boton type="submit" disabled={enviando} tamano="lg">
        {enviando ? <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden /> : <Send className="size-4" strokeWidth={2} aria-hidden />}
        {enviando ? "Enviando…" : "Enviar justificación"}
      </Boton>
    </form>
  );
}
