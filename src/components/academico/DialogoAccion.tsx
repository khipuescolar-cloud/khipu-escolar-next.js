"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import type { Resultado } from "@/lib/resultado";
import { cn } from "@/lib/utils";

type Accion = (previo: Resultado | null, datos: FormData) => Promise<Resultado>;

type Props = {
  /** Contenido del botón que abre el diálogo (ícono + texto). */
  disparador: ReactNode;
  titulo: string;
  descripcion?: ReactNode;
  /** Texto del botón de enviar (verbo concreto: «Crear tarea»). */
  etiqueta: string;
  accion: Accion;
  /** Campos del formulario. */
  children: ReactNode;
  variante?: "default" | "outline" | "ghost" | "secondary";
  tamano?: "sm" | "default" | "lg";
  className?: string;
};

/** Botón que abre un `Dialog` con un formulario de server action (≤ 6 campos).
 *  Éxito: toast y cierre; error: `Alerta` dentro del diálogo. Ver specs/18 §8. */
export function DialogoAccion({ disparador, titulo, descripcion, etiqueta, accion, children, variante = "default", tamano = "default", className }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger className={cn(buttonVariants({ variant: variante, size: tamano }), className)}>{disparador}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        <Formulario accion={accion} etiqueta={etiqueta} alExito={() => setAbierto(false)}>{children}</Formulario>
      </DialogContent>
    </Dialog>
  );
}

function Formulario({ accion, etiqueta, alExito, children }: { accion: Accion; etiqueta: string; alExito: () => void; children: ReactNode }) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  const cerrar = useRef(alExito);
  useEffect(() => {
    cerrar.current = alExito;
  });
  useEffect(() => {
    if (estado?.ok) {
      if (estado.mensaje) toast.success(estado.mensaje);
      cerrar.current();
    }
  }, [estado]);
  return (
    <form action={enviar} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">{children}</div>
      {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
      <DialogFooter>
        <DialogClose className={buttonVariants({ variant: "outline" })} disabled={pendiente}>Cancelar</DialogClose>
        <button type="submit" disabled={pendiente} className={buttonVariants()}>
          {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
          {etiqueta}
        </button>
      </DialogFooter>
    </form>
  );
}
