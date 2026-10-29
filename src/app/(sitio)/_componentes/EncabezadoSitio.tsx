import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/marca/Logo";
import { cn } from "@/lib/utils";
import { MenuMovil } from "./MenuMovil";

export const ANCLAS = [
  { href: "/#funciones", texto: "Funciones" },
  { href: "/#como-funciona", texto: "Cómo funciona" },
  { href: "/#planes", texto: "Planes" },
  { href: "/#preguntas", texto: "Preguntas" },
];

/** Encabezado fijo de la landing (specs/25): logotipo público, anclas, «Ingresar» y «Solicitar demo». */
export function EncabezadoSitio() {
  return (
    <header className="sticky top-0 z-40 border-b border-arena bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px]">
        <Link href="/" className="flex shrink-0 items-center rounded-md" aria-label="Khipu Escolar, inicio">
          <Logo variante="escolar" alto={44} />
        </Link>
        <nav aria-label="Secciones" className="hidden items-center gap-1 lg:flex">
          {ANCLAS.map((a) => (
            <a key={a.href} href={a.href} className="rounded-md px-3 py-2 text-cuerpo-sm font-medium text-foreground hover:bg-muted">
              {a.texto}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden h-11 px-4 sm:inline-flex")}>
            Ingresar
          </Link>
          <Link href="/#demo" className={cn(buttonVariants(), "hidden h-11 px-4 sm:inline-flex")}>
            Solicitar demo
          </Link>
          <MenuMovil anclas={ANCLAS} />
        </div>
      </div>
    </header>
  );
}
