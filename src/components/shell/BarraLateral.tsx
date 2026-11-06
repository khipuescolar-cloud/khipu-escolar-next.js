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
import { cn } from "@/lib/utils";
import { ICONOS_NAV } from "./iconos";
import type { GrupoNavResuelto } from "./tipos";

// Menú lateral como un khipu (DESIGN.md · Mundo khipu): cada grupo es una cuerda colgante en el color de su sección
// (`data-seccion`), los íconos llevan ese color y el ítem activo se marca con un nudo sobre la cuerda y un fondo suave.
// Colapsado (Ctrl/⌘+B) quedan los íconos con tooltip; en móvil es un panel deslizable con el mismo contenido.

const BOTON =
  "relative min-h-10 rounded-[10px] pl-8 text-cuerpo-sm text-sidebar-foreground transition-colors duration-150 " +
  "hover:bg-sidebar-accent [&_svg]:text-sec-trazo " +
  "data-active:bg-sec-suave data-active:font-semibold data-active:text-sec-tinta data-active:hover:bg-sec-suave data-active:hover:text-sec-tinta " +
  "group-data-[collapsible=icon]:pl-2!";

export function BarraLateral({ cabecera, grupos, pie }: { cabecera: ReactNode; grupos: GrupoNavResuelto[]; pie: ReactNode }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const cerrarEnMovil = () => isMobile && setOpenMobile(false);
  const activa = rutaActiva(pathname, grupos.flatMap((g) => g.items.map((i) => i.href)));

  return (
    <Sidebar collapsible="icon" aria-label="Navegación principal" className="h-svh!">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">{cabecera}</SidebarHeader>
      <SidebarContent className="gap-1 py-3">
        {grupos.map((grupo, i) => (
          <SidebarGroup key={grupo.titulo ?? i} data-seccion={grupo.seccion} className="py-1.5">
            {grupo.titulo && (
              <SidebarGroupLabel className="h-7 gap-2.5 pl-2 text-etiqueta font-semibold text-sec-tinta">
                {/* Nudo de arranque de la cuerda del grupo. */}
                <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-sec-nudo ring-[3px] ring-sidebar" />
                {grupo.titulo}
              </SidebarGroupLabel>
            )}
            <SidebarMenu
              className={cn(
                "relative gap-0.5",
                // La cuerda: baja desde el nudo del rótulo hasta el último ítem.
                grupo.titulo && "before:absolute before:-top-3.5 before:bottom-5 before:left-[12px] before:w-0.5 before:rounded-full before:bg-sec-nudo/35 group-data-[collapsible=icon]:before:hidden",
              )}
            >
              {grupo.items.map((item) => {
                const Icono = ICONOS_NAV[item.icono];
                const activo = item.href === activa;
                if (item.bloqueadoPlan) {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton aria-disabled tooltip={`${item.titulo}: incluido en el plan ${item.bloqueadoPlan}`} className={cn(BOTON, "opacity-70")}>
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
                      className={BOTON}
                    >
                      {activo && grupo.titulo && (
                        <span aria-hidden className="absolute top-1/2 left-[8px] size-2.5 -translate-y-1/2 rounded-full bg-sec-nudo ring-[3px] ring-sec-suave group-data-[collapsible=icon]:hidden" />
                      )}
                      <Icono strokeWidth={2} aria-hidden />
                      <span>{item.titulo}</span>
                    </SidebarMenuButton>
                    {!!item.contador && (
                      <SidebarMenuBadge className="top-2.5 min-w-6 rounded-pildora bg-sec-tinta px-1.5 text-etiqueta text-sidebar tabular-nums peer-data-active/menu-button:text-sidebar">
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
      <SidebarFooter className="border-t border-sidebar-border py-3">
        <SidebarTrigger className="hidden size-9 self-end text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring md:inline-flex group-data-[collapsible=icon]:self-center" aria-label="Colapsar o expandir el menú" />
        {pie}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
