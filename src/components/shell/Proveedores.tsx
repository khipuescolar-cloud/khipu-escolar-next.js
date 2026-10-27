"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Tema claro/oscuro (sigue al sistema por defecto), tooltips y notificaciones emergentes. */
export function Proveedores({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        {children}
        <Toaster position="top-center" richColors closeButton duration={4000} />
      </TooltipProvider>
    </ThemeProvider>
  );
}
