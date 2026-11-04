import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Progreso del asistente (specs/40): círculos numerados unidos por una línea; los pasos hechos llevan check, el actual
 * va destacado (`aria-current="step"`) y se lee «Paso 2 de 3». Los nombres de los otros pasos se ven desde `2xl`; en el
 * celular, una barra de segmentos con el nombre del paso actual.
 */
export function ProgresoPasos({ pasos, actual }: { pasos: readonly string[]; actual: number }) {
  return (
    <nav aria-label="Progreso" className="flex min-w-0 flex-col gap-1.5">
      <p className="text-etiqueta font-normal text-muted-foreground">
        Paso {actual + 1} de {pasos.length}
        <span className="font-semibold text-foreground sm:hidden"> · {pasos[actual]}</span>
      </p>
      {/* Celular: segmentos. */}
      <div aria-hidden className="flex gap-1 sm:hidden">
        {pasos.map((p, i) => (
          <span key={p} className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <span className={cn("block h-full origin-left bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none", i <= actual ? "scale-x-100" : "scale-x-0")} />
          </span>
        ))}
      </div>
      <ol className="flex items-center max-sm:sr-only">
        {pasos.map((p, i) => {
          const hecho = i < actual;
          const esActual = i === actual;
          return (
            <li key={p} aria-current={esActual ? "step" : undefined} className="flex items-center">
              {i > 0 && (
                <span aria-hidden className="mx-2 h-0.5 w-6 overflow-hidden rounded-full bg-border 2xl:w-10">
                  <span className={cn("block h-full origin-left bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none", i <= actual ? "scale-x-100" : "scale-x-0")} />
                </span>
              )}
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-full text-etiqueta font-semibold tabular-nums transition-colors duration-200",
                    hecho && "bg-primary text-primary-foreground",
                    esActual && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                    !hecho && !esActual && "border border-input bg-card text-muted-foreground",
                  )}
                >
                  {hecho ? <Check className="size-4" strokeWidth={2.5} aria-hidden /> : i + 1}
                </span>
                <span className={cn("text-cuerpo-sm whitespace-nowrap", esActual ? "font-semibold text-foreground" : "text-muted-foreground max-2xl:sr-only")}>
                  {p}
                  {hecho && <span className="sr-only"> (hecho)</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
