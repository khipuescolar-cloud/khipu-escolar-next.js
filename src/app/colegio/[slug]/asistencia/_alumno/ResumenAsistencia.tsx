import { ArrowRight, CircleCheck, FileText } from "lucide-react";
import Link from "next/link";
import { EstadoAsistencia } from "@/components/EstadoAsistencia";
import { TituloBloque } from "@/components/shell/TituloBloque";
import { ListaDividida } from "@/components/ui/Superficies";
import { buttonVariants } from "@/components/ui/button";
import { fechaLarga, hora12 } from "@/lib/fechas";
import { porcentajeCurso, type PeriodoAsistencia } from "@/lib/periodos-asistencia";
import { textoJustificacion, textoPorcentaje } from "@/lib/reportes-asistencia";
import type { ReporteAlumno, ReporteCursos } from "@/lib/server/reportes-asistencia";
import { CuerdaPeriodo } from "./CuerdaPeriodo";
import { BarraAsistencia, textoClases } from "./ListaCursos";

const MAX_PARA_REVISAR = 6;

/**
 * Resumen del periodo: una frase con la asistencia al colegio, el periodo como khipu (un nudo por día) y, al lado, lo
 * que conviene revisar (faltas, tardanzas y avisos) y los cursos con menos asistencia.
 */
export function ResumenAsistencia({ reporte, cursos, periodo, hoy, tu, hrefCurso, hrefCursos, hrefPdf }: {
  reporte: ReporteAlumno;
  cursos: ReporteCursos;
  periodo: PeriodoAsistencia;
  hoy: string;
  /** true: el alumno («Llegaste»); false: la familia («Lucas llegó»). */
  tu: boolean;
  hrefCurso: (cursoId: string) => string;
  hrefCursos: string;
  hrefPdf: string;
}) {
  const r = reporte.resumen;
  const presentes = r.llego + r.tarde;
  const nombre = reporte.alumno.nombres.split(" ")[0];
  const enPeriodo = periodo.clave === "anio" ? "en lo que va del año" : `en el ${periodo.nombre}`;
  const paraRevisar = reporte.detalle.filter((d) => d.estado === "falta" || d.estado === "tarde" || d.estado === "problema").reverse();
  const conClases = cursos.filas.filter((c) => c.registros > 0);
  const menosAsistencia = [...conClases]
    .sort((a, b) => (porcentajeCurso(a.registros, a.faltas) ?? 100) - (porcentajeCurso(b.registros, b.faltas) ?? 100))
    .slice(0, 3);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="titulo-resumen" className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 id="titulo-resumen" className="font-heading text-titulo-2 text-balance">
            {r.diasConRegistro === 0
              ? `Aún no hay asistencia registrada ${enPeriodo}`
              : `${tu ? "Llegaste" : `${nombre} llegó`} al colegio ${presentes} de ${r.diasConRegistro} ${r.diasConRegistro === 1 ? "día" : "días"}`}
          </h2>
          {r.diasConRegistro > 0 && (
            <p className="text-muted-foreground">
              <strong className="font-semibold text-foreground tabular-nums">{textoPorcentaje(r.porcentaje)}</strong> de asistencia {enPeriodo}
              {r.faltasInjustificadas > 0 && <> · <span className="tabular-nums">{r.faltasInjustificadas}</span> {r.faltasInjustificadas === 1 ? "falta sin justificar" : "faltas sin justificar"}</>}
            </p>
          )}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Días por estado">
          {(["llego", "tarde", "falta", "problema"] as const).map((e) => (
            <li key={e} className="flex items-center gap-1.5 text-sm">
              <EstadoAsistencia estado={e} /> <strong className="tabular-nums">{r[e]}</strong>
            </li>
          ))}
          {r.diasSinRegistro > 0 && (
            <li className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span aria-hidden className="size-4 rounded-full border border-dashed border-muted-foreground/50" /> Sin registro <strong className="text-foreground tabular-nums">{r.diasSinRegistro}</strong>
            </li>
          )}
        </ul>

        <CuerdaPeriodo detalle={reporte.detalle} hoy={hoy} titulo={`Asistencia al colegio día por día ${enPeriodo}`} />
        <p className="text-cuerpo-sm text-muted-foreground">
          Cada cuerda es una semana y cada nudo, un día de clase. Pasa el cursor o toca un nudo para ver la hora.
        </p>
      </section>

      <aside className="flex flex-col gap-10" aria-label="Detalle del periodo">
        <section aria-labelledby="titulo-revisar" className="flex flex-col gap-3">
          <TituloBloque id="titulo-revisar">Para revisar</TituloBloque>
          {paraRevisar.length === 0 ? (
            <p className="flex items-center gap-2 text-cuerpo-sm text-muted-foreground">
              <CircleCheck className="size-4 text-llego" strokeWidth={2} aria-hidden /> Sin faltas ni tardanzas {enPeriodo}.
            </p>
          ) : (
            <>
              <ListaDividida>
                {paraRevisar.slice(0, MAX_PARA_REVISAR).map((d) => (
                  <li key={d.fecha} className="flex flex-col gap-1.5 px-4 py-3">
                    <span className="text-cuerpo-sm font-medium first-letter:uppercase">{fechaLarga(d.fecha)}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <EstadoAsistencia estado={d.estado!} hora={d.estado !== "falta" && d.hora ? hora12(d.hora) : undefined} />
                      {textoJustificacion(d) && <span className="text-cuerpo-sm text-muted-foreground">{textoJustificacion(d)}</span>}
                    </span>
                  </li>
                ))}
              </ListaDividida>
              {paraRevisar.length > MAX_PARA_REVISAR && (
                <p className="text-cuerpo-sm text-muted-foreground">Y {paraRevisar.length - MAX_PARA_REVISAR} más en la cuerda del periodo.</p>
              )}
            </>
          )}
        </section>

        {conClases.length > 0 && (
          <section aria-labelledby="titulo-menos" className="flex flex-col gap-3">
            <TituloBloque id="titulo-menos">Cursos con menos asistencia</TituloBloque>
            <ListaDividida>
              {menosAsistencia.map((c) => {
                const porcentaje = porcentajeCurso(c.registros, c.faltas);
                return (
                  <li key={c.cursoId}>
                    <Link href={hrefCurso(c.cursoId)} className="flex flex-col gap-1.5 px-4 py-3 outline-none hover:bg-superficie-2/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-medium">{c.curso}</span>
                        <span className="font-semibold tabular-nums">{textoPorcentaje(porcentaje)}</span>
                      </span>
                      <BarraAsistencia porcentaje={porcentaje} />
                      <span className="text-cuerpo-sm text-muted-foreground tabular-nums">{textoClases(c)}</span>
                    </Link>
                  </li>
                );
              })}
            </ListaDividida>
            <Link href={hrefCursos} className="inline-flex min-h-10 w-fit items-center gap-1.5 text-cuerpo-sm enlace">
              Ver {tu ? "todos tus cursos" : "todos los cursos"} <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </Link>
          </section>
        )}

        <a href={hrefPdf} className={buttonVariants({ variant: "outline", className: "w-fit" })}>
          <FileText className="size-4" strokeWidth={2} aria-hidden /> Descargar PDF del periodo
        </a>
      </aside>
    </div>
  );
}
