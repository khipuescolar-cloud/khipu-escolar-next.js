import { BellRing, MessageCircle, ShieldCheck } from "lucide-react";
import { CuerdasKhipu } from "@/components/marca/CuerdasKhipu";
import { Logo } from "@/components/marca/Logo";

const PUNTOS = [
  { Icono: BellRing, titulo: "Asistencia al momento", texto: "La familia sabe el mismo día si su hijo llegó." },
  { Icono: MessageCircle, titulo: "Chat con el tutor", texto: "Familias y profesores hablan sin compartir teléfonos." },
  { Icono: ShieldCheck, titulo: "Datos cuidados", texto: "Cada colegio ve solo lo suyo (Ley 29733)." },
];

/** Páginas públicas (specs/02, specs/18): siempre en tema claro.
 *  Escritorio: portada `indigo` (logotipo, lema, promesa, tres puntos y cuerdas de khipu) + columna del formulario.
 *  Celular: logotipo «khipu ESCOLAR» arriba, formulario y pie. */
export default function LayoutPublico({ children }: LayoutProps<"/">) {
  const anio = new Date().getFullYear();
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background lg:flex-row" style={{ colorScheme: "light" }}>
      <aside className="relative hidden w-1/2 max-w-[720px] flex-col overflow-hidden bg-indigo text-white lg:flex">
        <div className="relative z-10 flex flex-1 flex-col gap-10 px-12 pt-12 xl:px-16">
          <Logo tono="blanco" alto={40} />
          <div className="flex max-w-md flex-col gap-5">
            <p className="text-sobretitulo text-white/70 uppercase">Para colegios del Perú</p>
            <p className="font-heading text-titulo-xl text-balance">Cada día de tu hijo, bien anudado.</p>
            <p className="text-cuerpo text-white/80">
              Lo importante del colegio llega a tiempo, claro y seguro: asistencia, mensajes y notas, en el momento en que pasan.
            </p>
          </div>
          <ul className="flex max-w-md flex-col gap-5">
            {PUNTOS.map(({ Icono, titulo, texto }) => (
              <li key={titulo} className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icono className="size-5" strokeWidth={2} aria-hidden />
                </span>
                <span className="flex flex-col">
                  <span className="text-cuerpo font-semibold">{titulo}</span>
                  <span className="text-cuerpo-sm text-white/75">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        {/* Cuerdas del khipu colgando hasta el borde: decorativas y lejos del texto (manual de marca). */}
        <CuerdasKhipu className="mt-10 h-56 w-full shrink-0" />
      </aside>

      <main className="flex flex-1 flex-col px-4 sm:px-6">
        <div className="flex justify-center pt-10 lg:hidden">
          <Logo variante="escolar" alto={60} />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>
        <footer className="flex flex-col items-center gap-1 pb-6 text-center text-cuerpo-sm text-muted-foreground">
          <p className="lg:hidden">Cada día de tu hijo, bien anudado.</p>
          <p>© {anio} Khipu Escolar · Perú</p>
        </footer>
      </main>
    </div>
  );
}
