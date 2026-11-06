import type { ComponentProps, ElementType } from "react";
import { cn } from "cn";

type PropsSuperficie<T extends ElementType> = { como?: T } & Omit<ComponentProps<T>, "as">;

/**
 * Lista en una sola superficie con divisores finos (DESIGN.md · «Menos cajas»): sustituye a una tarjeta por fila.
 * `como` cambia la etiqueta (por defecto `ul`); `className` añade o reemplaza utilidades.
 */
export function ListaDividida<T extends ElementType = "ul">({ como, className, ...resto }: PropsSuperficie<T>) {
  const Etiqueta: ElementType = como ?? "ul";
  return <Etiqueta className={cn("flex flex-col divide-y divide-borde-sutil overflow-hidden rounded-[14px] border border-borde-sutil bg-superficie", className)} {...resto} />;
}

/**
 * Cifras hermanas en una sola superficie dividida por líneas finas (`gap-px`). Cada hija pone su propio fondo
 * (`bg-superficie`). Las columnas se indican con `className` (por defecto 2 y 4 en pantallas anchas).
 */
export function CifrasJuntas<T extends ElementType = "div">({ como, className, ...resto }: PropsSuperficie<T>) {
  const Etiqueta: ElementType = como ?? "div";
  return <Etiqueta className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-borde-sutil bg-borde-sutil lg:grid-cols-4", className)} {...resto} />;
}
