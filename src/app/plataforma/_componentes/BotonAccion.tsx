"use client";

import { Loader2 } from "lucide-react";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import type { Resultado } from "@/lib/resultado";
import { cn } from "@/lib/utils";

/** Botón que ejecuta una server action sin confirmación (cambios que no quitan nada); resultado en toast. */
export function BotonAccion({
  children, accion, campos, etiquetaAccesible, variante = "outline", tamano = "sm", className,
}: {
  children: ReactNode;
  accion: (datos: FormData) => Promise<Resultado>;
  campos: Record<string, string>;
  etiquetaAccesible?: string;
  variante?: "default" | "outline" | "ghost" | "secondary";
  tamano?: "sm" | "default";
  className?: string;
}) {
  const [pendiente, iniciar] = useTransition();
  return (
    <button
      type="button"
      aria-label={etiquetaAccesible}
      disabled={pendiente}
      className={cn(buttonVariants({ variant: variante, size: tamano }), className)}
      onClick={() =>
        iniciar(async () => {
          const datos = new FormData();
          for (const [k, v] of Object.entries(campos)) datos.set(k, v);
          const r = await accion(datos);
          if (!r.ok) toast.error(r.error);
          else if (r.mensaje) toast.success(r.mensaje);
        })
      }
    >
      {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
      {children}
    </button>
  );
}
