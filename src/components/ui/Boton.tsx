import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

type Variante = "primario" | "secundario" | "peligro" | "fantasma" | "enlace";

const VARIANTE_SHADCN = {
  primario: "default",
  secundario: "outline",
  peligro: "destructive",
  fantasma: "ghost",
  enlace: "link",
} as const satisfies Record<Variante, string>;

/** Botón nativo (sirve en formularios con server actions) con el estilo de shadcn `Button`.
 *  `cargando` deshabilita, muestra el indicador y marca `aria-busy`. */
export function Boton({
  variante = "primario",
  tamano = "default",
  cargando = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tamano?: "sm" | "default" | "lg"; cargando?: boolean }) {
  return (
    <button
      className={cn(buttonVariants({ variant: VARIANTE_SHADCN[variante], size: tamano }), className)}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...props}
    >
      {cargando && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
      {children}
    </button>
  );
}
