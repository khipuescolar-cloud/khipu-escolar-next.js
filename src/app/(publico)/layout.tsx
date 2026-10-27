import { CalendarCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/marca/Logo";

const PUNTOS = [
  { Icono: CalendarCheck, texto: "Asistencia con aviso a la familia el mismo día." },
  { Icono: MessageCircle, texto: "Comunicación directa entre familias y profesores." },
  { Icono: ShieldCheck, texto: "Datos protegidos, separados por colegio." },
];

/** Páginas públicas: panel de marca en escritorio, tarjeta centrada sobre `background` en todos los tamaños. */
export default function LayoutPublico({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <aside className="hidden w-[44%] max-w-xl flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <Logo invertido />
        <div className="flex flex-col gap-8">
          <p className="font-heading text-4xl leading-tight font-bold tracking-tight text-balance text-white">
            Cada día de tu hijo, bien anudado.
          </p>
          <ul className="flex flex-col gap-4">
            {PUNTOS.map(({ Icono, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-base">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-primary">
                  <Icono className="size-5" strokeWidth={2} aria-hidden />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-sidebar-foreground/70">Khipu Escolar · Perú</p>
      </aside>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-md">{children}</div>
        <p className="mt-8 text-sm text-muted-foreground lg:hidden">Cada día de tu hijo, bien anudado.</p>
      </main>
    </div>
  );
}
