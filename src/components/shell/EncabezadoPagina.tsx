import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CuerdaSeccion } from "@/components/marca/Cuerda";
import { NOMBRE_GRUPO, type GrupoNav } from "@/lib/navegacion";

/**
 * Encabezado estándar de página (specs/18 · DESIGN.md): migas, título (h1), descripción y acciones a la derecha
 * (en móvil bajan). Con `seccion`, toma el color de su grupo del menú: la miga de la sección lleva su nudo y el
 * encabezado cierra con la cuerda de la sección. Sin `seccion`, la cuerda toma la sección de la ruta (`ZonaSeccion`).
 */
export function EncabezadoPagina({
  titulo, descripcion, acciones, migas, resumen, seccion,
}: {
  titulo: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  /** Migas propias (páginas internas). Con `seccion` y sin `migas` se muestra «Inicio › Sección». */
  migas?: ReactNode;
  resumen?: ReactNode;
  seccion?: GrupoNav;
}) {
  const rastro = migas ?? (seccion && (
    <ol className="flex flex-wrap items-center gap-1">
      <li><Link href="/inicio" className="rounded-sm hover:text-foreground hover:underline underline-offset-4">Inicio</Link></li>
      <li aria-hidden><ChevronRight className="size-3.5" strokeWidth={2} /></li>
      <li className="inline-flex items-center gap-1.5 font-semibold text-sec-tinta">
        <span aria-hidden className="size-2 rounded-full bg-sec-nudo" />
        {NOMBRE_GRUPO[seccion]}
      </li>
    </ol>
  ));
  return (
    <header data-seccion={seccion} className="mb-6 flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {rastro && <nav aria-label="Ruta de navegación" className="mb-2.5 text-cuerpo-sm text-muted-foreground">{rastro}</nav>}
          <h1 className="text-titulo-2 font-bold sm:text-titulo-1">{titulo}</h1>
          {descripcion && <p className="mt-1.5 max-w-prose text-cuerpo-sm text-pretty text-muted-foreground sm:text-cuerpo">{descripcion}</p>}
          {resumen && <div className="mt-3 text-cuerpo-sm text-muted-foreground">{resumen}</div>}
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      <CuerdaSeccion />
    </header>
  );
}
