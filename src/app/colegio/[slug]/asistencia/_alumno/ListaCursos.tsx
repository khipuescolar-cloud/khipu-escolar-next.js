import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ListaDividida } from "@/components/ui/Superficies";
import { porcentajeCurso } from "@/lib/periodos-asistencia";
import { textoPorcentaje } from "@/lib/reportes-asistencia";
import type { FilaCursoReporte } from "@/lib/server/reportes-asistencia";
import { cn } from "@/lib/utils";

/** Detalle corto de un curso: clases, faltas y tardanzas en palabras. */
export function textoClases(c: Pick<FilaCursoReporte, "registros" | "faltas" | "tardanzas">): string {
  if (c.registros === 0) return "Aún sin lista en este periodo";
  const partes = [
    `${c.registros - c.faltas} de ${c.registros} ${c.registros === 1 ? "clase" : "clases"}`,
    c.faltas > 0 ? `${c.faltas} ${c.faltas === 1 ? "falta" : "faltas"}` : null,
    c.tardanzas > 0 ? `${c.tardanzas} ${c.tardanzas === 1 ? "tardanza" : "tardanzas"}` : null,
  ];
  return partes.filter(Boolean).join(" · ");
}

/** Barra del % de asistencia a clase (siempre junto a su número). Debajo de 85 % toma el rojo de «No llegó». */
export function BarraAsistencia({ porcentaje }: { porcentaje: number | null }) {
  if (porcentaje === null) return null;
  return (
    <span aria-hidden className="block h-1.5 w-full overflow-hidden rounded-full bg-superficie-2">
      <span className={cn("block h-full rounded-full", porcentaje < 85 ? "bg-falta" : "bg-sec-trazo")} style={{ width: `${Math.max(porcentaje, 2)}%` }} />
    </span>
  );
}

/** Cursos del alumno: una fila por curso con su % y una barra; cada fila abre el historial clase por clase. */
export function ListaCursos({ cursos, hrefCurso }: { cursos: FilaCursoReporte[]; hrefCurso: (cursoId: string) => string }) {
  return (
    <ListaDividida>
      {cursos.map((c) => {
        const porcentaje = porcentajeCurso(c.registros, c.faltas);
        return (
          <li key={c.cursoId}>
            <Link
              href={hrefCurso(c.cursoId)}
              className="group/curso grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 outline-none hover:bg-superficie-2/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:px-5"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium">{c.curso}</span>
                <span className="text-cuerpo-sm text-muted-foreground tabular-nums">{textoClases(c)}</span>
              </span>
              <span className="col-start-1 row-start-2 flex items-center gap-3 sm:col-start-2 sm:row-start-1">
                <BarraAsistencia porcentaje={porcentaje} />
                <span className="w-16 shrink-0 text-right font-semibold whitespace-nowrap tabular-nums">{porcentaje === null ? "—" : textoPorcentaje(porcentaje)}</span>
              </span>
              <ChevronRight className="row-span-2 size-4 text-muted-foreground transition-transform duration-150 group-hover/curso:translate-x-0.5 motion-reduce:transition-none sm:row-span-1" strokeWidth={2} aria-hidden />
            </Link>
          </li>
        );
      })}
    </ListaDividida>
  );
}
