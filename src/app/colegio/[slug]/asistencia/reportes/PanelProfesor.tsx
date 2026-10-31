import { BookOpen, Check, ChevronRight, CircleAlert, Clock, FileSpreadsheet, FileText, Percent, Table2, UsersRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { GraficoAsistenciaDias } from "@/components/asistencia/GraficoAsistenciaDias";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { fechaCorta } from "@/lib/fechas";
import { textoPorcentaje } from "@/lib/reportes-asistencia";
import type { PanelProfesor as Panel, ReporteSalon } from "@/lib/server/reportes-asistencia";
import { cn } from "@/lib/utils";
import { RUTA_VER } from "./vistas";

// Inicio de «Reportes de asistencia» del profesor (specs/27): primero su salón de tutoría (últimos 7 días, con gráfico),
// luego sus cursos; cada curso abre su historial por rango de fechas con descarga en Excel y PDF.

const NUM = new Intl.NumberFormat("es-PE");

/** Cifra con ícono: el estado lleva ícono + palabra, nunca solo color. */
export function Cifra({ icono: Icono, titulo, valor, detalle, tono }: { icono: LucideIcon; titulo: string; valor: string; detalle?: string; tono?: "llego" | "tarde" | "falta" }) {
  const clase = tono === "llego" ? "bg-llego-fondo text-llego" : tono === "tarde" ? "bg-tarde-fondo text-tarde" : tono === "falta" ? "bg-falta-fondo text-falta" : "bg-primary/10 text-primary";
  return (
    <Tarjeta className="flex flex-col gap-1.5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", clase)}>
          <Icono className="size-4" strokeWidth={2} aria-hidden />
        </span>
        {titulo}
      </p>
      <p className="text-titulo-1 tabular-nums">{valor}</p>
      {detalle && <p className="text-cuerpo-sm text-muted-foreground">{detalle}</p>}
    </Tarjeta>
  );
}

