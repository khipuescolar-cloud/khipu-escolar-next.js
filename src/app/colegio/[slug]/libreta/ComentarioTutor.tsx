"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Textarea } from "@/components/ui/textarea";
import { guardarComentarioTutorAction } from "./actions";

/** Comentario general del tutor en la libreta (opcional). Solo lo ve el tutor del salón con el periodo abierto. */
export function ComentarioTutor({ slug, alumnoId, periodoId, texto }: { slug: string; alumnoId: string; periodoId: string; texto: string }) {
  const [estado, enviar, pendiente] = useActionState(guardarComentarioTutorAction.bind(null, slug, alumnoId, periodoId), null);
  useEffect(() => {
    if (estado?.ok && estado.mensaje) toast.success(estado.mensaje);
  }, [estado]);
  return (
    <form action={enviar} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Tu comentario como tutor(a) <span className="font-normal text-muted-foreground">(opcional; sale en la libreta)</span></span>
        <Textarea name="texto" rows={3} maxLength={1000} defaultValue={texto} />
      </label>
      <Boton type="submit" disabled={pendiente} className="self-start">
        {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
        Guardar comentario
      </Boton>
      {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
    </form>
  );
}
