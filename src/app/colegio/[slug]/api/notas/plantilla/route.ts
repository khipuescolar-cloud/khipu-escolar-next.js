import { z } from "zod";
import { plantillaNotas } from "@/lib/server/registro-notas-archivos";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

export const runtime = "nodejs";

/** GET /api/notas/plantilla?curso=<id>&periodo=<id>&formato=xlsx|csv → plantilla de notas del curso. Solo el profesor del curso. */
export async function GET(request: Request, { params }: RouteContext<"/colegio/[slug]/api/notas/plantilla">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["profesor"]);
  requireFeature(ctx, "notas");
  const q = new URL(request.url).searchParams;
  const cursoId = q.get("curso");
  const periodoId = q.get("periodo");
  if (!z.uuid().safeParse(cursoId).success || !z.uuid().safeParse(periodoId).success) return new Response("Falta el curso o el periodo.", { status: 400 });
  const { nombre, tipo, contenido } = await plantillaNotas(ctx, cursoId as string, periodoId as string, q.get("formato") === "csv" ? "csv" : "xlsx");
  return new Response(typeof contenido === "string" ? contenido : new Uint8Array(contenido), { headers: { "Content-Type": tipo, "Content-Disposition": `attachment; filename="${nombre}"`, "Cache-Control": "private, no-store" } });
}
