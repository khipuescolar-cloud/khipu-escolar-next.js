import { z } from "zod";
import { exportarNotasCurso } from "@/lib/server/notas";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

export const runtime = "nodejs";

/** GET /api/notas/exportar?curso=<id>&periodo=<id> → CSV (UTF-8 con BOM, separador «;») de la rejilla. Profesor del curso o dirección. */
export async function GET(request: Request, { params }: RouteContext<"/colegio/[slug]/api/notas/exportar">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  requireFeature(ctx, "notas");
  const q = new URL(request.url).searchParams;
  const cursoId = q.get("curso");
  const periodoId = q.get("periodo");
  if (!z.uuid().safeParse(cursoId).success || !z.uuid().safeParse(periodoId).success) {
    return new Response("Falta el curso o el periodo.", { status: 400 });
  }
  const { nombre, csv } = await exportarNotasCurso(ctx, cursoId as string, periodoId as string);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
