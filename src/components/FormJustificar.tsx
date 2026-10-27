"use client";

import { CheckCircle2, Paperclip, Send } from "lucide-react";
import { useActionState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";

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
        <CheckCircle2 className="h-10 w-10 text-llego" strokeWidth={2} aria-hidden />
        <p className="font-titulo text-lg font-semibold">Justificación enviada</p>
        <p className="text-sm text-pizarra">La tutora la revisará y te avisaremos.</p>
      </div>
    );
  }

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Motivo de la falta</span>
        <textarea
          name="motivo"
          required
          maxLength={500}
          rows={4}
          className="rounded-md border border-arena bg-superficie px-3 py-2.5 text-base"
          placeholder="Por ejemplo: tuvo fiebre y lo llevamos al médico."
        />
        <span className="text-pizarra">Hasta 500 caracteres.</span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Paperclip className="h-4 w-4" strokeWidth={2} aria-hidden /> Adjunto (opcional)
        </span>
        <input name="adjunto" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="text-sm" />
        <span className="text-pizarra">Foto o PDF de hasta 5 MB.</span>
      </label>
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <Boton type="submit" disabled={enviando}>
        <Send className="h-4 w-4" strokeWidth={2} aria-hidden />
        {enviando ? "Enviando…" : "Enviar justificación"}
      </Boton>
    </form>
  );
}