function Tutoria({ r }: { r: ReporteSalon }) {
  const q = `salon=${r.salon.id}&desde=${r.desde}&hasta=${r.hasta}`;
  const t = r.total;
  const dias = r.porDia.length;
  const atender = r.filas
    .filter((f) => f.resumen.falta + f.resumen.tarde > 0)
    .sort((a, b) => b.resumen.falta - a.resumen.falta || b.resumen.tarde - a.resumen.tarde || a.apellidos.localeCompare(b.apellidos))
    .slice(0, 6);
  return (
    <section aria-labelledby={`tutoria-${r.salon.id}`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id={`tutoria-${r.salon.id}`} className="text-titulo-2">Mi salón de tutoría · {r.salon.nombre}</h2>
          <p className="text-cuerpo-sm text-muted-foreground">
            Asistencia al colegio de los últimos 7 días (del {fechaCorta(r.desde)} al {fechaCorta(r.hasta)}) · {NUM.format(r.filas.length)} alumnos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${RUTA_VER}?${q}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Table2 className="size-4" strokeWidth={2} aria-hidden /> Ver detalle
          </Link>
          <a href={`/api/reportes-asistencia/excel?${q}`} className={buttonVariants({ variant: "outline", size: "sm" })} download>
            <FileSpreadsheet className="size-4" strokeWidth={2} aria-hidden /> Excel
          </a>
          <a href={`/api/reportes-asistencia/pdf?${q}`} className={buttonVariants({ variant: "outline", size: "sm" })} download>
            <FileText className="size-4" strokeWidth={2} aria-hidden /> PDF
          </a>
        </div>
      </div>

      {dias === 0 ? (
        <EstadoVacio icono={UsersRound} titulo="No hubo días de clase en estos 7 días" descripcion="Fueron fin de semana o feriados. Usa «Ver detalle» para elegir otras fechas." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra icono={Percent} titulo="Asistencia" valor={textoPorcentaje(t.porcentaje)} detalle={`${NUM.format(dias)} ${dias === 1 ? "día" : "días"} de clase`} />
            <Cifra icono={Check} titulo="Asistieron" valor={NUM.format(t.llego + t.tarde)} detalle="veces que un alumno llegó (a tiempo o tarde)" tono="llego" />
            <Cifra icono={Clock} titulo="Tardanzas" valor={NUM.format(t.tarde)} detalle={`${NUM.format(r.filas.filter((f) => f.resumen.tarde > 0).length)} alumnos llegaron tarde`} tono="tarde" />
            <Cifra
              icono={CircleAlert}
              titulo="Faltas"
              valor={NUM.format(t.falta)}
              detalle={`${NUM.format(t.faltasJustificadas)} justificadas · ${NUM.format(t.faltasEnRevision)} en revisión`}
              tono="falta"
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Tarjeta className="flex min-w-0 flex-col gap-2 lg:col-span-2">
              <h3 className="font-heading text-cuerpo font-semibold">Asistencia por día</h3>
              <GraficoAsistenciaDias datos={r.porDia} titulo={`Asistencia por día de ${r.salon.nombre}`} />
            </Tarjeta>
            <Tarjeta className="flex flex-col gap-3">
              <h3 className="font-heading text-cuerpo font-semibold">Para conversar con la familia</h3>
              {atender.length === 0 ? (
                <p className="text-cuerpo-sm text-muted-foreground">Nadie faltó ni llegó tarde en estos días.</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {atender.map((f) => (
                    <li key={f.alumnoId} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
                      <Link href={`${RUTA_VER}?alumno=${f.alumnoId}&desde=${r.desde}&hasta=${r.hasta}`} className="font-medium enlace">
                        {f.apellidos}, {f.nombres}
                      </Link>
                      <span className="flex flex-wrap gap-2 text-etiqueta">
                        {f.resumen.falta > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-pildora bg-falta-fondo px-2 py-0.5 text-falta">
                            <CircleAlert className="size-3.5" strokeWidth={2} aria-hidden /> {f.resumen.falta} {f.resumen.falta === 1 ? "falta" : "faltas"}
                          </span>
                        )}
                        {f.resumen.tarde > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-pildora bg-tarde-fondo px-2 py-0.5 text-tarde">
                            <Clock className="size-3.5" strokeWidth={2} aria-hidden /> {f.resumen.tarde} {f.resumen.tarde === 1 ? "tardanza" : "tardanzas"}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          </div>
        </>
      )}
    </section>
  );
}

export function PanelProfesor({ panel }: { panel: Panel }) {
  const { tutorias, cursos } = panel;
  if (tutorias.length === 0 && cursos.length === 0) {
    return <EstadoVacio icono={BookOpen} titulo="Aún no tienes salones ni cursos" descripcion="Cuando dirección te asigne una tutoría o un curso, verás aquí su asistencia." />;
  }
  return (
    <div className="flex flex-col gap-10">
      {tutorias.map((r) => <Tutoria key={r.salon.id} r={r} />)}
      {cursos.length > 0 && (
        <section aria-labelledby="mis-cursos" className="flex flex-col gap-3">
          <div>
            <h2 id="mis-cursos" className="text-titulo-2">Mis cursos</h2>
            <p className="text-cuerpo-sm text-muted-foreground">Elige un curso para ver la asistencia de cada clase en las fechas que quieras y descargarla.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((c) => (
              <li key={c.id}>
                {c.porCurso ? (
                  <Link
                    href={`/asistencia/reportes/curso/${c.id}`}
                    className="group flex min-h-16 items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <BookOpen className="size-5" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{c.nombre}</span>
                      <span className="block text-cuerpo-sm text-muted-foreground">{c.salon}</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} aria-hidden />
                  </Link>
                ) : (
                  <div className="flex min-h-16 items-center gap-3 rounded-lg border border-dashed p-4 text-muted-foreground">
                    <BookOpen className="size-5 shrink-0" strokeWidth={2} aria-hidden />
                    <span className="min-w-0">
                      <span className="block font-semibold">{c.nombre} · {c.salon}</span>
                      <span className="block text-cuerpo-sm">En este nivel no se pasa lista por curso.</span>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
