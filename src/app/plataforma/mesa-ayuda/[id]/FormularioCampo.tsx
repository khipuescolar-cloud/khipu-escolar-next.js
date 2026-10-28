"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import type { Resultado } from "@/lib/resultado";

/** Selector + «Guardar» para un campo de la conversación (estado, prioridad, asignación). Éxito → toast. */
export function FormularioCampo({ id, nombre, etiqueta, valor, accion, children, boton = "Guardar" }: {
  id: string;
  nombre: string;
  etiqueta: string;
  valor: string;
  accion: (previo: Resultado | null, datos: FormData) => Promise<Resultado>;
  children: ReactNode;
  boton?: string;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      if (estado.mensaje) toast.success(estado.mensaje);
    } else toast.error(estado.error);
  }, [estado]);
  return (
    <form action={enviar} className="flex items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="min-w-0 flex-1">
        <Selector etiqueta={etiqueta} name={nombre} defaultValue={valor} key={valor}>
          {children}
        </Selector>
      </div>
      <button type="submit" disabled={pendiente} className={buttonVariants({ variant: "outline" })}>
        {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
        {boton}
      </button>
    </form>
  );
}

/** Botón de una sola acción con campos ocultos (p. ej. «Asignarme»). */
export function BotonAccionCampo({ id, campos, accion, children }: {
  id: string;
  campos: Record<string, string>;
  accion: (previo: Resultado | null, datos: FormData) => Promise<Resultado>;
  children: ReactNode;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      if (estado.mensaje) toast.success(estado.mensaje);
    } else toast.error(estado.error);
  }, [estado]);
  return (
    <form action={enviar}>
      <input type="hidden" name="id" value={id} />
      {Object.entries(campos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" disabled={pendiente} className={buttonVariants({ variant: "secondary", size: "sm" })}>
        {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
        {children}
      </button>
    </form>
  );
}
