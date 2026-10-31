import { renderToBuffer } from "@react-pdf/renderer";
import { tablaDeReporte } from "@/lib/reportes-asistencia-tabla";
import { logoParaPdf } from "@/lib/server/logo";
import { isotipoParaPdf } from "@/lib/server/marca-pdf";
import { ReporteAsistenciaPdf } from "@/lib/server/reportes-asistencia-pdf";
import { reporteParaExportar } from "@/lib/server/reportes-asistencia-exportar";

export const runtime = "nodejs";

/** GET /api/reportes-asistencia/pdf?salon=&alumno=&curso=&desde=&hasta= → PDF. Mismos permisos que la página; auditado. */
export async function GET(request: Request, { params }: RouteContext<"/colegio/[slug]/api/reportes-asistencia/pdf">) {
  const { slug } = await params;
  const r = await reporteParaExportar(request, slug, "pdf");
  if (r instanceof Response) return r;
  const pdf = await renderToBuffer(ReporteAsistenciaPdf({ reporte: r.reporte, logo: await logoParaPdf(r.ctx.tenant), isotipo: await isotipoParaPdf() }));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${tablaDeReporte(r.reporte).archivo}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
