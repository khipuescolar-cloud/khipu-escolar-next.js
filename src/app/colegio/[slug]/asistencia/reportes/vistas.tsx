import { ArrowLeft, BarChart3, BookOpenCheck, FileSpreadsheet, FileText, PencilLine, X } from "lucide-react";
import Link from "next/link";
import { EstadoAsistencia } from "@/components/EstadoAsistencia";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaCorta, fechaLarga } from "@/lib/fechas";
import { rangoAnio, rangoEsteMes, textoJustificacion, textoPorcentaje, type FiltrosReporte, type ResumenAlumno } from "@/lib/reportes-asistencia";
import type { ReporteAsistencia, ReporteColegio } from "@/lib/server/reportes-asistencia";

// Piezas del reporte de asistencia compartidas por la página general y la vista filtrada (`ver/`), specs/27.

export const NUM = "text-right tabular-nums";

export type Enlace = Partial<FiltrosReporte> & { cursoId?: string; dia?: string; vista?: string };

/** Ruta del reporte filtrado (vista propia con tabla o calendario, specs/27). */
export const RUTA_VER = "/asistencia/reportes/ver";

export function enlace(base: Enlace, cambios: Enlace, ruta = RUTA_VER): string {
  const f = { ...base, ...cambios };
  const q = new URLSearchParams();
  if (f.salonId) q.set("salon", f.salonId);
  if (f.alumnoId) q.set("alumno", f.alumnoId);
  if (f.cursoId) q.set("curso", f.cursoId);
  if (f.desde) q.set("desde", f.desde);
  if (f.hasta) q.set("hasta", f.hasta);
  if (f.dia) q.set("dia", f.dia);
  if (f.vista) q.set("vista", f.vista);
  return `${ruta}?${q.toString()}`;
}

/** Abre una lista en modo «corregir» (solo dirección; specs/04): `/asistencia?salon&ambito&fecha`. */
export function enlaceCorregir(salonId: string, ambito: string, fecha: string): string {
  return `/asistencia?${new URLSearchParams({ salon: salonId, ambito, fecha }).toString()}`;
}

export function BotonCorregir({ href, etiqueta }: { href: string; etiqueta: string }) {
  return (
    <Link href={href} aria-label={etiqueta} className={buttonVariants({ variant: "outline", size: "sm" })}>
      <PencilLine className="size-4" strokeWidth={2} aria-hidden /> Corregir
    </Link>
  );
}


/** Reporte del rango elegido: descargas, totales y tabla (colegio, salón o alumno). */
export function ResultadoRango({ reporte, filtros, familia, puedeCorregir }: { reporte: ReporteAsistencia; filtros: FiltrosReporte; familia: boolean; puedeCorregir: boolean }) {
  return (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-cuerpo-sm text-muted-foreground">
              Del {fechaCorta(reporte.desde)} al {fechaCorta(reporte.hasta)}
              {reporte.hastaEfectivo !== reporte.hasta && ` · se cuenta hasta hoy (${fechaCorta(reporte.hastaEfectivo)})`}
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={enlace(filtros, {}, "/api/reportes-asistencia/excel")} className={buttonVariants({ variant: "outline" })}>
                <FileSpreadsheet className="size-4" strokeWidth={2} aria-hidden /> Descargar Excel
              </a>
              <a href={enlace(filtros, {}, "/api/reportes-asistencia/pdf")} className={buttonVariants({ variant: "outline" })}>
                <FileText className="size-4" strokeWidth={2} aria-hidden /> Descargar PDF
              </a>
            </div>
          </div>
          <Contenido reporte={reporte} filtros={filtros} familia={familia} puedeCorregir={puedeCorregir} />
          <p className="text-sm text-muted-foreground">
            Cuenta la asistencia al colegio (portería o lista del día); las listas de curso no cambian el porcentaje. % de asistencia = (llegó + tarde) ÷ días hábiles con registro. Los días hábiles son de lunes a viernes sin feriados; los días sin registro no cuentan en el porcentaje.
          </p>
          {reporte.tipo === "colegio" && reporte.cursos && <AsistenciaPorCurso reporte={reporte} filtros={filtros} />}
        </>
  );
}


