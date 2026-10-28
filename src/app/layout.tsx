import type { Metadata, Viewport } from "next";
import { Inter, Nunito, Sora } from "next/font/google";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";
import { Proveedores } from "@/components/shell/Proveedores";
import { urlRaiz } from "@/lib/dominio";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  // Base de las URL absolutas (Open Graph de la landing, specs/25).
  metadataBase: new URL(urlRaiz("/")),
  title: { default: "Khipu Escolar", template: "%s · Khipu Escolar" },
  description: "Cada día de tu hijo, bien anudado.",
  // App instalable (specs/24): el manifiesto sale de src/app/manifest.ts (/manifest.webmanifest, Next agrega el <link>).
  applicationName: "Khipu Escolar",
  appleWebApp: { capable: true, title: "Khipu", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // `cover` + env(safe-area-inset-*) en la barra superior y el botón de Nudito (muesca y barra de inicio del iPhone).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e2a78" },
    { media: "(prefers-color-scheme: dark)", color: "#12141c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-PE" suppressHydrationWarning className={`${inter.variable} ${sora.variable} ${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Proveedores>
          {children}
          {/* App instalable (specs/24): service worker en todas las páginas, con aviso de nueva versión. */}
          <RegistrarServiceWorker />
        </Proveedores>
      </body>
    </html>
  );
}
