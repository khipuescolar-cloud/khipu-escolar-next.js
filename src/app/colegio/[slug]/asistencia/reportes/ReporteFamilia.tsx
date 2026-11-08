import { ArrowLeft, BarChart3, BookOpenCheck, School } from "lucide-react";
import Link from "next/link";
import { ZodError } from "zod";
import { EstadoAsistencia } from "@/components/EstadoAsistencia";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { PestanasSegmento } from "@/components/shell/PestanasPagina";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaCorta, fechaLarga, hora12 } from "@/lib/fechas";
import { filtrosDeBusqueda, rangoAnio, rangoEsteMes, textoPorcentaje, type FiltrosReporte } from "@/lib/reportes-asistencia";
import { hoyDelColegio } from "@/lib/server/asistencia";
import {
  historialCursoAlumno, opcionesDeReporte, reporteAlumno, reporteCursos, type HistorialCursoAlumno, type ReporteAlumno, type ReporteCursos,
} from "@/lib/server/reportes-asistencia";
import type { TenantContext } from "@/lib/server/tenant";
import { atajosDeFecha, ResultadoRango, VistaCursos } from "./vistas";

export type VistaReporteFamilia = "colegio" | "cursos";

/**
 * Reporte de asistencia de la familia y del alumno (specs/27): rango de fechas, pestañas «Al colegio» (porcentaje por
 * días, portería o lista del día) y «Por curso» (listas de cada clase). `ruta`: página donde vive (el alumno lo ve en
 * «Mi asistencia», la familia en «Reporte de asistencia»). `conservar`: parámetros de la página que no son del reporte (p. ej. `mes`).
 */
export async function ReporteFamilia({ ctx, ruta, parametro, conservar = {} }: {
  ctx: TenantContext;
  ruta: string;
  parametro: (clave: string) => string | null;
  conservar?: Record<string, string | null>;
}) {
  const hoy = hoyDelColegio(ctx).isoFecha;
  const opciones = await opcionesDeReporte(ctx);
  const vista: VistaReporteFamilia = parametro("vista") === "cursos" ? "cursos" : "colegio";
  // Historial de un curso (`curso`): sin fechas elegidas, desde el inicio de clases del año (primer periodo) hasta hoy.
  const cursoId = vista === "cursos" ? parametro("curso") : null;
  const inicioClases = opciones.periodos[0]?.inicio ?? rangoAnio(hoy).desde;
  let filtros: FiltrosReporte | null = null;
  let error: string | null = null;
  try {
    filtros = filtrosDeBusqueda((k) => {
      if (k === "alumno") return parametro("alumno") ?? opciones.alumnos[0]?.id ?? null;
      if (k === "curso") return null;
      if (k === "desde" && cursoId && !parametro("desde")) return inicioClases <= hoy ? inicioClases : rangoAnio(hoy).desde;
      return parametro(k);
    }, hoy);
  } catch (e) {
    if (!(e instanceof ZodError)) throw e;
    error = e.issues[0]?.message ?? "Revisa los filtros.";
  }
  const base = filtros ?? { ...rangoEsteMes(hoy), alumnoId: opciones.alumnos[0]?.id };
  const periodo = opciones.periodos.find((p) => p.inicio <= hoy && hoy <= p.fin) ?? opciones.periodos.filter((p) => p.fin < hoy).at(-1);
  const atajos = atajosDeFecha(hoy, periodo);

  type Cambios = Partial<{ alumno: string; desde: string | null; hasta: string | null; vista: VistaReporteFamilia; curso: string | null }>;
  const href = (cambios: Cambios) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(conservar)) if (v) q.set(k, v);
    const f: Cambios = { alumno: base.alumnoId, desde: base.desde, hasta: base.hasta, vista, curso: cursoId, ...cambios };
    if (f.alumno) q.set("alumno", f.alumno);
    if (f.desde) q.set("desde", f.desde);
    if (f.hasta) q.set("hasta", f.hasta);
    if (f.vista === "cursos") q.set("vista", "cursos");
    if (f.vista === "cursos" && f.curso) q.set("curso", f.curso);
    return `${ruta}?${q.toString()}#reporte`;
  };

  let reporte: ReporteAlumno | ReporteCursos | HistorialCursoAlumno | null = null;
  if (filtros?.alumnoId && !error) {
    const rango = { alumnoId: filtros.alumnoId, desde: filtros.desde, hasta: filtros.hasta };
    reporte = cursoId
      ? await historialCursoAlumno(ctx, { ...rango, cursoId })
      : vista === "cursos" ? await reporteCursos(ctx, rango) : await reporteAlumno(ctx, rango);
  }

  return (
    <section id="reporte" aria-labelledby="titulo-reporte" data-seccion="dia" className="flex scroll-mt-6 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-reporte" className="flex items-center gap-2 text-titulo-2">
            <BarChart3 className="size-5 text-sec-trazo" strokeWidth={2} aria-hidden /> Reporte de asistencia
          </h2>
          <p className="text-cuerpo-sm text-muted-foreground">Elige las fechas y mira la asistencia al colegio o la de cada curso.</p>
        </div>
        <PestanasSegmento
          etiqueta="Tipo de reporte"
          scroll={false}
          items={[
            { href: href({ vista: "colegio", curso: null }), texto: "Al colegio", activo: vista === "colegio", icono: <School className="size-4" strokeWidth={2} aria-hidden /> },
            { href: href({ vista: "cursos", curso: null }), texto: "Por curso", activo: vista === "cursos", icono: <BookOpenCheck className="size-4" strokeWidth={2} aria-hidden /> },
          ]}
        />
      </div>

      {/* key: los atajos navegan sin volver a montar la página; así los campos muestran las fechas nuevas. */}
      <form key={`${base.alumnoId ?? ""}|${base.desde}|${base.hasta}`} method="get" action={`${ruta}#reporte`} className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        {Object.entries(conservar).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
        {vista === "cursos" && <input type="hidden" name="vista" value="cursos" />}
        {cursoId && <input type="hidden" name="curso" value={cursoId} />}
        {opciones.alumnos.length > 1 ? (
          <Selector etiqueta="Alumno" name="alumno" defaultValue={base.alumnoId ?? ""}>
            {opciones.alumnos.map((a) => <option key={a.id} value={a.id}>{a.apellidos}, {a.nombres}</option>)}
          </Selector>
        ) : (
          base.alumnoId && <input type="hidden" name="alumno" value={base.alumnoId} />
        )}
        <Campo etiqueta="Desde" name="desde" type="date" defaultValue={base.desde} max={hoy} />
        <Campo etiqueta="Hasta" name="hasta" type="date" defaultValue={base.hasta} />
        <div className="flex items-center gap-3 sm:col-span-2">
          <Boton type="submit" variante="secundario">Ver reporte</Boton>
        </div>
      </form>
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Atajos:</span>
        {atajos.map((a) => (
          <Link key={a.texto} href={href({ desde: a.desde, hasta: a.hasta })} scroll={false} className={buttonVariants({ variant: "outline", size: "sm" })}>{a.texto}</Link>
        ))}
      </p>

      {error && <Alerta tipo="error">{error}</Alerta>}
      {!error && !reporte && <EstadoVacio icono={BarChart3} titulo="Aún no hay un alumno para mostrar" descripcion="Cuando el colegio vincule la ficha del alumno, verás aquí su reporte." />}
      {reporte?.tipo === "alumno" && filtros && <ResultadoRango reporte={reporte} filtros={filtros} familia puedeCorregir={false} />}
      {reporte?.tipo === "cursos" && <VistaCursos reporte={reporte} familia enlaceCurso={(id) => href({ curso: id, desde: null })} />}
      {reporte?.tipo === "curso-alumno" && <HistorialCurso historial={reporte} volver={href({ curso: null })} desdeInicio={!parametro("desde")} />}
    </section>
  );
}

