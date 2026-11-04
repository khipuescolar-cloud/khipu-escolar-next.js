import { aCsv } from "@/lib/csv";
import { filasCsvDeTabla, tablaDeReporte } from "@/lib/reportes-asistencia-tabla";
import { reporteParaExportar } from "@/lib/server/reportes-asistencia-exportar";

export const runtime = "nodejs";

/**
 * GET /api/reportes-asistencia/csv?salon=&alumno=&grado=&curso=&desde=&hasta= → CSV (UTF-8 con BOM).
 * Mismos permisos que la página, el Excel y el PDF (403 sin permiso, 400 con filtros inválidos); auditado.
 */
export async function GET(request: Request, { params }: RouteContext<"/colegio/[slug]/api/reportes-asistencia/csv">) {
  const { slug } = await params;
  const r = await reporteParaExportar(request, slug, "csv");
  if (r instanceof Response) return r;
  const tabla = tablaDeReporte(r.reporte);
  const { encabezados, filas } = filasCsvDeTabla(r.reporte.colegio, tabla);
  return new Response(aCsv(encabezados, filas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tabla.archivo}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
