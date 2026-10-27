"use client";

import { ChevronsUpDown, LogOut, Monitor, Moon, Sun, UserRound, Repeat } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import type { UsuarioShell } from "./tipos";

type Props = {
  usuario: UsuarioShell;
  perfilHref?: string;
  salir: () => Promise<void>;
  /** Cambio de rol (solo si el usuario tiene más de uno en el colegio). */
  roles?: { valor: string; nombre: string }[];
  rolActual?: string;
  cambiarRol?: (datos: FormData) => Promise<void>;
};

/** Menú de cuenta al pie de la barra lateral: rol, perfil, tema y salir. */
export function MenuUsuario({ usuario, perfilHref, salir, roles = [], rolActual, cambiarRol }: Props) {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [pendiente, iniciar] = useTransition();

  const elegirRol = (valor: string) => {
    if (!cambiarRol || valor === rolActual) return;
    const datos = new FormData();
    datos.set("rol", valor);
    iniciar(() => cambiarRol(datos));
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" aria-label="Menú de tu cuenta" />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-sidebar-primary font-semibold text-sidebar-primary-foreground">
                {usuario.iniciales}
              </AvatarFallback>
            </Avatar>
            <span className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{usuario.nombre}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{usuario.rolNombre}</span>
            </span>
            <ChevronsUpDown className="ml-auto" strokeWidth={2} aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" sideOffset={6} className="min-w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate font-semibold text-foreground">{usuario.nombre}</span>
                <span className="block truncate text-xs text-muted-foreground">{usuario.correo}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            {roles.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Repeat className="size-3.5" strokeWidth={2} aria-hidden /> Entrar como
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={rolActual} onValueChange={(v) => elegirRol(String(v))}>
                    {roles.map((r) => (
                      <DropdownMenuRadioItem key={r.valor} value={r.valor} disabled={pendiente}>
                        {r.nombre}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuSeparator />
            {perfilHref && (
              <DropdownMenuItem render={<Link href={perfilHref} />}>
                <UserRound strokeWidth={2} aria-hidden /> Mi perfil
              </DropdownMenuItem>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sun strokeWidth={2} aria-hidden /> Tema
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(String(v))}>
                  <DropdownMenuRadioItem value="light"><Sun strokeWidth={2} aria-hidden /> Claro</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark"><Moon strokeWidth={2} aria-hidden /> Oscuro</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system"><Monitor strokeWidth={2} aria-hidden /> Como el dispositivo</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            {/* Formulario real: la redirección de salir cruza de subdominio y necesita navegación completa. */}
            <DropdownMenuItem variant="destructive" render={<button type="submit" form="form-salir" className="w-full" />}>
              <LogOut strokeWidth={2} aria-hidden /> Salir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <form id="form-salir" action={salir} hidden />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