const JUSTIFICACION: Record<string, string> = { aceptada: "Justificada", pendiente: "En revisión", rechazada: "Sin justificar" };

/** Historial de un alumno en un curso: resumen y cada clase con su estado (ícono + palabra), hora y justificación. */
function HistorialCurso({ historial, volver, desdeInicio }: { historial: HistorialCursoAlumno; volver: string; desdeInicio: boolean }) {
  const { resumen: r } = historial;
  return (
    <section aria-labelledby="titulo-historial-curso" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="titulo-historial-curso" className="text-titulo-2">{historial.curso.nombre}</h3>
          <p className="text-cuerpo-sm text-muted-foreground">
            {historial.alumno.nombres} {historial.alumno.apellidos} · {historial.alumno.salon}
            {historial.curso.profesor && ` · Profesor(a): ${historial.curso.profesor}`}
          </p>
        </div>
        <Link href={volver} scroll={false} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Todos los cursos
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[14px] border border-borde-sutil bg-superficie p-5">
        <div>
          <p className="text-sm text-muted-foreground">
            {desdeInicio ? "Desde el inicio de clases" : `Del ${fechaCorta(historial.desde)}`} al {fechaCorta(historial.hastaEfectivo)}
          </p>
          <p className="text-titulo-1 tabular-nums">{textoPorcentaje(r.porcentaje)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{r.clases === 1 ? "1 clase con lista" : `${r.clases} clases con lista`}</p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Clases por estado">
          <li className="flex items-center gap-1.5 text-sm"><EstadoAsistencia estado="llego" /> <strong className="tabular-nums">{r.llego}</strong></li>
          <li className="flex items-center gap-1.5 text-sm"><EstadoAsistencia estado="tarde" /> <strong className="tabular-nums">{r.tarde}</strong></li>
          <li className="flex items-center gap-1.5 text-sm"><EstadoAsistencia estado="falta" /> <strong className="tabular-nums">{r.falta}</strong></li>
          <li className="flex items-center gap-1.5 text-sm"><EstadoAsistencia estado="problema" /> <strong className="tabular-nums">{r.problema}</strong></li>
        </ul>
      </div>
      {historial.clases.length === 0 ? (
        <EstadoVacio icono={BookOpenCheck} titulo="Aún no hay clases con lista en estas fechas" descripcion="Cuando el profesor pase lista en este curso, verás aquí cada clase." />
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-borde-sutil bg-superficie">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clase</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Hora</TableHead>
                <TableHead>Observación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial.clases.map((c) => (
                <TableRow key={`${c.fecha}-${c.hora}`}>
                  <TableCell className="first-letter:uppercase">{fechaLarga(c.fecha)}</TableCell>
                  <TableCell><EstadoAsistencia estado={c.estado} /></TableCell>
                  <TableCell className="text-right tabular-nums">{c.estado === "falta" ? "" : hora12(c.hora)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[c.estado === "falta" ? JUSTIFICACION[c.justificacion ?? "rechazada"] : null, c.nota].filter(Boolean).join(" · ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-sm text-muted-foreground">La hora es la de la lista de esa clase. «Tarde»: llegó después de empezada la clase. Cambia las fechas arriba para ver otro periodo.</p>
    </section>
  );
}
