"use client";

import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Páginas públicas (src/app/(publico)): siempre en el tema claro de la marca, sin importar el sistema
 *  ni el tema guardado por el usuario (que se conserva para el panel). */
const RUTAS_PUBLICAS = ["/login", "/elegir-colegio", "/entrando", "/recuperar", "/restablecer", "/cambiar-password", "/justificar", "/q"];

export function esRutaPublica(pathname: string) {
  return RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Tema claro/oscuro (el panel sigue al sistema por defecto), tooltips y notificaciones emergentes. */
export function Proveedores({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={esRutaPublica(pathname) ? "light" : undefined}
    >
      <TooltipProvider>
        {children}
        <Toaster position="top-center" richColors closeButton duration={4000} />
      </TooltipProvider>
    </ThemeProvider>
  );
}
