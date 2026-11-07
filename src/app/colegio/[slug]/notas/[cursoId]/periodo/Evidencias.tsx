"use client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NOMBRE_MARCA, textoValor, type Literal, type Marca } from "@/lib/calificaciones";

export type Evidencia = { titulo: string; fecha: string; valorLiteral: Literal | null; valorNumerico: number | null; marca: Marca | null };

const fecha = (iso: string) => new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** Notas del periodo en una competencia, como chips de solo lectura. Al pasar o tocar se ve la actividad. Sin cálculos. */
export function Evidencias({ evidencias, alumno }: { evidencias: Evidencia[]; alumno: string }) {
  if (evidencias.length === 0) return <span className="text-xs text-muted-foreground">Sin notas</span>;
  return (
    <ul className="flex flex-wrap gap-1" aria-label={`Evidencias de ${alumno}`}>
      {evidencias.map((e, i) => {
        const valor = textoValor(e);
        return (
          <li key={i}>
            <Popover>
              <PopoverTrigger
                openOnHover
                delay={100}
                aria-label={`${e.titulo}, ${fecha(e.fecha)}: ${valor}`}
                className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-borde-sutil bg-superficie-2 px-1.5 text-xs font-semibold tabular-nums outline-none hover:border-input-hover focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {valor}
              </PopoverTrigger>
              <PopoverContent className="w-60" side="top">
                <p className="font-medium">{e.titulo}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{fecha(e.fecha)} · {e.marca && !e.valorLiteral && e.valorNumerico === null ? NOMBRE_MARCA[e.marca] : valor}</p>
              </PopoverContent>
            </Popover>
          </li>
        );
      })}
    </ul>
  );
}
