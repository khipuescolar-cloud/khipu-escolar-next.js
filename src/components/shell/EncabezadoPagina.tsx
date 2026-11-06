import type { ReactNode } from "react";

/** Encabezado estándar de página: título (h1), descripción opcional y acciones a la derecha
 *  (en móvil las acciones bajan debajo del título). Ver specs/18-sistema-de-diseno.md. */
export function EncabezadoPagina({ titulo, descripcion, acciones, migas, resumen }: { titulo: string; descripcion?: ReactNode; acciones?: ReactNode; migas?: ReactNode; resumen?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-3 border-b border-borde-sutil pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {migas && <nav aria-label="Ruta de navegación" className="mb-2 text-cuerpo-sm text-muted-foreground">{migas}</nav>}
        <h1 className="text-titulo-2 font-semibold sm:text-titulo-1">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-prose text-cuerpo-sm text-muted-foreground sm:text-cuerpo">{descripcion}</p>}
        {resumen && <div className="mt-3 text-cuerpo-sm text-muted-foreground">{resumen}</div>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}
