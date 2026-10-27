"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { esRutaActiva } from "./BarraLateral";
import type { GrupoNavResuelto } from "./tipos";

export type Notificacion = { titulo: string; href: string; cantidad: number };

/** Barra superior pegajosa: abrir/cerrar menú, título de la sección y notificaciones. */
export function BarraSuperior({ grupos, notificaciones = [], extra }: { grupos: GrupoNavResuelto[]; notificaciones?: Notificacion[]; extra?: ReactNode }) {
  const pathname = usePathname();
  const actual = grupos
    .flatMap((g) => g.items)
    .filter((i) => esRutaActiva(pathname, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const total = notificaciones.reduce((s, n) => s + n.cantidad, 0);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
      <SidebarTrigger className="size-10" aria-label="Abrir o cerrar el menú" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-5" />
      <p className="min-w-0 flex-1 truncate font-heading text-base font-semibold">{actual?.titulo ?? ""}</p>
      {extra}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
          aria-label={total ? `Notificaciones: ${total} nuevas` : "Notificaciones"}
        >
          <Bell strokeWidth={2} aria-hidden />
          {total > 0 && (
            <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-pildora bg-cochinilla px-1 text-[0.65rem] leading-4 font-bold text-white" aria-hidden>
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
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Estás al día. No hay nada nuevo.</p>
          ) : (
            notificaciones
              .filter((n) => n.cantidad > 0)
              .map((n) => (
                <DropdownMenuItem key={n.href} render={<Link href={n.href} />} className="justify-between">
                  <span>{n.titulo}</span>
                  <span className="rounded-pildora bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{n.cantidad}</span>
                </DropdownMenuItem>
              ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
