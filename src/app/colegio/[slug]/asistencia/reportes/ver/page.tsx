import { ArrowLeft, CalendarDays, FileDown, FileSpreadsheet, FileText, Table2 } from "lucide-react";
import { PestanasSegmento } from "@/components/shell/PestanasPagina";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { fechaCorta } from "@/lib/fechas";
import { filtrosDeBusqueda, rangoEsteMes, type FiltrosReporte } from "@/lib/reportes-asistencia";
import { esVistaFamilia } from "@/lib/roles";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { requireFeature } from "@/lib/server/plan";
import { esReporteDeCursos, opcionesDeReporte, reporteCursos, reporteSegunFiltros } from "@/lib/server/reportes-asistencia";
import { requireTenantContext } from "@/lib/server/tenant";
import { CalendarioReporte } from "../CalendarioReporte";
import { FiltroReporte } from "../FiltroReporte";
import { AsistenciaPorCurso, atajosDeFecha, Contenido, contextoDe, enlace, tituloDe, Totales, VistaCursos } from "../vistas";

export const metadata: Metadata = { title: "Reporte de asistencia" };

type Vista = "tabla" | "calendario";

/** Reporte filtrado del personal (specs/27): salón, alumno o colegio en un rango, en tabla o en calendario. */
export default async function VerReporteAsistenciaPage({ params, searchParams }: PageProps<"/colegio/[slug]/asistencia/reportes/ver">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo", "profesor", "apoderado", "alumno"]);
  requireFeature(ctx, "asistencia");
  // La familia tiene su reporte en la página general (filtros en línea).
  if (esVistaFamilia(ctx.rol)) redirect("/asistencia/reportes");
  const hoy = hoyDelColegio(ctx).isoFecha;
  const uno = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const vista: Vista = uno("vista") === "calendario" ? "calendario" : "tabla";
  const veTodo = ctx.rol === "direccion" || ctx.rol === "administrativo";
  const puedeCorregir = ctx.rol === "direccion";
  const opciones = await opcionesDeReporte(ctx);
  const periodo = opciones.periodos.find((p) => p.inicio <= hoy && hoy <= p.fin) ?? opciones.periodos.filter((p) => p.fin < hoy).at(-1);

  let filtros: FiltrosReporte | null = null;
  let error: string | null = null;
  try {
    filtros = filtrosDeBusqueda(uno, hoy);
  } catch (e) {
    if (!(e instanceof ZodError)) throw e;
    error = e.issues[0]?.message ?? "Revisa los filtros.";
  }
  // Profesor fuera de su tutoría (o con «Curso»): la asistencia a clase de sus cursos, no la del colegio.
  const deCursos = filtros && (await esReporteDeCursos(ctx, filtros)) ? await reporteCursos(ctx, filtros) : null;
  const reporte = filtros && !deCursos ? await reporteSegunFiltros(ctx, filtros) : null;
  const base = filtros ?? { desde: rangoEsteMes(hoy).desde, hasta: hoy };
  const activos = [uno("salon") || uno("grado"), uno("alumno"), uno("curso"), uno("desde") || uno("hasta")].filter(Boolean).length;
  const tituloCursos = deCursos
    ? deCursos.alumno ? `${deCursos.alumno.apellidos}, ${deCursos.alumno.nombres}`
      : deCursos.curso ? deCursos.curso.nombre
      : deCursos.salon ? `Salón ${deCursos.salon.nombre}`
      : deCursos.grado ? deCursos.grado.nombre.charAt(0).toUpperCase() + deCursos.grado.nombre.slice(1)
      : "Mis cursos"
    : null;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={reporte ? tituloDe(reporte) : tituloCursos ?? "Reporte de asistencia"}
        seccion="dia"
        descripcion={
          reporte ? `Asistencia al colegio del ${fechaCorta(reporte.desde)} al ${fechaCorta(reporte.hastaEfectivo)}.`
          : deCursos ? `Asistencia a clase del ${fechaCorta(deCursos.desde)} al ${fechaCorta(deCursos.hastaEfectivo)}.`
          : undefined
        }
        acciones={
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/asistencia/reportes" className={buttonVariants({ variant: "outline" })}>
                <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Reportes
              </Link>
              <FiltroReporte opciones={opciones} inicial={base} atajos={atajosDeFecha(hoy, periodo)} hoy={hoy} activos={activos} vista={vista} />
            </div>
            {reporte && filtros && (
              <div className="flex flex-wrap items-center gap-2">
                <SelectorVista filtros={filtros} vista={vista} />
                <a href={enlace(filtros, {}, "/api/reportes-asistencia/excel")} className={buttonVariants({ variant: "outline" })}>
                  <FileSpreadsheet className="size-4" strokeWidth={2} aria-hidden /> Descargar Excel
                </a>
                <a href={enlace(filtros, {}, "/api/reportes-asistencia/pdf")} className={buttonVariants({ variant: "outline" })}>
                  <FileText className="size-4" strokeWidth={2} aria-hidden /> Descargar PDF
                </a>
                <a href={enlace(filtros, {}, "/api/reportes-asistencia/csv")} className={buttonVariants({ variant: "outline" })}>
                  <FileDown className="size-4" strokeWidth={2} aria-hidden /> Descargar CSV
                </a>
              </div>
            )}
          </div>
        }
      />
      {error && <Alerta tipo="error">{error}</Alerta>}

      {deCursos && <VistaCursos reporte={deCursos} />}

      {reporte && filtros && (
        <>
          {reporte.hastaEfectivo !== reporte.hasta && (
            <p className="text-cuerpo-sm text-muted-foreground">Se cuenta hasta hoy ({fechaCorta(reporte.hastaEfectivo)}).</p>
          )}

          {vista === "tabla" ? (
            <>
              <Contenido reporte={reporte} filtros={filtros} familia={false} puedeCorregir={puedeCorregir} />
              {reporte.tipo === "colegio" && reporte.cursos && <AsistenciaPorCurso reporte={reporte} filtros={filtros} />}
            </>
          ) : (
            <>
              <Totales resumen={reporte.tipo === "alumno" ? reporte.resumen : reporte.total} titulo={tituloDe(reporte)} contexto={contextoDe(reporte)} />
              <CalendarioReporte reporte={reporte} hoy={hoy} veTodo={veTodo} puedeCorregir={puedeCorregir} />
            </>
          )}
          <p className="text-sm text-muted-foreground">
            Cuenta la asistencia al colegio (portería o lista del día); las listas de curso no cambian el porcentaje. % de asistencia = (llegó + tarde) ÷ días hábiles con registro. Los días hábiles son de lunes a viernes sin feriados; los días sin registro no cuentan en el porcentaje.
          </p>
        </>
      )}
    </div>
  );
}

/** Tabla o calendario: dos enlaces con el mismo filtro (control segmentado). */
function SelectorVista({ filtros, vista }: { filtros: FiltrosReporte; vista: Vista }) {
  const opciones = [
    { valor: "tabla" as const, texto: "Tabla", Icono: Table2 },
    { valor: "calendario" as const, texto: "Calendario", Icono: CalendarDays },
  ];
  return (
    <PestanasSegmento
      etiqueta="Ver como"
      scroll={false}
      items={opciones.map(({ valor, texto, Icono }) => ({
        href: enlace(filtros, { vista: valor }), texto, activo: vista === valor,
        icono: <Icono className="size-4" strokeWidth={2} aria-hidden />,
      }))}
    />
  );
}
