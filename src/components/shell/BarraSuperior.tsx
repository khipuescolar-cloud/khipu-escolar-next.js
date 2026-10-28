"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/marca/Logo";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

export type Notificacion = { titulo: string; href: string; cantidad: number };

const BOTON_BARRA =
  "relative inline-grid size-10 place-items-center rounded-md text-barra-foreground transition-colors hover:bg-white/10 data-popup-open:bg-white/15";

/** Barra superior del panel en `indigo` (manual de marca): menú, logotipo blanco de khipu, contexto y notificaciones. */
export function BarraSuperior({
  inicioHref = "/",
  etiqueta,
  notificaciones = [],
  extra,
}: {
  inicioHref?: string;
  /** Texto corto junto al logotipo (p. ej. «Plataforma»). */
  etiqueta?: string;
  notificaciones?: Notificacion[];
  extra?: ReactNode;
}) {
  const total = notificaciones.reduce((s, n) => s + n.cantidad, 0);

  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-1 bg-barra px-2 text-barra-foreground sm:gap-2 sm:px-3">
      <SidebarTrigger className={`${BOTON_BARRA} hover:text-barra-foreground [&_svg]:size-5`} aria-label="Abrir o cerrar el menú" />
      <Link href={inicioHref} className="flex items-center gap-3 rounded-sm px-1 py-1" aria-label="khipu: ir al inicio">
        <Logo tono="blanco" alto={28} />
        {etiqueta && (
          <span className="hidden rounded-pildora border border-white/30 px-2.5 py-0.5 text-etiqueta sm:inline">{etiqueta}</span>
        )}
      </Link>
      <div className="flex-1" />
      {extra}
      <DropdownMenu>
        <DropdownMenuTrigger className={BOTON_BARRA} aria-label={total ? `Notificaciones: ${total} nuevas` : "Notificaciones"}>
          <Bell className="size-5" strokeWidth={2} aria-hidden />
          {total > 0 && (
            // Nudo maíz con el número en tinta (9.2:1), como el aviso de Nudito.
            <span className="absolute top-1 right-1 grid min-w-5 place-items-center rounded-pildora bg-maiz px-1 text-etiqueta leading-5 text-sobre-maiz" aria-hidden>
              {total > 9 ? "9+" : total}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {total === 0 ? (
            <p className="px-2 py-6 text-center text-cuerpo-sm text-muted-foreground">Estás al día. No hay nada nuevo.</p>
          ) : (
            notificaciones
              .filter((n) => n.cantidad > 0)
              .map((n) => (
                <DropdownMenuItem key={n.href} render={<Link href={n.href} />} className="justify-between">
                  <span>{n.titulo}</span>
                  <span className="rounded-pildora bg-primary px-2 py-0.5 text-etiqueta text-primary-foreground">{n.cantidad}</span>
                </DropdownMenuItem>
              ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
