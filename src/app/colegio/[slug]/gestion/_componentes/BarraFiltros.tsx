import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Superficie de una tabla o lista (una sola, con divisores por dentro): radio 14, borde sutil, sin sombra. */
export const SUPERFICIE_LISTA = "overflow-hidden rounded-[14px] border border-borde-sutil bg-card";

/** Barra única de filtros y búsqueda (GET): una franja suave, sin tarjeta ni borde. */
export function BarraFiltros({ children, className, etiqueta = "Filtros" }: { children: ReactNode; className?: string; etiqueta?: string }) {
  return (
    <form method="get" role="search" aria-label={etiqueta} className={cn("flex flex-wrap items-end gap-3 rounded-[14px] bg-superficie-2/60 px-4 py-3", className)}>
      {children}
    </form>
  );
}
