"use client";

import { Check, Loader2, Repeat, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import type { RespuestaReunion } from "@/generated/prisma/enums";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Textarea } from "@/components/ui/textarea";
import type { Resultado } from "@/lib/resultado";

type Props = {
  accion: (previo: Resultado | null, datos: FormData) => Promise<Resultado>;
  actual: RespuestaReunion;
  comentario: string | null;
  /** Identificador único para enlazar las etiquetas cuando hay varias reuniones en la página. */
  id: string;
};

/** Aceptar / Rechazar / Proponer otra hora, con nota opcional. Se puede cambiar hasta que empiece la reunión (specs/40). */
export function FormularioRespuesta({ accion, actual, comentario, id }: Props) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  const [proponer, setProponer] = useState(actual === "propone_otra");
  useEffect(() => {
    if (estado?.ok && estado.mensaje) toast.success(estado.mensaje);
  }, [estado]);
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <label htmlFor={`comentario-${id}`} className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Nota (opcional)</span>
        <Textarea id={`comentario-${id}`} name="comentario" rows={2} maxLength={300} defaultValue={comentario ?? ""} placeholder="Por ejemplo: llegaré 10 minutos tarde." />
      </label>
      {proponer && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Fecha que propones" name="fechaPropuesta" type="date" required />
          <Campo etiqueta="Hora que propones" name="horaPropuesta" type="time" required />
        </div>
      )}
      {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
      <div className="flex flex-wrap gap-2">
        {proponer ? (
          <>
            <button type="submit" name="respuesta" value="propone_otra" disabled={pendiente} className={buttonVariants({ variant: "default" })}>
              {pendiente ? <Loader2 className="animate-spin" strokeWidth={2} aria-hidden /> : <Repeat strokeWidth={2} aria-hidden />}Enviar propuesta
            </button>
            <button type="button" onClick={() => setProponer(false)} className={buttonVariants({ variant: "ghost" })}>Volver</button>
          </>
        ) : (
          <>
            <button type="submit" name="respuesta" value="asistire" disabled={pendiente} className={buttonVariants({ variant: actual === "asistire" ? "default" : "outline" })}>
              {pendiente ? <Loader2 className="animate-spin" strokeWidth={2} aria-hidden /> : <Check strokeWidth={2} aria-hidden />}Aceptar
            </button>
            <button type="submit" name="respuesta" value="no_asistire" disabled={pendiente} className={buttonVariants({ variant: actual === "no_asistire" ? "default" : "outline" })}>
              <X strokeWidth={2} aria-hidden />Rechazar
            </button>
            <button type="button" onClick={() => setProponer(true)} className={buttonVariants({ variant: actual === "propone_otra" ? "default" : "outline" })}>
              <Repeat strokeWidth={2} aria-hidden />Proponer otra hora
            </button>
          </>
        )}
      </div>
    </form>
  );
}
