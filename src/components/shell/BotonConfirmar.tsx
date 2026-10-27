"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import type { Resultado } from "@/lib/resultado";
import { cn } from "@/lib/utils";

type Props = {
  /** Texto del botón que abre la confirmación. */
  etiqueta: ReactNode;
  titulo: string;
  descripcion: ReactNode;
  /** Texto del botón de confirmar (verbo concreto: «Desactivar», no «Aceptar»). */
  confirmar: string;
  /** Server action sin estado previo; recibe los campos ocultos. */
  accion: (datos: FormData) => Promise<Resultado | void>;
  campos?: Record<string, string>;
  peligro?: boolean;
  variante?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
  tamano?: "sm" | "default" | "lg";
  className?: string;
};

/** Botón con modal de confirmación (AlertDialog) para acciones que no se deshacen o afectan a otras personas. */
export function BotonConfirmar({ etiqueta, titulo, descripcion, confirmar, accion, campos = {}, peligro = false, variante, tamano = "default", className }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const ejecutar = () =>
    iniciar(async () => {
      const datos = new FormData();
      for (const [k, v] of Object.entries(campos)) datos.set(k, v);
      const r = await accion(datos);
      if (r && !r.ok) toast.error(r.error);
      else if (r?.mensaje) toast.success(r.mensaje);
      setAbierto(false);
    });

  return (
    <AlertDialog open={abierto} onOpenChange={setAbierto}>
      <AlertDialogTrigger className={cn(buttonVariants({ variant: variante ?? (peligro ? "destructive" : "outline"), size: tamano }), className)}>
        {etiqueta}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
          <button
            type="button"
            onClick={ejecutar}
            disabled={pendiente}
            className={buttonVariants({ variant: peligro ? "destructive" : "default" })}
          >
            {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
            {confirmar}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
