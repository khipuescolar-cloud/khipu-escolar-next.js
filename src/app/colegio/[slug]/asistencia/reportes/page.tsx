import { ArrowLeft, BarChart3, BookOpenCheck, FileSpreadsheet, FileText, PencilLine, School } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ZodError } from "zod";
import { EstadoAsistencia, ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { esFechaReal, fechaCorta, fechaLarga, hora12 } from "@/lib/fechas";
import {
  filtrosDeBusqueda, rangoAnio, rangoEsteMes, textoJustificacion, textoPorcentaje, type FiltrosReporte, type ResumenAlumno,
} from "@/lib/reportes-asistencia";
import { esVistaFamilia } from "@/lib/roles";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { requireFeature } from "@/lib/server/plan";
import {
  detalleCurso, opcionesDeReporte, reporteSegunFiltros, resumenColegio,
  type DetalleCurso, type OpcionesReporte, type ReporteAsistencia, type ReporteColegio,
} from "@/lib/server/reportes-asistencia";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Reportes de asistencia" };

const NUM = "text-right tabular-nums";

type Enlace = Partial<FiltrosReporte> & { cursoId?: string; dia?: string };

function enlace(base: Enlace, cambios: Enlace, ruta = "/asistencia/reportes"): string {
  const f = { ...base, ...cambios };
  const q = new URLSearchParams();
  if (f.salonId) q.set("salon", f.salonId);
  if (f.alumnoId) q.set("alumno", f.alumnoId);
  if (f.cursoId) q.set("curso", f.cursoId);
  if (f.desde) q.set("desde", f.desde);
  if (f.hasta) q.set("hasta", f.hasta);
  if (f.dia) q.set("dia", f.dia);
  return `${ruta}?${q.toString()}`;
}

/** Abre una lista en modo «corregir» (solo dirección; specs/04): `/asistencia?salon&ambito&fecha`. */
function enlaceCorregir(salonId: string, ambito: string, fecha: string): string {
  return `/asistencia?${new URLSearchParams({ salon: salonId, ambito, fecha }).toString()}`;
}

function BotonCorregir({ href, etiqueta }: { href: string; etiqueta: string }) {
  return (
    <Link href={href} aria-label={etiqueta} className={buttonVariants({ variant: "outline", size: "sm" })}>
      <PencilLine className="size-4" strokeWidth={2} aria-hidden /> Corregir
    </Link>
  );
}

export default async function ReportesAsistenciaPage({ params, searchParams }: PageProps<"/colegio/[slug]/asistencia/reportes">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo", "profesor", "apoderado", "alumno"]);
  requireFeature(ctx, "asistencia");
  const hoy = hoyDelColegio(ctx).isoFecha;
  const uno = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const opciones = await opcionesDeReporte(ctx);
  const familia = esVistaFamilia(ctx.rol);
  const veTodo = ctx.rol === "direccion" || ctx.rol === "administrativo";
  const puedeCorregir = ctx.rol === "direccion";

  let filtros: FiltrosReporte | null = null;
  let error: string | null = null;
  try {
    filtros = filtrosDeBusqueda((k) => (k === "alumno" && familia && !uno("alumno") ? opciones.alumnos[0]?.id : uno(k)), hoy);
  } catch (e) {
    if (!(e instanceof ZodError)) throw e;
    error = e.issues[0]?.message ?? "Revisa los filtros.";
  }
  const periodo = opciones.periodos.find((p) => p.inicio <= hoy && hoy <= p.fin) ?? opciones.periodos.filter((p) => p.fin < hoy).at(-1);
  const cursoId = !familia && uno("curso") ? uno("curso")! : null;
  const dia = esFechaReal(uno("dia") ?? undefined) && uno("dia")! <= hoy ? uno("dia")! : hoy;
  const curso = filtros && cursoId && !error ? await cursoODetalle(ctx, { cursoId, desde: filtros.desde, hasta: filtros.hasta }) : null;
  if (curso && "error" in curso) error = curso.error;
  const reporte = filtros && !cursoId && (familia && !filtros.alumnoId ? null : await reporteSegunFiltros(ctx, filtros));
  // Dirección y administrativo: la vista general empieza por la asistencia al colegio de un día (hoy por defecto).
  const delDia = reporte && reporte.tipo === "colegio" && veTodo ? await resumenColegio(ctx, { desde: dia, hasta: dia }) : null;
  const base = filtros ?? { desde: rangoEsteMes(hoy).desde, hasta: hoy };

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Reportes de asistencia"
        descripcion={
          veTodo
            ? "Asistencia al colegio por día y por fechas, por salón y alumno; y faltas a clase por curso."
            : "Porcentaje de asistencia al colegio por alumno, salón o colegio en el rango de fechas que elijas."
        }
        acciones={
          familia || ctx.rol === "profesor" ? (
            <Link href="/asistencia" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> {familia ? "Calendario" : "Pasar lista"}
            </Link>
          ) : undefined
        }
      />

      <Filtros base={base} opciones={opciones} familia={familia} periodo={periodo} hoy={hoy} />
      {error && <Alerta tipo="error">{error}</Alerta>}

      {delDia && <AsistenciaDelDia reporte={delDia} dia={dia} hoy={hoy} filtros={base} puedeCorregir={puedeCorregir} />}

      {curso && !("error" in curso) && filtros && <VistaCurso detalle={curso} filtros={filtros} puedeCorregir={puedeCorregir} />}

      {reporte && filtros && (
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
      )}
      {!error && !reporte && !curso && <EstadoVacio icono={BarChart3} titulo="Aún no hay un alumno para mostrar" descripcion="Cuando tu hijo(a) tenga asistencia registrada, verás aquí su reporte." />}
    </div>
  );
}

