import { etiquetaNivel, NIVELES, totalDistribucion, type Distribucion, type Nivel } from "@/lib/tablero";
import type { Escala } from "@/lib/calificaciones";

// Barra apilada AD / A / B / C. Cada tramo lleva su letra y su cantidad (no depende solo del color).
const COLOR: Record<Nivel, string> = {
  AD: "bg-turquesa text-white dark:text-sobre-maiz",
  A: "bg-indigo-cielo text-white dark:text-sobre-maiz",
  B: "bg-maiz text-sobre-maiz",
  C: "bg-cochinilla text-white dark:text-sobre-maiz",
};

export function BarraDistribucion({ distribucion, escala }: { distribucion: Distribucion; escala: Escala }) {
  const total = totalDistribucion(distribucion);
  if (total === 0) return <span className="text-cuerpo-sm text-muted-foreground">Sin notas</span>;
  const resumen = NIVELES.map((n) => `${etiquetaNivel(n, escala)}: ${distribucion[n]}`).join(", ");
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-6 w-full min-w-40 overflow-hidden rounded-md border" role="img" aria-label={resumen}>
        {NIVELES.filter((n) => distribucion[n] > 0).map((n) => (
          <span key={n} className={`flex items-center justify-center text-xs font-semibold tabular-nums ${COLOR[n]}`} style={{ width: `${(distribucion[n] / total) * 100}%` }} aria-hidden>
            {distribucion[n] / total >= 0.12 ? `${etiquetaNivel(n, escala)} ${distribucion[n]}` : ""}
          </span>
        ))}
      </div>
      <span className="sr-only">{resumen}</span>
    </div>
  );
}
