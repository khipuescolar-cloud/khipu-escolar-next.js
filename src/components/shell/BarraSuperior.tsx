"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/marca/Logo";
import { SidebarTrigger } from "@/components/ui/sidebar";

const BOTON_BARRA =
  "relative inline-grid size-10 place-items-center rounded-md text-barra-foreground transition-colors hover:bg-white/10 data-popup-open:bg-white/15";

/** Barra superior del panel en `indigo` (manual de marca): menú, logotipo blanco de khipu y contexto (sin campana: los avisos van en el menú lateral y en avisos superiores). */
export function BarraSuperior({
  inicioHref = "/",
  etiqueta,
  extra,
}: {
  inicioHref?: string;
  /** Texto corto junto al logotipo (p. ej. «Plataforma»). */
  etiqueta?: string;
  extra?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 box-content flex h-(--header-height) shrink-0 items-center pt-[env(safe-area-inset-top)] gap-1 bg-barra px-2 text-barra-foreground sm:gap-2 sm:px-3">
      <SidebarTrigger className={`${BOTON_BARRA} hover:text-barra-foreground [&_svg]:size-5`} aria-label="Abrir o cerrar el menú" />
      <Link href={inicioHref} className="flex items-center gap-3 rounded-sm px-1 py-1" aria-label="khipu: ir al inicio">
        <Logo tono="blanco" alto={28} />
        {etiqueta && (
          <span className="hidden rounded-pildora border border-white/30 px-2.5 py-0.5 text-etiqueta sm:inline">{etiqueta}</span>
        )}
      </Link>
      <div className="flex-1" />
      {extra}
    </header>
  );
}
