"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Boton } from "@/components/ui/Boton";

/** Botón de envío de un formulario con server action: se desactiva y muestra un giro mientras se envía. */
export function BotonEnvio({ children, disabled, ...props }: ComponentProps<typeof Boton>) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending || disabled} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
      {children}
    </Boton>
  );
}
