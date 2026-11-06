"use client";

import Link from "next/link";
import { Logo } from "@/components/marca/Logo";
import { SidebarTrigger } from "@/components/ui/sidebar";

/** Cabecera mínima del menú móvil; la navegación de escritorio vive en la barra lateral. */
export function BarraSuperior({ inicioHref = "/" }: { inicioHref?: string }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-14 shrink-0 items-center gap-2 border-b border-borde-sutil bg-superficie-elevada px-3 text-foreground md:hidden">
      <SidebarTrigger className="size-11 shrink-0 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-5" aria-label="Abrir menú" />
      <Link href={inicioHref} className="inline-flex min-h-11 items-center rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Khipu Escolar: ir al inicio">
        <Logo variante="isotipo" alto={28} />
        <span className="ml-2 font-heading text-cuerpo-sm font-semibold">Khipu Escolar</span>
      </Link>
    </header>
  );
}
