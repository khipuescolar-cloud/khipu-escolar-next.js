"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { rutaActiva, type GrupoNav } from "@/lib/navegacion";

/**
 * Pone `data-seccion` en el contenido según la ruta activa del menú: así la cuerda del encabezado, las pestañas y los
 * estados vacíos toman el color de su sección sin que cada página lo declare (DESIGN.md · Mundo khipu).
 */
export function ZonaSeccion({ secciones, children }: { secciones: [string, GrupoNav][]; children: ReactNode }) {
  const pathname = usePathname();
  const href = rutaActiva(pathname, secciones.map(([h]) => h));
  const seccion = secciones.find(([h]) => h === href)?.[1];
  return <div data-seccion={seccion} className="contents">{children}</div>;
}
