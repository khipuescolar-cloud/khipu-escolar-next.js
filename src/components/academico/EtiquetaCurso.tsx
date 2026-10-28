import type { ReactNode } from "react";

/** Etiqueta de curso: turquesa de acento según el manual de marca (texto turquesa sobre fondo turquesa tenue). */
export function EtiquetaCurso({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-pildora bg-turquesa/10 px-2.5 py-1 text-etiqueta text-turquesa">
      {children}
    </span>
  );
}
