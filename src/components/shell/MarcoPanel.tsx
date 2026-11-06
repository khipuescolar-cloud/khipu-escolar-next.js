import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/** Estructura compartida del panel: menú móvil, barra lateral y contenido fluido. */
export function MarcoPanel({
  abierta,
  barraMovil,
  barraLateral,
  avisoSuperior,
  children,
  flotante,
}: {
  abierta: boolean;
  barraMovil: ReactNode;
  barraLateral: ReactNode;
  /** Franja sobre el contenido (p. ej. el banner del modo soporte). */
  avisoSuperior?: ReactNode;
  children: ReactNode;
  /** Elementos flotantes (p. ej. un botón de ayuda). */
  flotante?: ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={abierta} className="flex-col">
      <a href="#contenido-panel" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-ring">Saltar al contenido</a>
      {barraMovil}
      <div className="flex flex-1">
        {barraLateral}
        <SidebarInset id="contenido-panel" tabIndex={-1} className="min-w-0">
          {avisoSuperior}
          <div className="w-full min-w-0 flex-1 p-4 md:p-8">{children}</div>
        </SidebarInset>
      </div>
      {flotante}
    </SidebarProvider>
  );
}
