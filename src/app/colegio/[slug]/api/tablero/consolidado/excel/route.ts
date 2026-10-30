import { TIPO_XLSX } from "@/lib/server/reportes-asistencia-excel";
import { consolidadoAExcel } from "@/lib/server/tablero-consolidado-excel";
import { tablaDeConsolidado } from "@/lib/tablero-consolidado";
import { consolidadoParaExportar } from "@/lib/server/tablero-consolidado-exportar";

export const runtime = "nodejs";

/** GET /api/tablero/consolidado/excel?salon=&periodo= → .xlsx. Solo dirección con Khipu Pro; auditado. */
export async function GET(request: Request, { params }: RouteContext<"/colegio/[slug]/api/tablero/consolidado/excel">) {
  const { slug } = await params;
  const r = await consolidadoParaExportar(request, slug, "excel");
  if (r instanceof Response) return r;
  const libro = await consolidadoAExcel(r);
  return new Response(new Uint8Array(libro), {
    headers: {
      "Content-Type": TIPO_XLSX,
      "Content-Disposition": `attachment; filename="${tablaDeConsolidado(r).archivo}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
