"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import type { Resultado } from "@/lib/resultado";

/**
 * Formulario en línea con server action (entrega, comentario, observación): éxito → toast y se limpia; error →
 * `Alerta` junto al formulario. Los botones de envío van en `children` (pueden llevar `name`/`value`).
 */
export function FormularioEnLinea({ accion, children, className, etiqueta }: {
  accion: (previo: Resultado | null, datos: FormData) => Promise<Resultado>; children: ReactNode; className?: string; etiqueta?: string;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) {
      if (estado.mensaje) toast.success(estado.mensaje);
      form.current?.reset();
    }
  }, [estado]);
  return (
    <form ref={form} action={enviar} className={className} aria-label={etiqueta} aria-busy={pendiente}>
      {children}
      {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
    </form>
  );
}
