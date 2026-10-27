"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import type { Resultado } from "@/lib/resultado";

type Accion = (previo: Resultado | null, datos: FormData) => Promise<Resultado>;

/** Formulario que llama a una server action: el éxito sale como notificación emergente
 *  y el error queda junto al formulario (ícono + palabra). */
export function FormAccion({
  accion, children, etiqueta, variante = "primario", className = "flex flex-col gap-3",
}: {
  accion: Accion;
  children?: ReactNode;
  etiqueta: string;
  variante?: "primario" | "secundario" | "peligro" | "fantasma";
  className?: string;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  useEffect(() => {
    if (estado?.ok && estado.mensaje) toast.success(estado.mensaje);
  }, [estado]);
  return (
    <form action={enviar} className={className}>
      {children}
      <div className="flex flex-col gap-2">
        <Boton type="submit" variante={variante} disabled={pendiente} className="self-start">
          {pendiente && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />}
          {etiqueta}
        </Boton>
        {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
      </div>
    </form>
  );
}
