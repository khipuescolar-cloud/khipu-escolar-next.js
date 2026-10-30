"use client";

import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { EstadoFormulario } from "../actions";

type Accion = (previo: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;

/** Diálogo con un formulario corto (motivo, meses…) que ejecuta una server action; resultado en toast. */
export function DialogoAccion({
  etiqueta, titulo, descripcion, confirmar, accion, campos, children, peligro = false, variante = "outline",
}: {
  etiqueta: ReactNode;
  titulo: string;
  descripcion?: ReactNode;
  confirmar: string;
  accion: Accion;
  campos: Record<string, string>;
  children: ReactNode;
  peligro?: boolean;
  variante?: "default" | "outline" | "ghost";
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, pendiente] = useActionState(async (previo: EstadoFormulario, datos: FormData) => {
    const r = await accion(previo, datos);
    if (r?.ok) {
      toast.success(r.ok);
      setAbierto(false);
    }
    return r;
  }, null);
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger className={cn(buttonVariants({ variant: variante, size: "sm" }))}>{etiqueta}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            for (const [k, v] of Object.entries(campos)) datos.set(k, v);
            startTransition(() => enviar(datos));
          }}
        >
          {children}
          {estado?.error && <Alerta tipo="error">{estado.error}</Alerta>}
          <DialogFooter>
            <Boton type="submit" variante={peligro ? "peligro" : "primario"} disabled={pendiente}>
              {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
              {confirmar}
            </Boton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
