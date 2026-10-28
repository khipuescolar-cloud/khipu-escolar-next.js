import { CloudOff, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import { Tarjeta } from "@/components/ui/Tarjeta";

export const metadata: Metadata = { title: "Sin conexión" };
// Estática: el service worker la guarda al instalarse y la muestra cuando una página no carga por falta de red
// (specs/24). No tiene datos de nadie.
export const dynamic = "force-static";

export default function SinConexionPage() {
  return (
    <Tarjeta className="flex flex-col items-center gap-4 p-6 text-center sm:p-8" data-testid="pagina-sin-conexion">
      <span className="flex size-12 items-center justify-center rounded-lg bg-superficie-2 text-primary">
        <CloudOff className="size-6" strokeWidth={2} aria-hidden />
      </span>
      <h1 className="font-heading text-titulo-2">No hay conexión</h1>
      <p className="text-cuerpo text-muted-foreground">Lo que guardaste se enviará al volver la señal.</p>
      {/* Enlace normal (sin JavaScript): vuelve a pedir la página; si sigue sin red, se muestra esta misma. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- recarga completa a propósito: <Link> navegaría por el cliente sin pedir la página de nuevo */}
      <a href="/" className="enlace inline-flex min-h-10 items-center gap-2 text-cuerpo-sm font-semibold">
        <RefreshCw className="size-4" strokeWidth={2} aria-hidden /> Volver a intentar
      </a>
    </Tarjeta>
  );
}
