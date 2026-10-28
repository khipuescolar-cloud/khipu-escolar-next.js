import type { Metadata, Viewport } from "next";
import { Inter, Nunito, Sora } from "next/font/google";
import { Proveedores } from "@/components/shell/Proveedores";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Khipu Escolar", template: "%s · Khipu Escolar" },
  description: "Cada día de tu hijo, bien anudado.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e2a78" },
    { media: "(prefers-color-scheme: dark)", color: "#12141c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-PE" suppressHydrationWarning className={`${inter.variable} ${sora.variable} ${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  );
}
