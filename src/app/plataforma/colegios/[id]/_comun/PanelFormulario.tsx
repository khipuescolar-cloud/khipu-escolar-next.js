"use client";

import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { EstadoFormulario } from "../../../actions";

type Accion = (previo: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;

type Props = {
  /** `dialog` para formularios cortos, `sheet` para los largos (specs/18 §8). */
  tipo: "dialog" | "sheet";
  boton: ReactNode;
  variante?: "default" | "outline" | "ghost" | "secondary";
  tamano?: "sm" | "default";
  titulo: string;
  descripcion?: ReactNode;
  accion: Accion;
  /** Texto del botón de guardar (verbo concreto). */
  guardar: string;
  children: ReactNode;
  className?: string;
};

/** Formulario de la ficha dentro de un Dialog/Sheet: al guardar muestra un toast y se cierra; el error queda en el panel. */
export function PanelFormulario({ tipo, boton, variante = "outline", tamano = "default", titulo, descripcion, accion, guardar, children, className }: Props) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);
  const claseBoton = cn(buttonVariants({ variant: variante, size: tamano }), className);
  const cuerpo = (
    <Contenido accion={accion} guardar={guardar} alGuardar={cerrar}>
      {children}
    </Contenido>
  );

  if (tipo === "sheet") {
    return (
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetTrigger className={claseBoton}>{boton}</SheetTrigger>
        <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
          <SheetHeader className="border-b pr-12">
            <SheetTitle className="text-lg">{titulo}</SheetTitle>
            {descripcion && <SheetDescription>{descripcion}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-6">{cuerpo}</div>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger className={claseBoton}>{boton}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        {cuerpo}
      </DialogContent>
    </Dialog>
  );
}

/** Vive solo mientras el panel está abierto: así el error anterior no reaparece al reabrirlo. */
function Contenido({ accion, guardar, alGuardar, children }: { accion: Accion; guardar: string; alGuardar: () => void; children: ReactNode }) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  useEffect(() => {
    if (estado?.ok) {
      toast.success(estado.ok);
      alGuardar();
    }
  }, [estado, alGuardar]);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => enviar(datos));
      }}
    >
      {children}
      {estado?.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <Boton type="submit" disabled={pendiente} className="self-start">
        {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
        {guardar}
      </Boton>
    </form>
  );
}
