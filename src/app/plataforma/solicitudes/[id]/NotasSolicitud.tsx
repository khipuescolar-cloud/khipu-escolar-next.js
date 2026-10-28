"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Resultado } from "@/lib/resultado";

/** Notas internas del equipo sobre la solicitud. Éxito → toast. */
export function NotasSolicitud({ id, notas, accion }: { id: string; notas: string; accion: (previo: Resultado | null, datos: FormData) => Promise<Resultado> }) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      if (estado.mensaje) toast.success(estado.mensaje);
    } else toast.error(estado.error);
  }, [estado]);
  return (
    <form action={enviar} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Notas internas</span>
        <Textarea name="notas" defaultValue={notas} maxLength={4000} rows={5} placeholder="Qué se habló, cuándo volver a escribir…" />
      </label>
      <button type="submit" disabled={pendiente} className={buttonVariants({ variant: "outline", className: "self-start" })}>
        {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
        Guardar notas
      </button>
    </form>
  );
}
