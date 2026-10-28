import type { CSSProperties, ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/** Estructura del panel: barra superior `indigo` a todo el ancho y, debajo, la barra lateral y el contenido. */
export function MarcoPanel({
  abierta,
  barraSuperior,
  barraLateral,
  avisoSuperior,
  children,
  flotante,
}: {
  abierta: boolean;
  barraSuperior: ReactNode;
  barraLateral: ReactNode;
  /** Franja sobre el contenido (p. ej. el banner del modo soporte). */
  avisoSuperior?: ReactNode;
  children: ReactNode;
  /** Elementos flotantes (p. ej. el botón de Nudito). */
  flotante?: ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={abierta} className="flex-col" style={{ "--header-height": "3.5rem" } as CSSProperties}>
      {barraSuperior}
      <div className="flex flex-1">
        {barraLateral}
        <SidebarInset>
          {avisoSuperior}
          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</div>
        </SidebarInset>
      </div>
      {flotante}
    </SidebarProvider>
  );
}
