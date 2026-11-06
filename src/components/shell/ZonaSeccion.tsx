"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ProveedorSeccion } from "@/components/shell/SeccionContexto";
import { rutaActiva, type GrupoNav } from "@/lib/navegacion";

/** Rutas cuyo color no sale del menú (el mismo enlace aparece en dos grupos según el rol): el horario es de «Día a día». */
const SECCION_POR_RUTA: [string, GrupoNav][] = [["/horario", "dia"]];

/**
 * Pone `data-seccion` en el contenido según la ruta activa del menú: así la cuerda del encabezado, las pestañas y los
 * estados vacíos toman el color de su sección sin que cada página lo declare (DESIGN.md · Mundo khipu). También la publica por contexto para los portales.
 */
export function ZonaSeccion({ secciones, children }: { secciones: [string, GrupoNav][]; children: ReactNode }) {
  const pathname = usePathname();
  const href = rutaActiva(pathname, secciones.map(([h]) => h));
  const fija = SECCION_POR_RUTA.find(([r]) => pathname === r || pathname.startsWith(`${r}/`))?.[1];
  const seccion = fija ?? secciones.find(([h]) => h === href)?.[1];
  return (
    <ProveedorSeccion value={seccion}>
      <div data-seccion={seccion} className="contents">{children}</div>
    </ProveedorSeccion>
  );
}
