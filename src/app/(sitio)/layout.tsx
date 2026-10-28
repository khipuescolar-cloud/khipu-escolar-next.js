import type { Metadata } from "next";
import Link from "next/link";
import { HiloKhipu } from "@/components/marca/HiloKhipu";
import { Logo } from "@/components/marca/Logo";
import { correoContactoPublico } from "@/lib/server/landing";
import { EncabezadoSitio } from "./_componentes/EncabezadoSitio";

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
    <div className="flex min-h-dvh flex-1 flex-col bg-background text-foreground" style={{ colorScheme: "light" }}>
      <a href="#contenido" className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Saltar al contenido
      </a>
      <EncabezadoSitio />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <footer className="bg-superficie">
        <HiloKhipu className="-mt-2" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-3">
            <Logo variante="escolar" alto={52} />
            <p className="text-cuerpo text-muted-foreground">Cada día de tu hijo, bien anudado.</p>
          </div>
          <nav aria-label="Enlaces del pie" className="grid grid-cols-2 gap-x-8 gap-y-1 sm:flex sm:flex-wrap sm:items-start sm:gap-x-6">
            <Link href="/login" className="flex min-h-11 items-center text-cuerpo-sm font-medium hover:underline">
              Ingresar
            </Link>
            <Link href="/instalar" className="flex min-h-11 items-center text-cuerpo-sm font-medium hover:underline">
              Instalar la app
            </Link>
            <Link href="/privacidad" className="flex min-h-11 items-center text-cuerpo-sm font-medium hover:underline">
              Privacidad
            </Link>
            {contacto && (
              <a href={`mailto:${contacto}`} className="flex min-h-11 items-center text-cuerpo-sm font-medium hover:underline">
                Contacto
              </a>
            )}
          </nav>
        </div>
        <div className="border-t border-arena">
          <p className="mx-auto max-w-6xl px-4 py-5 text-cuerpo-sm text-muted-foreground sm:px-6">© 2026 Khipu Escolar · Perú</p>
        </div>
      </footer>
    </div>
  );
}
