import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ItemPestana = { href: string; texto: string; activo: boolean; icono?: ReactNode; insignia?: ReactNode };

/**
 * Pestañas de página por enlaces, con la línea y el nudo del color de su sección (`data-seccion` del contenedor).
 * `desplazable`: una sola fila con scroll horizontal y fondo suave en la activa (muchas secciones, p. ej. gestión);
 * por defecto, las pestañas se reparten en líneas (periodos, hijos, vistas).
 */
export function PestanasLinea({ etiqueta, items, desplazable = false, className }: {
  etiqueta: string; items: ItemPestana[]; desplazable?: boolean; className?: string;
}) {
  return (
    <nav aria-label={etiqueta} className={cn(desplazable ? "-mb-2 overflow-x-auto border-b border-borde-sutil print:hidden" : "flex flex-wrap gap-x-4 gap-y-1 border-b border-borde-sutil", className)}>
      <ul className={cn(desplazable ? "flex min-w-max gap-1" : "contents")}>
        {items.map((i) => (
          <li key={i.href} className={desplazable ? undefined : "contents"}>
            <Link
              href={i.href}
              aria-current={i.activo ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center border-b-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                desplazable ? "-mb-px gap-2 px-3 hover:text-foreground" : "px-1",
                i.activo
                  ? cn("border-sec-trazo font-semibold text-sec-tinta", desplazable && "bg-sec-suave/60")
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {desplazable && i.activo && <span aria-hidden className="size-2 rounded-full bg-sec-nudo" />}
              {i.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Control segmentado por enlaces («Ver como», «Por revisar / Historial»): la opción activa toma el fondo suave de la sección. */
export function PestanasSegmento({ etiqueta, items, scroll, className }: {
  etiqueta: string; items: ItemPestana[]; scroll?: boolean; className?: string;
}) {
  return (
    <nav aria-label={etiqueta} className={cn("inline-flex w-fit rounded-[10px] bg-superficie-2 p-1", className)}>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          scroll={scroll}
          aria-current={i.activo ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-md px-4 text-cuerpo-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
            i.activo ? "bg-sec-suave text-sec-tinta" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {i.icono} {i.texto}
          {i.insignia}
        </Link>
      ))}
    </nav>
  );
}
