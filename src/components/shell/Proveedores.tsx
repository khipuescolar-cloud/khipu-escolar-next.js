"use client";

import { ThemeProvider } from "next-themes";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Páginas públicas (src/app/(publico)): siempre en el tema claro de la marca, sin importar el sistema
 *  ni el tema guardado por el usuario (que se conserva para el panel). */
const RUTAS_PUBLICAS = ["/login", "/elegir-colegio", "/entrando", "/recuperar", "/restablecer", "/cambiar-password", "/justificar", "/q", "/instalar", "/sin-conexion"];

/** Grupo de rutas del sitio público (landing y privacidad, specs/25). */
const GRUPO_SITIO = "(sitio)";

/**
 * `segmentos` = useSelectedLayoutSegments() del layout raíz. La landing se reconoce por su grupo de rutas y no
 * por `pathname === "/"`: en un subdominio de colegio «/» se reescribe a /colegio/<slug>/inicio y el navegador
 * sigue viendo «/», así que comparar el pathname forzaría el tema claro en el panel del colegio.
 */
export function esRutaPublica(pathname: string, segmentos: readonly string[] = []) {
  if (segmentos[0] === GRUPO_SITIO) return true;
  return RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Tema claro/oscuro (el panel sigue al sistema por defecto), tooltips y notificaciones emergentes. */
export function Proveedores({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const segmentos = useSelectedLayoutSegments();
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={esRutaPublica(pathname, segmentos) ? "light" : undefined}
    >
      <TooltipProvider>
        {children}
        <Toaster position="top-center" richColors closeButton duration={4000} />
      </TooltipProvider>
    </ThemeProvider>
  );
}
