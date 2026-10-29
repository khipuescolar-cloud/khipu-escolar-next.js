import type { Metadata } from "next";
import { correoContactoPublico } from "@/lib/server/landing";
import { EncabezadoSitio } from "./_componentes/EncabezadoSitio";
import { PieSitio } from "./_componentes/PieSitio";

// Sitio público de Khipu Escolar en la raíz del dominio (specs/25-landing-publica.md): landing y privacidad.
// Siempre en tema claro (esRutaPublica en Proveedores). No usa el layout de (publico) del login.

const TITULO = "Khipu Escolar · Cada día de tu hijo, bien anudado.";
const DESCRIPCION =
  "Plataforma para colegios del Perú: asistencia con aviso a la familia al momento, portería con carnet QR, chat familia–tutor sin teléfonos, comunicados, notas por competencias, tareas y Nudito, el asistente.";

export const metadata: Metadata = {
  title: { absolute: TITULO },
  description: DESCRIPCION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_PE",
    siteName: "Khipu Escolar",
    title: TITULO,
    description: DESCRIPCION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRIPCION },
};

export default async function LayoutSitio({ children }: LayoutProps<"/">) {
  const contacto = await correoContactoPublico();
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background text-foreground caret-indigo-cielo antialiased selection:bg-maiz selection:text-sobre-maiz" style={{ colorScheme: "light" }}>
      <a href="#contenido" className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Saltar al contenido
      </a>
      <EncabezadoSitio />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <PieSitio contacto={contacto} />
    </div>
  );
}
