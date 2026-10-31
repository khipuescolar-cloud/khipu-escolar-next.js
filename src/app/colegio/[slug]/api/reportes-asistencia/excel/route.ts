import { tablaDeReporte } from "@/lib/reportes-asistencia-tabla";
import { reporteAExcel, TIPO_XLSX } from "@/lib/server/reportes-asistencia-excel";
import { reporteParaExportar } from "@/lib/server/reportes-asistencia-exportar";

export const runtime = "nodejs";

/** GET /api/reportes-asistencia/excel?salon=&alumno=&curso=&desde=&hasta= → .xlsx. Mismos permisos que la página; auditado. */
export async function GET(request: Request, { params }: RouteContext<"/colegio/[slug]/api/reportes-asistencia/excel">) {
  const { slug } = await params;
  const r = await reporteParaExportar(request, slug, "excel");
  if (r instanceof Response) return r;
  const buffer = await reporteAExcel(r.reporte);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": TIPO_XLSX,
      "Content-Disposition": `attachment; filename="${tablaDeReporte(r.reporte).archivo}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
