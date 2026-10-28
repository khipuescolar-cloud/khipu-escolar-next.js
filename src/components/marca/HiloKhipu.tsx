import { cn } from "@/lib/utils";

// Cuerda horizontal con nudos en los colores de la paleta (docs/marca): separador decorativo de secciones.
// Nunca va detrás de texto ni comunica estados.
const NUDOS = ["bg-indigo", "bg-cochinilla", "bg-maiz", "bg-turquesa", "bg-indigo-cielo", "bg-maiz", "bg-cochinilla", "bg-turquesa", "bg-indigo"];

export function HiloKhipu({ className, claro }: { className?: string; claro?: boolean }) {
  return (
    <div className={cn("relative flex h-4 items-center justify-around", className)} aria-hidden>
      <span className={cn("absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full", claro ? "bg-white/40" : "bg-arena")} />
      {NUDOS.map((c, i) => (
        <span key={i} className={cn("relative size-3.5 rounded-full", c, claro && c === "bg-indigo" && "bg-white")} />
      ))}
    </div>
  );
}
