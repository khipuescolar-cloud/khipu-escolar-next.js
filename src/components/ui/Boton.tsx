import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "peligro" | "fantasma";

const estilos: Record<Variante, string> = {
  primario: "bg-acento text-sobre-acento hover:opacity-90",
  secundario: "bg-superficie text-tinta border border-arena hover:bg-superficie-2",
  peligro: "bg-falta text-white hover:opacity-90",
  fantasma: "text-acento hover:bg-superficie-2",
};

export function Boton({
  variante = "primario",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${estilos[variante]} ${className}`}
      {...props}
    />
  );
}
