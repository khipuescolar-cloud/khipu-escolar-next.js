"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import type { Resultado } from "@/lib/resultado";

/** Crea la plantilla sugerida del nivel y se la asigna a sus salones sin plantilla (estado vacío). */
export function BotonSugeridas({ accion, texto }: { accion: (previo: Resultado | null) => Promise<Resultado>; texto: string }) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  useEffect(() => {
    if (estado?.ok && estado.mensaje) toast.success(estado.mensaje);
  }, [estado]);
  return (
    <form action={enviar} className="flex flex-col items-center gap-3">
      <button type="submit" disabled={pendiente} className={buttonVariants()}>
        {pendiente ? <Loader2 className="animate-spin motion-reduce:animate-none" strokeWidth={2} aria-hidden /> : <Sparkles strokeWidth={2} aria-hidden />}{texto}
      </button>
      {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
    </form>
  );
}
