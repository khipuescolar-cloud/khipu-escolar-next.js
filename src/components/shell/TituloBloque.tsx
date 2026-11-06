import type { ReactNode } from "react";

/**
 * Título de un bloque dentro de una pantalla (DESIGN.md · «Bloques secundarios»): nudo del color de su sección
 * (`data-seccion` del contenedor), título Sora y, a la derecha, una acción opcional. Reemplaza a la tarjeta con título.
 */
export function TituloBloque({
  children, descripcion, accion, id, nivel = 2,
}: {
  children: ReactNode;
  descripcion?: ReactNode;
  accion?: ReactNode;
  id?: string;
  nivel?: 2 | 3;
}) {
  const Titulo = nivel === 2 ? "h2" : "h3";
  return (
    <div className={`flex flex-wrap justify-between gap-x-4 gap-y-2 ${descripcion ? "items-start" : "items-center"}`}>
      <div className="min-w-0">
        <Titulo id={id} className="inline-flex items-center gap-2.5 font-heading text-[18px] leading-6 font-semibold">
          <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-sec-nudo" />
          {children}
        </Titulo>
        {descripcion && <p className="mt-1 max-w-prose text-cuerpo-sm text-pretty text-muted-foreground">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}
