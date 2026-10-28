import type { ReactNode } from "react";

/** Encabezado estándar de página: título (h1), descripción opcional y acciones a la derecha
 *  (en móvil las acciones bajan debajo del título). Ver specs/18-sistema-de-diseno.md. */
export function EncabezadoPagina({ titulo, descripcion, acciones }: { titulo: string; descripcion?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-titulo-2 sm:text-titulo-1">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-prose text-cuerpo-sm text-muted-foreground sm:text-cuerpo">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}
