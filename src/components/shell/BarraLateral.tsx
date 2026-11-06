"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { rutaActiva } from "@/lib/navegacion";
import { ICONOS_NAV } from "./iconos";
import type { GrupoNavResuelto } from "./tipos";

/** Barra lateral: fija en escritorio (colapsable a íconos con Ctrl/⌘+B) y menú deslizable en móvil. */
export function BarraLateral({ cabecera, grupos, pie }: { cabecera: ReactNode; grupos: GrupoNavResuelto[]; pie: ReactNode }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const cerrarEnMovil = () => isMobile && setOpenMobile(false);
  const activa = rutaActiva(pathname, grupos.flatMap((g) => g.items.map((i) => i.href)));

  return (
    <Sidebar
      collapsible="icon"
      aria-label="Navegación principal"
      className="h-svh!"
    >
      <SidebarHeader className="border-b border-borde-sutil bg-superficie-elevada py-4">{cabecera}</SidebarHeader>
      <SidebarContent className="py-3">
        {grupos.map((grupo, i) => (
          <SidebarGroup key={grupo.titulo ?? i} className="mb-2">
            {grupo.titulo && <SidebarGroupLabel className="text-etiqueta font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden">{grupo.titulo}</SidebarGroupLabel>}
            <SidebarMenu>
              {grupo.items.map((item) => {
                const Icono = ICONOS_NAV[item.icono];
                const activo = item.href === activa;
                if (item.bloqueadoPlan) {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        aria-disabled
                        tooltip={`${item.titulo}: incluido en el plan ${item.bloqueadoPlan}`}
                        className="opacity-60"
                      >
                        <Icono strokeWidth={2} aria-hidden />
                        <span>{item.titulo}</span>
                        <Lock className="ml-auto" strokeWidth={2} aria-hidden />
                        <span className="sr-only">(bloqueado, plan {item.bloqueadoPlan})</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={activo}
                      tooltip={item.titulo}
                      render={<Link href={item.href} onClick={cerrarEnMovil} aria-current={activo ? "page" : undefined} />}
                      className="min-h-10 rounded-md text-cuerpo-sm transition-colors data-active:bg-acento-suave data-active:font-semibold data-active:text-primary data-active:hover:bg-acento-suave data-active:hover:text-primary"
                    >
                      <Icono strokeWidth={2} aria-hidden />
                      <span>{item.titulo}</span>
                    </SidebarMenuButton>
                    {!!item.contador && (
                      <SidebarMenuBadge className="rounded-md bg-tarde-fondo text-etiqueta text-tarde peer-data-active/menu-button:text-tarde">
                        {item.contador}
                        <span className="sr-only"> nuevos</span>
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-borde-sutil bg-superficie-elevada py-3">
        <SidebarTrigger className="hidden size-9 self-end text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring md:inline-flex group-data-[collapsible=icon]:self-center" aria-label="Colapsar o expandir el menú" />
        {pie}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
