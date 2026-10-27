"use client";

import { Loader2 } from "lucide-react";
import { startTransition, useActionState, type ReactNode } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import type { EstadoFormulario } from "../actions";

type Accion = (previo: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;

/**
 * Formulario que llama a una server action sin vaciar los campos si hay error
 * (envía con onSubmit en vez de `action`, así React no resetea el formulario).
 */
export function FormularioPlataforma({
  accion, etiqueta, children, className = "flex flex-col gap-5",
}: {
  accion: Accion;
  etiqueta: string;
  children: ReactNode;
  className?: string;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  return (
    <form
      encType="multipart/form-data"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => enviar(datos));
      }}
    >
      {children}
      <div className="flex flex-col gap-2">
        {estado?.error && <Alerta tipo="error">{estado.error}</Alerta>}
        {estado?.ok && <Alerta tipo="exito">{estado.ok}</Alerta>}
        <Boton type="submit" disabled={pendiente} className="self-start">
          {pendiente && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />}
          {etiqueta}
        </Boton>
      </div>
    </form>
  );
}
