"use client";

import { Check, Loader2, X } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Resultado } from "@/lib/resultado";

type Props = {
  accion: (previo: Resultado | null, datos: FormData) => Promise<Resultado>;
  actual: "pendiente" | "asistire" | "no_asistire";
  comentario: string | null;
  /** Identificador único para enlazar las etiquetas cuando hay varias reuniones en la página. */
  id: string;
};

/** Responder «Asistiré» / «No asistiré» con comentario opcional. Se puede cambiar hasta que empiece la reunión. */
export function FormularioRespuesta({ accion, actual, comentario, id }: Props) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  useEffect(() => {
    if (estado?.ok && estado.mensaje) toast.success(estado.mensaje);
  }, [estado]);
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <label htmlFor={`comentario-${id}`} className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Comentario (opcional)</span>
        <Textarea id={`comentario-${id}`} name="comentario" rows={2} maxLength={300} defaultValue={comentario ?? ""} placeholder="Por ejemplo: llegaré 10 minutos tarde." />
      </label>
      {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="respuesta" value="asistire" disabled={pendiente} className={buttonVariants({ variant: actual === "asistire" ? "default" : "outline" })}>
          {pendiente ? <Loader2 className="animate-spin" strokeWidth={2} aria-hidden /> : <Check strokeWidth={2} aria-hidden />}Asistiré
        </button>
        <button type="submit" name="respuesta" value="no_asistire" disabled={pendiente} className={buttonVariants({ variant: actual === "no_asistire" ? "default" : "outline" })}>
          <X strokeWidth={2} aria-hidden />No asistiré
        </button>
      </div>
    </form>
  );
}
