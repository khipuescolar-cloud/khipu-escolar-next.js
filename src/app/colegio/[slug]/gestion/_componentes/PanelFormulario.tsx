"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Variante = "default" | "outline" | "ghost" | "secondary";

type Props = {
  /** `dialog` para formularios cortos (≤ 6 campos); `sheet` para formularios largos o detalle. */
  tipo?: "dialog" | "sheet";
  titulo: string;
  descripcion?: ReactNode;
  children: ReactNode;
  /** Botón que abre el panel (se omite si el panel es controlado desde otro componente). */
  boton?: ReactNode;
  variante?: Variante;
  className?: string;
  /** Modo controlado (lo usa `AccionesFila`). */
  abierto?: boolean;
  onCambio?: (abierto: boolean) => void;
};

/** Cierra el panel cuando la acción del servidor redirige (cambia la URL con `?ok=` o `?error=`). */
function useCerrarAlNavegar(cerrar: () => void) {
  const ruta = usePathname();
  const consulta = useSearchParams().toString();
  const actual = `${ruta}?${consulta}`;
  const previa = useRef(actual);
  const cerrarRef = useRef(cerrar);
  useEffect(() => {
    cerrarRef.current = cerrar;
  });
  useEffect(() => {
    if (actual !== previa.current) {
      previa.current = actual;
      cerrarRef.current();
    }
  }, [actual]);
}

/** Formulario dentro de un `Dialog` o un `Sheet` (specs/18 §8). Los campos son los mismos de siempre:
 *  el formulario sigue siendo un `<form action={serverAction}>` renderizado por el servidor. */
export function PanelFormulario({ tipo = "dialog", titulo, descripcion, children, boton, variante = "default", className, abierto, onCambio }: Props) {
  const [interno, setInterno] = useState(false);
  const controlado = abierto !== undefined;
  const open = controlado ? abierto : interno;
  const cambiar = (v: boolean) => (controlado ? onCambio?.(v) : setInterno(v));
  useCerrarAlNavegar(() => cambiar(false));
  const claseBoton = cn(buttonVariants({ variant: variante }), className);

  if (tipo === "sheet") {
    return (
      <Sheet open={open} onOpenChange={cambiar}>
        {boton && <SheetTrigger className={claseBoton}>{boton}</SheetTrigger>}
        <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
          <SheetHeader className="border-b pr-12">
            <SheetTitle className="text-lg">{titulo}</SheetTitle>
            {descripcion && <SheetDescription>{descripcion}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-6">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={cambiar}>
      {boton && <DialogTrigger className={claseBoton}>{boton}</DialogTrigger>}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
