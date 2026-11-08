import { ArrowRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { EstadoAsistencia, ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { TituloBloque } from "@/components/shell/TituloBloque";
import { CifrasJuntas, ListaDividida } from "@/components/ui/Superficies";
import { fechaLarga, hora12 } from "@/lib/fechas";
import { porcentajeCurso, type PeriodoAsistencia } from "@/lib/periodos-asistencia";
import { textoJustificacion, textoPorcentaje, type DetalleDia } from "@/lib/reportes-asistencia";
import type { ReporteAlumno, ReporteCursos } from "@/lib/server/reportes-asistencia";
import { cn } from "@/lib/utils";
import { CalendarioMeses, type DiaCalendario } from "./CalendarioMeses";
import { BarraAsistencia, textoClases } from "./ListaCursos";

const MAX_PARA_REVISAR = 6;

/** Días del reporte al colegio como entradas del calendario: estado, hora corta y el texto completo. */
export function diasDelDetalle(detalle: DetalleDia[]): DiaCalendario[] {
  return detalle.map((d) => {
    const dia = fechaLarga(d.fecha);
    if (!d.estado) return { fecha: d.fecha, estado: null, texto: `${dia}: ${d.conPermiso ? "con permiso" : "sin registro"}` };
    const justificacion = textoJustificacion(d);
    const hora = d.estado !== "falta" && d.hora ? hora12(d.hora) : null;
    return {
      fecha: d.fecha,
      estado: d.estado,
      hora: d.hora && d.estado !== "falta" ? hora12(d.hora).replace(/\s?[ap]\. m\./, "") : null,
      texto: `${dia}: ${ESTADOS_ASISTENCIA[d.estado].palabra}${hora ? `, ${hora}` : ""}${justificacion ? ` (${justificacion.toLowerCase()})` : ""}`,
    };
  });
}

/**
 * Resumen del periodo: cifras de la asistencia al colegio en una sola superficie, los calendarios de los meses del
 * periodo y, al lado, lo que conviene revisar y los cursos con menos asistencia.
 */
export function ResumenAsistencia({ reporte, cursos, periodo, hoy, tu, hrefCurso, hrefCursos }: {
  reporte: ReporteAlumno;
  cursos: ReporteCursos;
  periodo: PeriodoAsistencia;
  hoy: string;
  /** true: el alumno («Llegaste»); false: la familia («Mateo llegó»). */
  tu: boolean;
  hrefCurso: (cursoId: string) => string;
  hrefCursos: string;
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
    <div className="flex flex-col gap-8">
      <CifrasJuntas como="ul" className="grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]" aria-label={`Asistencia al colegio ${enPeriodo}`}>
        <li className="col-span-3 flex flex-col gap-1 bg-superficie px-5 py-4 lg:col-span-1">
          <span className="text-etiqueta text-muted-foreground">Asistencia al colegio</span>
          <strong className="font-heading text-titulo-1 tabular-nums">{textoPorcentaje(r.porcentaje)}</strong>
          <span className="text-cuerpo-sm text-muted-foreground tabular-nums">
            {r.diasConRegistro === 0 ? "Aún sin días registrados" : `${tu ? "Llegaste" : `${nombre} llegó`} ${presentes} de ${r.diasConRegistro} ${r.diasConRegistro === 1 ? "día" : "días"}`}
          </span>
        </li>
        <Cifra estado="llego" valor={r.llego} detalle="A tiempo" />
        <Cifra estado="tarde" valor={r.tarde} detalle="Pasada la hora" />
        <Cifra
          estado="falta"
          valor={r.falta}
          detalle={r.falta === 0 ? "Ninguna falta" : [r.faltasJustificadas && `${r.faltasJustificadas} justificadas`, r.faltasEnRevision && `${r.faltasEnRevision} en revisión`, r.faltasInjustificadas && `${r.faltasInjustificadas} sin justificar`].filter(Boolean).join(" · ")}
        />
      </CifrasJuntas>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="titulo-dia-a-dia" className="flex min-w-0 flex-col gap-3">
          <TituloBloque id="titulo-dia-a-dia" descripcion="Cada día con su estado y la hora de llegada. Pasa el cursor o toca un día para ver el detalle.">
            Día a día {enPeriodo}
          </TituloBloque>
          <CalendarioMeses dias={diasDelDetalle(reporte.detalle)} desde={periodo.desde} hasta={periodo.hasta} hoy={hoy} vacio="Sin clases" className="md:grid-cols-2" />
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
                  <p className="text-cuerpo-sm text-muted-foreground">Y {paraRevisar.length - MAX_PARA_REVISAR} más en el calendario.</p>
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
                          <span className="min-w-0 truncate font-medium">{c.curso}</span>
                          <span className="shrink-0 font-semibold whitespace-nowrap tabular-nums">{textoPorcentaje(porcentaje)}</span>
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
        </aside>
      </div>
    </div>
  );
}

function Cifra({ estado, valor, detalle }: { estado: "llego" | "tarde" | "falta"; valor: number; detalle: string }) {
  const { Icono, palabra, clase } = ESTADOS_ASISTENCIA[estado];
  return (
    <li className="flex min-w-0 flex-col gap-1.5 bg-superficie px-3 py-4 sm:px-5">
      <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta whitespace-nowrap", clase)}>
        <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {palabra}
      </span>
      <strong className="font-heading text-titulo-1 tabular-nums">{valor}</strong>
      <span className="text-cuerpo-sm text-muted-foreground">{detalle}</span>
    </li>
  );
}
