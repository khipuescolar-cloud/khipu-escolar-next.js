import { renderToBuffer } from "@react-pdf/renderer";
import { logoParaPdf } from "@/lib/server/logo";
import { isotipoParaPdf } from "@/lib/server/marca-pdf";
import { consolidadoParaExportar } from "@/lib/server/tablero-consolidado-exportar";
import { ConsolidadoNotasPdf } from "@/lib/server/tablero-consolidado-pdf";
import { tablaDeConsolidado } from "@/lib/tablero-consolidado";
import { requireTenantContext } from "@/lib/server/tenant";

export const runtime = "nodejs";

/** GET /api/tablero/consolidado/pdf?salon=&periodo= → PDF. Solo dirección con Khipu Pro; auditado. */
export async function GET(request: Request, { params }: RouteContext<"/colegio/[slug]/api/tablero/consolidado/pdf">) {
  const { slug } = await params;
  const r = await consolidadoParaExportar(request, slug, "pdf");
  if (r instanceof Response) return r;
  const ctx = await requireTenantContext(slug);
  const pdf = await renderToBuffer(ConsolidadoNotasPdf({ consolidado: r, logo: await logoParaPdf(ctx.tenant), isotipo: await isotipoParaPdf() }));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${tablaDeConsolidado(r).archivo}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
