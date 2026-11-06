import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { NOMBRE_GRUPO, type GrupoNav } from "@/lib/navegacion";

/**
 * Migas de una página interna: «Inicio › Sección › … › Página actual». La sección lleva su nudo (como en `EncabezadoPagina`).
 * Se pasa a `EncabezadoPagina` en `migas`.
 */
export function MigasSeccion({ seccion = "colegio", ruta = [], actual }: { seccion?: GrupoNav; ruta?: { href: string; texto: string }[]; actual: string }) {
  const enlace = "rounded-sm hover:text-foreground hover:underline underline-offset-4";
  return (
    <ol className="flex flex-wrap items-center gap-1">
      <li><Link href="/inicio" className={enlace}>Inicio</Link></li>
      <li aria-hidden><ChevronRight className="size-3.5" strokeWidth={2} /></li>
      <li className="inline-flex items-center gap-1.5 font-semibold text-sec-tinta">
        <span aria-hidden className="size-2 rounded-full bg-sec-nudo" />
        {NOMBRE_GRUPO[seccion]}
      </li>
      {ruta.map((r) => (
        <li key={r.href} className="contents">
          <span aria-hidden><ChevronRight className="size-3.5" strokeWidth={2} /></span>
          <span><Link href={r.href} className={enlace}>{r.texto}</Link></span>
        </li>
      ))}
      <li aria-hidden><ChevronRight className="size-3.5" strokeWidth={2} /></li>
      <li aria-current="page" className="text-foreground">{actual}</li>
    </ol>
  );
}
