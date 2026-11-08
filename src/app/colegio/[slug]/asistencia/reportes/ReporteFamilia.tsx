import { BarChart3, BookOpenCheck, School } from "lucide-react";
import Link from "next/link";
import { ZodError } from "zod";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { PestanasSegmento } from "@/components/shell/PestanasPagina";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { filtrosDeBusqueda, rangoEsteMes, type FiltrosReporte } from "@/lib/reportes-asistencia";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { opcionesDeReporte, reporteAlumno, reporteCursos, type ReporteAlumno, type ReporteCursos } from "@/lib/server/reportes-asistencia";
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
  let filtros: FiltrosReporte | null = null;
  let error: string | null = null;
  try {
    filtros = filtrosDeBusqueda((k) => (k === "alumno" ? parametro("alumno") ?? opciones.alumnos[0]?.id ?? null : k === "curso" ? null : parametro(k)), hoy);
  } catch (e) {
    if (!(e instanceof ZodError)) throw e;
    error = e.issues[0]?.message ?? "Revisa los filtros.";
  }
  const base = filtros ?? { ...rangoEsteMes(hoy), alumnoId: opciones.alumnos[0]?.id };
  const periodo = opciones.periodos.find((p) => p.inicio <= hoy && hoy <= p.fin) ?? opciones.periodos.filter((p) => p.fin < hoy).at(-1);
  const atajos = atajosDeFecha(hoy, periodo);

  const href = (cambios: Partial<{ alumno: string; desde: string; hasta: string; vista: VistaReporteFamilia }>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(conservar)) if (v) q.set(k, v);
    const f = { alumno: base.alumnoId, desde: base.desde, hasta: base.hasta, vista, ...cambios };
    if (f.alumno) q.set("alumno", f.alumno);
    q.set("desde", f.desde);
    q.set("hasta", f.hasta);
    if (f.vista === "cursos") q.set("vista", "cursos");
    return `${ruta}?${q.toString()}#reporte`;
  };

  let reporte: ReporteAlumno | ReporteCursos | null = null;
  if (filtros?.alumnoId && !error) {
    reporte = vista === "cursos"
      ? await reporteCursos(ctx, { alumnoId: filtros.alumnoId, desde: filtros.desde, hasta: filtros.hasta })
      : await reporteAlumno(ctx, { alumnoId: filtros.alumnoId, desde: filtros.desde, hasta: filtros.hasta });
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
            { href: href({ vista: "colegio" }), texto: "Al colegio", activo: vista === "colegio", icono: <School className="size-4" strokeWidth={2} aria-hidden /> },
            { href: href({ vista: "cursos" }), texto: "Por curso", activo: vista === "cursos", icono: <BookOpenCheck className="size-4" strokeWidth={2} aria-hidden /> },
          ]}
        />
      </div>

      {/* key: los atajos navegan sin volver a montar la página; así los campos muestran las fechas nuevas. */}
      <form key={`${base.alumnoId ?? ""}|${base.desde}|${base.hasta}`} method="get" action={`${ruta}#reporte`} className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        {Object.entries(conservar).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
        {vista === "cursos" && <input type="hidden" name="vista" value="cursos" />}
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
      {reporte?.tipo === "cursos" && <VistaCursos reporte={reporte} familia />}
    </section>
  );
}
