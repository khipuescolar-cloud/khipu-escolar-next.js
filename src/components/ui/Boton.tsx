import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

type Variante = "primario" | "secundario" | "peligro" | "fantasma";

const VARIANTE_SHADCN = {
  primario: "default",
  secundario: "outline",
  peligro: "destructive",
  fantasma: "ghost",
} as const satisfies Record<Variante, string>;

/** Botón nativo (sirve en formularios con server actions) con el estilo de shadcn `Button`. */
export function Boton({
  variante = "primario",
  tamano = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tamano?: "sm" | "default" | "lg" }) {
  return <button className={cn(buttonVariants({ variant: VARIANTE_SHADCN[variante], size: tamano }), className)} {...props} />;
}
