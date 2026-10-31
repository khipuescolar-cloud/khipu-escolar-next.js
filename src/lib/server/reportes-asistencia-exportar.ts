import "server-only";
import { ZodError } from "zod";
import { filtrosDeBusqueda } from "@/lib/reportes-asistencia";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { historialCurso, reporteSegunFiltros, type ReporteAsistencia, type ReporteCurso } from "@/lib/server/reportes-asistencia";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

/** Valida permisos y filtros (misma regla que la página) y devuelve el reporte; 403 si no tiene acceso, 400 si los filtros no son válidos. */
export async function reporteParaExportar(request: Request, slug: string, formato: "excel" | "pdf"): Promise<{ reporte: ReporteAsistencia | ReporteCurso; ctx: Awaited<ReturnType<typeof requireTenantContext>> } | Response> {
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "asistencia");
  const params = new URL(request.url).searchParams;
  try {
    const filtros = filtrosDeBusqueda((k) => params.get(k), hoyDelColegio(ctx).isoFecha);
    // ?curso=: historial de asistencia de un curso (profesor del curso, tutor del salón, dirección o administrativo).
    const cursoId = params.get("curso");
    if (cursoId) return { reporte: await historialCurso(ctx, { cursoId, desde: filtros.desde, hasta: filtros.hasta }, { accion: "exportar", formato }), ctx };
    return { reporte: await reporteSegunFiltros(ctx, filtros, { accion: "exportar", formato }), ctx };
  } catch (error) {
    if (error instanceof ZodError) return new Response(error.issues[0]?.message ?? "Filtros no válidos.", { status: 400 });
    throw error;
  }
}
