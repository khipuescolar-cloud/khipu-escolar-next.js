import { ArrowLeft, BarChart3, FileSpreadsheet, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ZodError } from "zod";
import { EstadoAsistencia } from "@/components/EstadoAsistencia";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaCorta, fechaLarga } from "@/lib/fechas";
import { filtrosDeBusqueda, rangoAnio, rangoEsteMes, textoPorcentaje, type FiltrosReporte, type ResumenAlumno } from "@/lib/reportes-asistencia";
import { esVistaFamilia } from "@/lib/roles";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { requireFeature } from "@/lib/server/plan";
import { opcionesDeReporte, reporteSegunFiltros, type OpcionesReporte, type ReporteAsistencia } from "@/lib/server/reportes-asistencia";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Reportes de asistencia" };

const NUM = "text-right tabular-nums";

function enlace(base: Partial<FiltrosReporte>, cambios: Partial<FiltrosReporte>, ruta = "/asistencia/reportes"): string {
  const f = { ...base, ...cambios };
  const q = new URLSearchParams();
  if (f.salonId) q.set("salon", f.salonId);
  if (f.alumnoId) q.set("alumno", f.alumnoId);
  if (f.desde) q.set("desde", f.desde);
  if (f.hasta) q.set("hasta", f.hasta);
  return `${ruta}?${q.toString()}`;
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

  let filtros: FiltrosReporte | null = null;
  let error: string | null = null;
  try {
    filtros = filtrosDeBusqueda((k) => (k === "alumno" && familia && !uno("alumno") ? opciones.alumnos[0]?.id : uno(k)), hoy);
  } catch (e) {
    if (!(e instanceof ZodError)) throw e;
    error = e.issues[0]?.message ?? "Revisa los filtros.";
  }
  const periodo = opciones.periodos.find((p) => p.inicio <= hoy && hoy <= p.fin) ?? opciones.periodos.filter((p) => p.fin < hoy).at(-1);
  const reporte = filtros && (familia && !filtros.alumnoId ? null : await reporteSegunFiltros(ctx, filtros));
  const base = filtros ?? { desde: rangoEsteMes(hoy).desde, hasta: hoy };

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Reportes de asistencia"
        descripcion="Porcentaje de asistencia por alumno, salón o colegio en el rango de fechas que elijas."
        acciones={
          <Link href="/asistencia" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> {familia ? "Calendario" : "Pasar lista"}
          </Link>
        }
      />

      <Filtros base={base} opciones={opciones} familia={familia} periodo={periodo} hoy={hoy} />
      {error && <Alerta tipo="error">{error}</Alerta>}

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
          <Contenido reporte={reporte} filtros={filtros} familia={familia} />
          <p className="text-sm text-muted-foreground">
            % de asistencia = (llegó + tarde) ÷ días hábiles con registro. Los días hábiles son de lunes a viernes sin feriados; los días sin registro no cuentan en el porcentaje.
          </p>
        </>
      )}
      {!error && !reporte && <EstadoVacio icono={BarChart3} titulo="Aún no hay un alumno para mostrar" descripcion="Cuando tu hijo(a) tenga asistencia registrada, verás aquí su reporte." />}
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

function Contenido({ reporte, filtros, familia }: { reporte: ReporteAsistencia; filtros: FiltrosReporte; familia: boolean }) {
  if (reporte.tipo === "alumno") return <DetalleAlumno reporte={reporte} filtros={filtros} familia={familia} />;
  const total = reporte.total;
  const filas = reporte.tipo === "salon"
    ? reporte.filas.map((f) => ({ clave: f.alumnoId, nombre: `${f.apellidos}, ${f.nombres}`, href: enlace(filtros, { alumnoId: f.alumnoId, salonId: reporte.salon.id }), resumen: f.resumen, extra: null as number | null }))
    : reporte.filas.map((f) => ({ clave: f.salonId, nombre: f.salon, href: enlace({ desde: filtros.desde, hasta: filtros.hasta }, { salonId: f.salonId }), resumen: f.resumen, extra: f.alumnos }));
  return (
    <>
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
          Faltas justificadas: <strong className="text-foreground">{resumen.faltasJustificadas}</strong> · sin justificar: <strong className="text-foreground">{resumen.faltasInjustificadas}</strong> · días sin registro: <strong className="text-foreground">{resumen.diasSinRegistro}</strong>
        </p>
      </CardContent>
    </Card>
  );
}

function DetalleAlumno({ reporte, filtros, familia }: { reporte: Extract<ReporteAsistencia, { tipo: "alumno" }>; filtros: FiltrosReporte; familia: boolean }) {
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporte.detalle.map((d) => (
                <TableRow key={d.fecha}>
                  <TableCell className="capitalize">{fechaLarga(d.fecha)}</TableCell>
                  <TableCell>{d.estado ? <EstadoAsistencia estado={d.estado} /> : <span className="text-muted-foreground">Sin registro</span>}</TableCell>
                  <TableCell className={NUM}>{d.hora ?? ""}</TableCell>
                  <TableCell>{d.estado === "falta" ? (d.justificada ? "Justificada" : "Sin justificar") : ""}</TableCell>
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
