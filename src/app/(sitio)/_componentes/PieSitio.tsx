import { Send } from "lucide-react";
import Link from "next/link";
import { HiloKhipu } from "@/components/marca/HiloKhipu";
import { Logo } from "@/components/marca/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BOTON_MAIZ } from "./tonos";

// Pie de la landing (specs/25): cierre con el lema y las dos acciones, columnas de enlaces y la cuerda del khipu arriba.
// Fondo `tinta` para separarse de la sección de demo (índigo); logotipo blanco (manual: sobre fondos oscuros).

const PRESION = "active:not-aria-[haspopup]:translate-y-0 active:scale-[0.96]";
const ENLACE = "flex min-h-10 w-fit items-center text-cuerpo-sm text-white/75 underline-offset-4 transition-colors hover:text-maiz hover:underline";

function Columna({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <nav aria-label={titulo} className="flex flex-col gap-3">
      <h2 className="font-heading text-cuerpo font-semibold text-white">{titulo}</h2>
      <ul className="flex flex-col">{children}</ul>
    </nav>
  );
}

export function PieSitio({ contacto }: { contacto: string | null }) {
  return (
    <footer className="relative bg-tinta text-white">
      <HiloKhipu claro className="absolute inset-x-0 -top-2" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 border-b border-white/10 py-14 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div className="flex flex-col gap-3">
            <p className="font-heading text-[32px] leading-[38px] font-bold tracking-[-0.02em] text-balance sm:text-[40px] sm:leading-[46px]">
              Cada día de tu hijo, <span className="text-maiz">bien anudado.</span>
            </p>
            <p className="max-w-lg text-cuerpo text-pretty text-white/70">Khipu Escolar une a dirección, profesores y familias de los colegios del Perú en un solo lugar.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Link href="/#demo" className={cn(buttonVariants({ size: "lg" }), "h-12 px-6", PRESION, BOTON_MAIZ)}>
              <Send strokeWidth={2} aria-hidden /> Solicitar demo
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white", PRESION)}>
              Ingresar
            </Link>
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
            <Logo variante="horizontal" tono="blanco" alto={40} />
            <p className="max-w-xs text-cuerpo-sm text-pretty text-white/65">
              Asistencia con aviso al momento, chat familia–tutor, comunicados, notas y Nudito, el asistente.
            </p>
          </div>
          <Columna titulo="El producto">
            {[
              ["/#funciones", "Funciones"],
              ["/#como-funciona", "Cómo funciona"],
              ["/#roles", "Para cada rol"],
              ["/#planes", "Planes"],
              ["/#preguntas", "Preguntas frecuentes"],
            ].map(([href, texto]) => (
              <li key={href}>
                <Link href={href} className={ENLACE}>
                  {texto}
                </Link>
              </li>
            ))}
          </Columna>
          <Columna titulo="Empieza">
            <li>
              <Link href="/#demo" className={ENLACE}>
                Solicitar demo
              </Link>
            </li>
            <li>
              <Link href="/login" className={ENLACE}>
                Ingresar
              </Link>
            </li>
            <li>
              <Link href="/instalar" className={ENLACE}>
                Instalar la app
              </Link>
            </li>
          </Columna>
          <Columna titulo="Khipu Escolar">
            {contacto && (
              <li>
                <a href={`mailto:${contacto}`} className={cn(ENLACE, "break-all")}>
                  {contacto}
                </a>
              </li>
            )}
            <li>
              <Link href="/privacidad" className={ENLACE}>
                Privacidad
              </Link>
            </li>
            <li>
              <Link href="/#demo" className={ENLACE}>
                Programa piloto 2026
              </Link>
            </li>
          </Columna>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-cuerpo-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Khipu Escolar · Perú</p>
          <p className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-maiz" aria-hidden /> Hecho en el Perú para los colegios del Perú
          </p>
        </div>
      </div>
    </footer>
  );
}