export function Contenido({ reporte, filtros, familia, puedeCorregir }: { reporte: ReporteAsistencia; filtros: FiltrosReporte; familia: boolean; puedeCorregir: boolean }) {
  if (reporte.tipo === "alumno") return <DetalleAlumno reporte={reporte} filtros={filtros} familia={familia} puedeCorregir={puedeCorregir} />;
  const total = reporte.total;
  const filas = reporte.tipo === "salon"
    ? reporte.filas.map((f) => ({ clave: f.alumnoId, nombre: `${f.apellidos}, ${f.nombres}`, href: enlace(filtros, { alumnoId: f.alumnoId, salonId: reporte.salon.id }), resumen: f.resumen, extra: null as number | null }))
    : reporte.filas.map((f) => ({ clave: f.salonId, nombre: f.salon, href: enlace({ desde: filtros.desde, hasta: filtros.hasta }, { salonId: f.salonId }), resumen: f.resumen, extra: f.alumnos }));
  return (
    <>
      {reporte.tipo === "colegio" && <h2 className="text-titulo-2">Asistencia al colegio en el rango</h2>}
      <Totales resumen={total} titulo={reporte.tipo === "salon" ? `Salón ${reporte.salon.nombre}` : "Todo el colegio"} />
      {filas.length === 0 ? (
        <EstadoVacio icono={BarChart3} titulo="No hay alumnos para este reporte" descripcion="Cuando haya alumnos activos con asistencia, aparecerán aquí." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{reporte.tipo === "salon" ? "Alumno" : "Salón"}</TableHead>
                  {reporte.tipo === "colegio" && <TableHead className={NUM}>Alumnos</TableHead>}
                  <CabecerasResumen />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <TableRow key={f.clave}>
                    <TableCell><Link href={f.href} className="enlace font-medium">{f.nombre}</Link></TableCell>
                    {reporte.tipo === "colegio" && <TableCell className={NUM}>{f.extra}</TableCell>}
                    <CeldasResumen r={f.resumen} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export function CabecerasResumen() {
  return (
    <>
      <TableHead className={NUM}>Llegó</TableHead>
      <TableHead className={NUM}>Tarde</TableHead>
      <TableHead className={NUM}>No llegó</TableHead>
      <TableHead className={NUM}>Aviso</TableHead>
      <TableHead className={NUM}>Justificadas</TableHead>
      <TableHead className={NUM}>En revisión</TableHead>
      <TableHead className={NUM}>Sin justificar</TableHead>
      <TableHead className={NUM}>Sin registro</TableHead>
      <TableHead className={NUM}>% asistencia</TableHead>
    </>
  );
}

export function CeldasResumen({ r }: { r: ResumenAlumno }) {
  return (
    <>
      <TableCell className={NUM}>{r.llego}</TableCell>
      <TableCell className={NUM}>{r.tarde}</TableCell>
      <TableCell className={NUM}>{r.falta}</TableCell>
      <TableCell className={NUM}>{r.problema}</TableCell>
      <TableCell className={NUM}>{r.faltasJustificadas}</TableCell>
      <TableCell className={NUM}>{r.faltasEnRevision}</TableCell>
      <TableCell className={NUM}>{r.faltasInjustificadas}</TableCell>
      <TableCell className={NUM}>{r.diasSinRegistro}</TableCell>
      <TableCell className={`${NUM} font-semibold`}>{textoPorcentaje(r.porcentaje)}</TableCell>
    </>
  );
}

export function Totales({ resumen, titulo }: { resumen: ResumenAlumno; titulo: string }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Asistencia · {titulo}</p>
          <p className="text-titulo-1 tabular-nums">{textoPorcentaje(resumen.porcentaje)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{resumen.llego + resumen.tarde} presencias de {resumen.diasConRegistro} días con registro</p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <li className="flex items-center gap-1.5 text-sm"><EstadoAsistencia estado="llego" /> <strong className="tabular-nums">{resumen.llego}</strong></li>
          <li className="flex items-center gap-1.5 text-sm"><EstadoAsistencia estado="tarde" /> <strong className="tabular-nums">{resumen.tarde}</strong></li>
          <li className="flex items-center gap-1.5 text-sm"><EstadoAsistencia estado="falta" /> <strong className="tabular-nums">{resumen.falta}</strong></li>
          <li className="flex items-center gap-1.5 text-sm"><EstadoAsistencia estado="problema" /> <strong className="tabular-nums">{resumen.problema}</strong></li>
        </ul>
        <p className="text-sm text-muted-foreground tabular-nums">
          Faltas justificadas: <strong className="text-foreground">{resumen.faltasJustificadas}</strong> · en revisión: <strong className="text-foreground">{resumen.faltasEnRevision}</strong> · sin justificar: <strong className="text-foreground">{resumen.faltasInjustificadas}</strong> · días sin registro: <strong className="text-foreground">{resumen.diasSinRegistro}</strong>
        </p>
      </CardContent>
    </Card>
  );
}

export function DetalleAlumno({ reporte, filtros, familia, puedeCorregir }: { reporte: Extract<ReporteAsistencia, { tipo: "alumno" }>; filtros: FiltrosReporte; familia: boolean; puedeCorregir: boolean }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-titulo-2">{reporte.alumno.apellidos}, {reporte.alumno.nombres} · {reporte.alumno.salon}</h2>
        {!familia && (
          <Link href={enlace(filtros, { alumnoId: undefined, salonId: reporte.alumno.salonId })} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Volver al salón
          </Link>
        )}
      </div>
      <Totales resumen={reporte.resumen} titulo={reporte.alumno.nombres} />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Día</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className={NUM}>Hora</TableHead>
                <TableHead>Justificación</TableHead>
                {puedeCorregir && <TableHead><span className="sr-only">Corregir</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporte.detalle.map((d) => (
                <TableRow key={d.fecha}>
                  <TableCell className="capitalize">{fechaLarga(d.fecha)}</TableCell>
                  <TableCell>{d.estado ? <EstadoAsistencia estado={d.estado} /> : <span className="text-muted-foreground">Sin registro</span>}</TableCell>
                  <TableCell className={NUM}>{d.hora ?? ""}</TableCell>
                  <TableCell>{textoJustificacion(d)}</TableCell>
                  {puedeCorregir && (
                    <TableCell className="text-right">
                      <BotonCorregir href={enlaceCorregir(reporte.alumno.salonId, "dia", d.fecha)} etiqueta={`Corregir la asistencia del día del ${fechaCorta(d.fecha)}`} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {reporte.detalle.length === 0 && <p className="p-4 text-sm text-muted-foreground">No hay días hábiles en este rango.</p>}
        </CardContent>
      </Card>
    </>
  );
}


/** Faltas y tardanzas a clase por salón y curso en el rango (solo si algún nivel tiene asistencia por curso). */
export function AsistenciaPorCurso({ reporte, filtros }: { reporte: ReporteColegio; filtros: FiltrosReporte }) {
  const cursos = reporte.cursos ?? [];
  return (
    <section aria-labelledby="titulo-cursos" className="flex flex-col gap-3">
      <div>
        <h2 id="titulo-cursos" className="flex items-center gap-2 text-titulo-2">
          <BookOpenCheck className="size-5 text-primary" strokeWidth={2} aria-hidden /> Asistencia por curso
        </h2>
        <p className="text-cuerpo-sm text-muted-foreground">Faltas a clase en el rango. «Ingresó pero faltó»: el alumno entró al colegio ese día y no estuvo en la clase.</p>
      </div>
      {cursos.length === 0 ? (
        <EstadoVacio icono={BookOpenCheck} titulo="Aún no hay listas de curso en este rango" descripcion="Cuando los profesores pasen lista en sus cursos, verás aquí las faltas a clase." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salón</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead className={NUM}>Registros</TableHead>
                  <TableHead className={NUM}>Faltas a clase</TableHead>
                  <TableHead className={NUM}>Ingresó pero faltó</TableHead>
                  <TableHead className={NUM}>Tardanzas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cursos.map((c) => (
                  <TableRow key={c.cursoId}>
                    <TableCell>{c.salon}</TableCell>
                    <TableCell><Link href={enlace({ desde: filtros.desde, hasta: filtros.hasta }, { cursoId: c.cursoId }, "/asistencia/reportes")} className="enlace font-medium">{c.curso}</Link></TableCell>
                    <TableCell className={NUM}>{c.registros}</TableCell>
                    <TableCell className={NUM}>{c.faltas}</TableCell>
                    <TableCell className={`${NUM} font-semibold`}>{c.faltasConIngreso}</TableCell>
                    <TableCell className={NUM}>{c.tardanzas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

export function atajosDeFecha(hoy: string, periodo?: { nombre: string; inicio: string; fin: string }) {
  return [
    { texto: "Este mes", ...rangoEsteMes(hoy) },
    ...(periodo ? [{ texto: periodo.nombre, desde: periodo.inicio, hasta: periodo.fin < hoy ? periodo.fin : hoy }] : []),
    { texto: "Año", ...rangoAnio(hoy) },
  ];
}

/** Lo que eligió en «Filtrar reporte», con el atajo para quitarlo. */
export function FiltrosActivos({ partes }: { partes: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
      {partes.map((p) => (
        <span key={p} className="rounded-pildora border bg-superficie px-3 py-1 text-sm">{p}</span>
      ))}
      <Link href="/asistencia/reportes" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <X className="size-4" strokeWidth={2} aria-hidden /> Quitar filtros
      </Link>
    </div>
  );
}
