/* eslint-disable @next/next/no-img-element -- patrón SVG oficial de la marca */
import { CalendarCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/marca/Logo";

const PUNTOS = [
  { Icono: CalendarCheck, texto: "Asistencia con aviso a la familia el mismo día." },
  { Icono: MessageCircle, texto: "Comunicación directa entre familias y profesores." },
  { Icono: ShieldCheck, texto: "Datos protegidos, separados por colegio." },
];

/** Páginas públicas (manual de marca): portada `indigo` con el logotipo blanco y el patrón de cuerdas en escritorio;
 *  en celular, el logotipo «khipu ESCOLAR» sobre `fondo`. */
export default function LayoutPublico({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <aside className="hidden w-[44%] max-w-xl flex-col justify-between gap-10 bg-indigo p-12 text-white lg:flex">
        <Logo tono="blanco" alto={40} />
        <div className="flex flex-col gap-8">
          <p className="font-heading text-titulo-xl text-balance">Cada día de tu hijo, bien anudado.</p>
          <ul className="flex flex-col gap-4">
            {PUNTOS.map(({ Icono, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-cuerpo">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icono className="size-5" strokeWidth={2} aria-hidden />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
        {/* Patrón de cuerdas y nudos: fondo decorativo, nunca detrás de texto largo (manual). */}
        <img src="/marca/patron-khipu.svg" alt="" aria-hidden className="w-full rounded-lg" />
        <p className="text-cuerpo-sm text-white/75">Khipu Escolar · Perú</p>
      </aside>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 lg:hidden">
          <Logo variante="escolar" alto={64} />
        </div>
        <div className="w-full max-w-md">{children}</div>
        <p className="mt-8 text-cuerpo-sm text-muted-foreground lg:hidden">Cada día de tu hijo, bien anudado.</p>
      </main>
    </div>
  );
}
