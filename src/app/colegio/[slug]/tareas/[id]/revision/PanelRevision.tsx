"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ETIQUETA_LITERAL, LITERALES, type Escala } from "@/lib/calificaciones";
import type { Resultado } from "@/lib/resultado";
import { MAX_COMENTARIO_TAREA } from "@/lib/tareas";
import { cn } from "@/lib/utils";

type Accion = (previo: Resultado | null, datos: FormData) => Promise<Resultado>;

/** Nota según la escala del colegio: AD/A/B/C como opciones con su significado, o 0–20. */
function CampoNota({ escala, inicial }: { escala: Escala; inicial: string }) {
  if (escala === "vigesimal") {
    return (
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Nota (0 a 20)</span>
        <input name="valor" required inputMode="decimal" defaultValue={inicial} maxLength={5} className="h-11 w-28 rounded-md border border-input bg-background px-3 text-base tabular-nums" />
      </label>
    );
  }
  return (
    <fieldset className="flex flex-col gap-1.5 text-sm">
      <legend className="mb-1.5 font-medium">Nota</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LITERALES.map((l) => (
          <label key={l} className="flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-input bg-background px-2 py-1.5 text-center transition-colors duration-150 hover:bg-muted has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50 motion-reduce:transition-none">
            <input type="radio" name="valor" value={l} required defaultChecked={inicial === l} className="sr-only" />
            <span className="font-heading text-base font-semibold">{l}</span>
            <span className="text-etiqueta opacity-80">{ETIQUETA_LITERAL[l]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Panel «Revisar» / «Ver» de un estudiante (specs/39): muestra su entrega (children) y, si aún se puede, el formulario
 * de nota. Éxito: toast y cierre; error: alerta dentro del panel.
 */
export function PanelRevision({
  disparador, destacado, titulo, descripcion, children, accion, escala, notaInicial = "", sinEntrega = false,
}: {
  disparador: ReactNode;
  destacado: boolean;
  titulo: string;
  descripcion?: ReactNode;
  children: ReactNode;
  /** Sin acción: solo lectura. */
  accion?: Accion;
  escala: Escala;
  notaInicial?: string;
  sinEntrega?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger className={cn(buttonVariants({ variant: destacado ? "default" : "outline", size: "sm" }), "px-2.5 sm:w-28")}>{disparador}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-4">{children}</div>
        {accion ? (
          <FormularioNota accion={accion} escala={escala} notaInicial={notaInicial} sinEntrega={sinEntrega} alExito={() => setAbierto(false)} />
        ) : (
          <DialogFooter><DialogClose className={buttonVariants({ variant: "outline" })}>Cerrar</DialogClose></DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormularioNota({ accion, escala, notaInicial, sinEntrega, alExito }: { accion: Accion; escala: Escala; notaInicial: string; sinEntrega: boolean; alExito: () => void }) {
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
    <form action={enviar} className="flex flex-col gap-4 border-t border-borde-sutil pt-4">
      {sinEntrega && (
        <label className="flex min-h-11 items-start gap-3 rounded-lg border border-borde-sutil px-3 py-2.5 text-sm">
          <input type="checkbox" name="enFisico" className="mt-0.5 size-5 accent-primary" />
          <span><span className="font-medium">Lo entregó en físico</span><span className="block text-muted-foreground">Por ejemplo, en el cuaderno o en clase. Sin esto, al subir notas recibirá «NE».</span></span>
        </label>
      )}
      <CampoNota escala={escala} inicial={notaInicial} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Comentario para el estudiante (opcional)</span>
        <Textarea name="observacion" rows={2} maxLength={MAX_COMENTARIO_TAREA} />
      </label>
      {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
      <DialogFooter>
        <DialogClose className={buttonVariants({ variant: "outline" })} disabled={pendiente}>Cancelar</DialogClose>
        <button type="submit" disabled={pendiente} className={buttonVariants()}>
          {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
          Guardar nota
        </button>
      </DialogFooter>
    </form>
  );
}
