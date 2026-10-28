import { renderToBuffer } from "@react-pdf/renderer";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { datosLibreta } from "@/lib/server/libreta";
import { logoParaPdf } from "@/lib/server/logo";
import { isotipoParaPdf } from "@/lib/server/marca-pdf";
import { LibretaPdf } from "@/lib/server/libreta-pdf";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

export const runtime = "nodejs";

/** GET /api/libreta/<alumnoId>?periodo=<periodoId> → PDF de la libreta. Descarga auditada. */
export async function GET(request: Request, { params }: RouteContext<"/colegio/[slug]/api/libreta/[alumnoId]">) {
  const { slug, alumnoId } = await params;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "libreta");

  const periodoId = new URL(request.url).searchParams.get("periodo");
  if (!z.uuid().safeParse(alumnoId).success || !z.uuid().safeParse(periodoId).success) {
    return new Response("Falta el alumno o el periodo.", { status: 400 });
  }
  if (ctx.rol === "porteria" || ctx.rol === "alumno") forbidden();

  const datos = await datosLibreta(ctx, alumnoId, periodoId as string, "exportar");
  const pdf = await renderToBuffer(LibretaPdf({ datos, logo: await logoParaPdf(ctx.tenant), isotipo: await isotipoParaPdf() }));
  const nombre = `libreta-${datos.alumno.apellidos}-${datos.alumno.nombres}-${datos.periodo.nombre}`
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
