import type { ReactNode } from "react";

/** Título de un bloque del inicio: nudo del color de su sección (`data-seccion` del contenedor) y acción opcional. */
export function TituloBloque({ id, children, accion }: { id: string; children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h2 id={id} className="inline-flex items-center gap-2.5 font-heading text-[18px] leading-6 font-semibold">
        <span aria-hidden className="size-2.5 rounded-full bg-sec-nudo" />
        {children}
      </h2>
      {accion}
    </div>
  );
}
