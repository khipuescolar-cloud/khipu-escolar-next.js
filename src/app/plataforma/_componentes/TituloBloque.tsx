import type { ReactNode } from "react";

/** Encabezado sobrio de una sección del panel interno. */
export function TituloBloque({ id, children, accion }: { id: string; children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="inline-flex items-center gap-2.5 font-heading text-lg font-semibold leading-6">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-sec-nudo" />
        {children}
      </h2>
      {accion}
    </div>
  );
}