function Filtros({ base, opciones, familia, periodo, hoy }: { base: Partial<FiltrosReporte>; opciones: OpcionesReporte; familia: boolean; periodo?: { nombre: string; inicio: string; fin: string }; hoy: string }) {
  const alumnos = familia ? opciones.alumnos : opciones.alumnos.filter((a) => !base.salonId || a.salonId === base.salonId);
  const atajos: { texto: string; desde: string; hasta: string }[] = [
    { texto: "Este mes", ...rangoEsteMes(hoy) },
    ...(periodo ? [{ texto: periodo.nombre, desde: periodo.inicio, hasta: periodo.fin < hoy ? periodo.fin : hoy }] : []),
    { texto: "Año", ...rangoAnio(hoy) },
  ];
  return (
    <section aria-label="Filtros" className="flex flex-col gap-3">
      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        {!familia && (
          <Selector etiqueta="Salón" name="salon" defaultValue={base.salonId ?? ""}>
            <option value="">Todos los salones</option>
            {opciones.salones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Selector>
        )}
        <Selector etiqueta="Alumno" name="alumno" defaultValue={base.alumnoId ?? (familia ? alumnos[0]?.id : "") ?? ""}>
          {!familia && <option value="">Todo el salón</option>}
          {alumnos.map((a) => <option key={a.id} value={a.id}>{a.apellidos}, {a.nombres}</option>)}
        </Selector>
        <Campo etiqueta="Desde" name="desde" type="date" defaultValue={base.desde} max={hoy} />
        <Campo etiqueta="Hasta" name="hasta" type="date" defaultValue={base.hasta} />
        <div className="flex items-center gap-3 sm:col-span-2">
          <Boton type="submit" variante="secundario">Ver reporte</Boton>
        </div>
      </form>
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Atajos:</span>
        {atajos.map((a) => (
          <Link key={a.texto} href={enlace(base, { desde: a.desde, hasta: a.hasta })} className={buttonVariants({ variant: "outline", size: "sm" })}>{a.texto}</Link>
        ))}
      </p>
    </section>
  );
}

function Contenido({ reporte, filtros, familia, puedeCorregir }: { reporte: ReporteAsistencia; filtros: FiltrosReporte; familia: boolean; puedeCorregir: boolean }) {
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

function CabecerasResumen() {
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

function CeldasResumen({ r }: { r: ResumenAlumno }) {
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

function Totales({ resumen, titulo }: { resumen: ResumenAlumno; titulo: string }) {
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

function DetalleAlumno({ reporte, filtros, familia, puedeCorregir }: { reporte: Extract<ReporteAsistencia, { tipo: "alumno" }>; filtros: FiltrosReporte; familia: boolean; puedeCorregir: boolean }) {
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

/** El detalle de un curso, o el mensaje de validación del rango (el error de rango ya se muestra arriba). */
async function cursoODetalle(ctx: Parameters<typeof detalleCurso>[0], entrada: { cursoId: string; desde: string; hasta: string }): Promise<DetalleCurso | { error: string }> {
  try {
    return await detalleCurso(ctx, entrada);
  } catch (e) {
    if (e instanceof ZodError) return { error: e.issues[0]?.message ?? "Revisa los filtros." };
    throw e;
  }
}

/** Asistencia al colegio de un día: cuántos asistieron, faltaron (justificadas o no) y sin registro; luego por salón. */
function AsistenciaDelDia({ reporte, dia, hoy, filtros, puedeCorregir }: { reporte: ReporteColegio; dia: string; hoy: string; filtros: Enlace; puedeCorregir: boolean }) {
  const t = reporte.total;
  const alumnos = reporte.filas.reduce((s, f) => s + f.alumnos, 0);
  const esHabil = t.diasHabiles > 0;
  return (
    <section aria-labelledby="titulo-dia" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-dia" className="flex items-center gap-2 text-titulo-2">
            <School className="size-5 text-primary" strokeWidth={2} aria-hidden /> Asistencia al colegio
          </h2>
          <p className="text-cuerpo-sm text-muted-foreground first-letter:uppercase">{dia === hoy ? `Hoy, ${fechaLarga(dia)}` : fechaLarga(dia)}</p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2">
          {filtros.desde && <input type="hidden" name="desde" value={filtros.desde} />}
          {filtros.hasta && <input type="hidden" name="hasta" value={filtros.hasta} />}
          <Campo etiqueta="Día" name="dia" type="date" defaultValue={dia} max={hoy} />
          <Boton type="submit" variante="secundario">Ver día</Boton>
        </form>
      </div>
      {!esHabil ? (
        <Alerta tipo="aviso">Ese día no es hábil (fin de semana o feriado): no se cuenta asistencia.</Alerta>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="asistencia-del-dia">
            <Cifra titulo="Asistieron" valor={t.llego + t.tarde} detalle={`de ${alumnos} alumnos · ${t.llego} llegó, ${t.tarde} tarde`} estado="llego" />
            <Cifra titulo="Faltaron" valor={t.falta} detalle={`${t.faltasJustificadas} justificadas · ${t.faltasEnRevision} en revisión · ${t.faltasInjustificadas} sin justificar`} estado="falta" />
            <Cifra titulo="Con aviso" valor={t.problema} detalle="Situaciones registradas en la lista del día" estado="problema" />
            <Cifra titulo="Sin registro" valor={t.diasSinRegistro} detalle="Sin escaneo en portería ni lista del día" />
          </ul>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salón</TableHead>
                    <TableHead className={NUM}>Alumnos</TableHead>
                    <TableHead className={NUM}>Asistieron</TableHead>
                    <TableHead className={NUM}>Faltaron</TableHead>
                    <TableHead className={NUM}>Justificadas</TableHead>
                    <TableHead className={NUM}>Sin registro</TableHead>
                    {puedeCorregir && <TableHead><span className="sr-only">Corregir</span></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reporte.filas.map((f) => (
                    <TableRow key={f.salonId}>
                      <TableCell><Link href={enlace({ desde: dia, hasta: dia }, { salonId: f.salonId })} className="enlace font-medium">{f.salon}</Link></TableCell>
                      <TableCell className={NUM}>{f.alumnos}</TableCell>
                      <TableCell className={NUM}>{f.resumen.llego + f.resumen.tarde}</TableCell>
                      <TableCell className={NUM}>{f.resumen.falta}</TableCell>
                      <TableCell className={NUM}>{f.resumen.faltasJustificadas}</TableCell>
                      <TableCell className={NUM}>{f.resumen.diasSinRegistro}</TableCell>
                      {puedeCorregir && (
                        <TableCell className="text-right">
                          <BotonCorregir href={enlaceCorregir(f.salonId, "dia", dia)} etiqueta={`Corregir la asistencia del día de ${f.salon}`} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}

function IconoEstado({ estado }: { estado: "llego" | "falta" | "problema" }) {
  const { Icono } = ESTADOS_ASISTENCIA[estado];
  return <Icono className="size-3.5" strokeWidth={2} aria-hidden />;
}

function Cifra({ titulo, valor, detalle, estado }: { titulo: string; valor: number; detalle: string; estado?: "llego" | "falta" | "problema" }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg border bg-superficie p-4">
      {estado ? (
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta ${ESTADOS_ASISTENCIA[estado].clase}`}>
          <IconoEstado estado={estado} />
          {titulo}
        </span>
      ) : (
        <span className="text-etiqueta text-muted-foreground">{titulo}</span>
      )}
      <strong className="text-titulo-1 tabular-nums">{valor}</strong>
      <span className="text-cuerpo-sm text-muted-foreground tabular-nums">{detalle}</span>
    </li>
  );
}

/** Faltas y tardanzas a clase por salón y curso en el rango (solo si algún nivel tiene asistencia por curso). */
function AsistenciaPorCurso({ reporte, filtros }: { reporte: ReporteColegio; filtros: FiltrosReporte }) {
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
                    <TableCell><Link href={enlace({ desde: filtros.desde, hasta: filtros.hasta }, { cursoId: c.cursoId })} className="enlace font-medium">{c.curso}</Link></TableCell>
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

/** Detalle de un curso: cada falta o tardanza a clase con el ingreso al colegio de ese día y el enlace para corregir. */
function VistaCurso({ detalle, filtros, puedeCorregir }: { detalle: DetalleCurso; filtros: FiltrosReporte; puedeCorregir: boolean }) {
  return (
    <section aria-labelledby="titulo-curso" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="titulo-curso" className="text-titulo-2">{detalle.curso.nombre} · {detalle.salon.nombre}</h2>
        <Link href={enlace({ desde: filtros.desde, hasta: filtros.hasta }, {})} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Volver al colegio
        </Link>
      </div>
      <p className="text-cuerpo-sm text-muted-foreground">
        Faltas y tardanzas a clase del {fechaCorta(detalle.desde)} al {fechaCorta(detalle.hastaEfectivo)}.
      </p>
      {detalle.filas.length === 0 ? (
        <EstadoVacio icono={BookOpenCheck} titulo="Sin faltas ni tardanzas a clase" descripcion="En este rango, todos los registros de este curso son «Llegó» o «Aviso»." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>En clase</TableHead>
                  <TableHead>Ingreso al colegio</TableHead>
                  <TableHead>Justificación</TableHead>
                  {puedeCorregir && <TableHead><span className="sr-only">Corregir</span></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalle.filas.map((f) => (
                  <TableRow key={f.asistenciaId}>
                    <TableCell className="capitalize">{fechaCorta(f.fecha)}</TableCell>
                    <TableCell className="font-medium">{f.alumno}</TableCell>
                    <TableCell><EstadoAsistencia estado={f.estado} hora={hora12(f.hora)} /></TableCell>
                    <TableCell>{f.ingreso ? <EstadoAsistencia estado={f.ingreso.estado} hora={f.ingreso.estado === "falta" ? undefined : hora12(f.ingreso.hora)} /> : <span className="text-muted-foreground">Sin registro</span>}</TableCell>
                    <TableCell>{f.estado === "falta" ? (f.justificacion === "aceptada" ? "Justificada" : f.justificacion === "pendiente" ? "En revisión" : "Sin justificar") : ""}</TableCell>
                    {puedeCorregir && (
                      <TableCell className="text-right">
                        <BotonCorregir href={enlaceCorregir(detalle.salon.id, detalle.curso.id, f.fecha)} etiqueta={`Corregir ${detalle.curso.nombre} del ${fechaCorta(f.fecha)}`} />
                      </TableCell>
                    )}
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
