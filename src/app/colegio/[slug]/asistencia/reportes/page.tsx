import { ArrowLeft, BookOpenCheck, School } from "lucide-react";
import { CifrasJuntas } from "@/components/ui/Superficies";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { EstadoAsistencia, ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { esFechaReal, fechaCorta, fechaLarga, hora12 } from "@/lib/fechas";
import {
  filtrosDeBusqueda, rangoEsteMes, type FiltrosReporte,
} from "@/lib/reportes-asistencia";
import { esVistaFamilia } from "@/lib/roles";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { requireFeature } from "@/lib/server/plan";
import {
  detalleCurso, opcionesDeReporte, panelReportesProfesor, reporteSegunFiltros, resumenColegio,
  type DetalleCurso, type ReporteColegio,
} from "@/lib/server/reportes-asistencia";
import { requireTenantContext } from "@/lib/server/tenant";
import { FiltroReporte } from "./FiltroReporte";
import { PanelProfesor } from "./PanelProfesor";
import { ReporteFamilia } from "./ReporteFamilia";
import { atajosDeFecha, BotonCorregir, enlace, enlaceCorregir, NUM, ResultadoRango, RUTA_VER } from "./vistas";

const RUTA_GENERAL = "/asistencia/reportes";

export const metadata: Metadata = { title: "Reportes de asistencia" };

export default async function ReportesAsistenciaPage({ params, searchParams }: PageProps<"/colegio/[slug]/asistencia/reportes">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo", "profesor", "apoderado", "alumno"]);
  requireFeature(ctx, "asistencia");
  const hoy = hoyDelColegio(ctx).isoFecha;
  const uno = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const familia = esVistaFamilia(ctx.rol);
  // El alumno ve su reporte dentro de «Mi asistencia», junto a su llegada al colegio (specs/27).
  if (ctx.rol === "alumno") {
    const q = new URLSearchParams();
    for (const k of ["desde", "hasta", "vista"]) if (uno(k)) q.set(k, uno(k)!);
    redirect(`/asistencia${q.size ? `?${q.toString()}` : ""}#reporte`);
  }
  // Apoderado: reporte de sus hijos por fechas, al colegio o por curso.
  if (familia) {
    return (
      <div className="flex flex-col gap-6">
        <EncabezadoPagina
          titulo="Reporte de asistencia"
          seccion="dia"
          descripcion="Asistencia de tus hijos al colegio y en cada curso, en las fechas que elijas."
          acciones={
            <Link href="/asistencia" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Calendario
            </Link>
          }
        />
        <ReporteFamilia ctx={ctx} ruta={RUTA_GENERAL} parametro={uno} />
      </div>
    );
  }
  // El personal ve el resultado de un filtro en su propia vista (tabla o calendario); aquí queda el día y el resumen.
  if (!familia && !uno("curso") && (uno("salon") || uno("alumno") || uno("grado") || uno("desde") || uno("hasta"))) {
    const q = new URLSearchParams();
    for (const k of ["salon", "alumno", "grado", "desde", "hasta", "vista"]) if (uno(k)) q.set(k, uno(k)!);
    redirect(`${RUTA_VER}?${q.toString()}`);
  }
  // Profesor: su salón de tutoría (gráfico de los últimos 7 días) y sus cursos (specs/27).
  if (ctx.rol === "profesor" && !uno("curso")) {
    const [panel, opcionesProfesor] = await Promise.all([panelReportesProfesor(ctx), opcionesDeReporte(ctx)]);
    const hoyIso = hoyDelColegio(ctx).isoFecha;
    const periodoActual = opcionesProfesor.periodos.find((p) => p.inicio <= hoyIso && hoyIso <= p.fin);
    return (
      <div className="flex flex-col gap-6">
        <EncabezadoPagina
          titulo="Reportes de asistencia"
          seccion="dia"
          descripcion="La asistencia de tu salón de tutoría y el historial de las clases de tus cursos."
          acciones={
            <>
              <Link href="/asistencia" className={buttonVariants({ variant: "outline" })}>
                <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Pasar lista
              </Link>
              <FiltroReporte opciones={opcionesProfesor} inicial={{ desde: panel.desde, hasta: panel.hasta }} atajos={atajosDeFecha(hoyIso, periodoActual)} hoy={hoyIso} activos={0} />
            </>
          }
        />
        <PanelProfesor panel={panel} />
      </div>
    );
  }
  const opciones = await opcionesDeReporte(ctx);
  const veTodo = ctx.rol === "direccion" || ctx.rol === "administrativo";
  const puedeCorregir = ctx.rol === "direccion";

  let filtros: FiltrosReporte | null = null;
  let error: string | null = null;
  try {
    filtros = filtrosDeBusqueda(uno, hoy);
  } catch (e) {
    if (!(e instanceof ZodError)) throw e;
    error = e.issues[0]?.message ?? "Revisa los filtros.";
  }
  const periodo = opciones.periodos.find((p) => p.inicio <= hoy && hoy <= p.fin) ?? opciones.periodos.filter((p) => p.fin < hoy).at(-1);
  const cursoId = uno("curso");
  const dia = esFechaReal(uno("dia") ?? undefined) && uno("dia")! <= hoy ? uno("dia")! : hoy;
  const curso = filtros && cursoId && !error ? await cursoODetalle(ctx, { cursoId, desde: filtros.desde, hasta: filtros.hasta }) : null;
  if (curso && "error" in curso) error = curso.error;
  // Dirección y administrativo solo ven aquí el día; el rango (y la asistencia por curso) va en «Filtrar reporte».
  const reporte = filtros && !cursoId && !veTodo ? await reporteSegunFiltros(ctx, filtros) : null;
  // Dirección y administrativo: la página empieza por la asistencia al colegio de un día (hoy por defecto).
  const delDia = veTodo && !cursoId ? await resumenColegio(ctx, { desde: dia, hasta: dia }) : null;
  const base = filtros ?? { desde: rangoEsteMes(hoy).desde, hasta: hoy };
  const atajos = atajosDeFecha(hoy, periodo);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Reportes de asistencia"
        seccion="dia"
        descripcion={
          veTodo
            ? "Asistencia al colegio por día y por fechas, por salón y alumno; y faltas a clase por curso."
            : "Porcentaje de asistencia al colegio por alumno, salón o colegio en el rango de fechas que elijas."
        }
        acciones={
          <>
            <FiltroReporte opciones={opciones} inicial={base} atajos={atajos} hoy={hoy} activos={0} />
          </>
        }
      />

      {error && <Alerta tipo="error">{error}</Alerta>}

      {delDia && <AsistenciaDelDia reporte={delDia} dia={dia} hoy={hoy} puedeCorregir={puedeCorregir} />}

      {curso && !("error" in curso) && <VistaCurso detalle={curso} puedeCorregir={puedeCorregir} />}

      {reporte && filtros && <ResultadoRango reporte={reporte} filtros={filtros} familia={false} puedeCorregir={puedeCorregir} />}
    </div>
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
function AsistenciaDelDia({ reporte, dia, hoy, puedeCorregir }: { reporte: ReporteColegio; dia: string; hoy: string; puedeCorregir: boolean }) {
  const t = reporte.total;
  const alumnos = reporte.filas.reduce((s, f) => s + f.alumnos, 0);
  const esHabil = t.diasHabiles > 0;
  return (
    <section aria-labelledby="titulo-dia" data-seccion="dia" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-dia" className="flex items-center gap-2 text-titulo-2">
            <School className="size-5 text-sec-trazo" strokeWidth={2} aria-hidden /> Asistencia al colegio
          </h2>
          <p className="text-cuerpo-sm text-muted-foreground first-letter:uppercase">{dia === hoy ? `Hoy, ${fechaLarga(dia)}` : fechaLarga(dia)}</p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <Campo etiqueta="Día" name="dia" type="date" defaultValue={dia} max={hoy} />
          <Boton type="submit" variante="secundario">Ver día</Boton>
        </form>
      </div>
      {!esHabil ? (
        <Alerta tipo="aviso">Ese día no es hábil (fin de semana o feriado): no se cuenta asistencia.</Alerta>
      ) : (
        <>
          <CifrasJuntas como="ul" className="grid-cols-1 sm:grid-cols-2" data-testid="asistencia-del-dia">
            <Cifra titulo="Asistieron" valor={t.llego + t.tarde} detalle={`de ${alumnos} alumnos · ${t.llego} llegó, ${t.tarde} tarde`} estado="llego" />
            <Cifra titulo="Faltaron" valor={t.falta} detalle={`${t.faltasJustificadas} justificadas · ${t.faltasEnRevision} en revisión · ${t.faltasInjustificadas} sin justificar`} estado="falta" />
            <Cifra titulo="Con aviso" valor={t.problema} detalle="Situaciones registradas en la lista del día" estado="problema" />
            <Cifra titulo="Sin registro" valor={t.diasSinRegistro} detalle="Sin escaneo en portería ni lista del día" />
          </CifrasJuntas>
          <div className="overflow-hidden rounded-[14px] border border-borde-sutil bg-superficie">
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
            </div>
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
    <li className="flex flex-col gap-1.5 bg-superficie px-5 py-4">
      {estado ? (
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta ${ESTADOS_ASISTENCIA[estado].clase}`}>
          <IconoEstado estado={estado} />
          {titulo}
        </span>
      ) : (
        <span className="text-etiqueta text-muted-foreground">{titulo}</span>
      )}
      <strong className="font-heading text-titulo-1 tabular-nums">{valor}</strong>
      <span className="text-cuerpo-sm text-muted-foreground tabular-nums">{detalle}</span>
    </li>
  );
}

/** Detalle de un curso: cada falta o tardanza a clase con el ingreso al colegio de ese día y el enlace para corregir. */
function VistaCurso({ detalle, puedeCorregir }: { detalle: DetalleCurso; puedeCorregir: boolean }) {
  return (
    <section aria-labelledby="titulo-curso" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="titulo-curso" className="text-titulo-2">{detalle.curso.nombre} · {detalle.salon.nombre}</h2>
        <Link href={RUTA_GENERAL} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Volver al colegio
        </Link>
      </div>
      <p className="text-cuerpo-sm text-muted-foreground">
        Faltas y tardanzas a clase del {fechaCorta(detalle.desde)} al {fechaCorta(detalle.hastaEfectivo)}.
      </p>
      {detalle.filas.length === 0 ? (
        <EstadoVacio icono={BookOpenCheck} titulo="Sin faltas ni tardanzas a clase" descripcion="En este rango, todos los registros de este curso son «Llegó» o «Aviso»." />
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-borde-sutil bg-superficie">
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
          </div>
      )}
    </section>
  );
}
