import { requireTenantContext } from "@/lib/server/tenant";
import { reporteCumplimiento, reporteCsv } from "@/lib/server/solicitudes/index";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ctx = await requireTenantContext((await params).slug, ["direccion"]);
  const q = new URL(request.url).searchParams;
  const agrupar = q.get("agrupar") === "area" ? "area" : "docente";
  const anio = q.get("anio") ? Number(q.get("anio")) : undefined;
  if (anio && (!Number.isInteger(anio) || anio < 2000 || anio > 2200)) return new Response("Año inválido", { status: 400 });
  const filas = await reporteCumplimiento(ctx, { agrupar, anio, periodo: q.get("periodo") ?? undefined });
  return new Response(`\uFEFF${reporteCsv(filas)}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="solicitudes-documentales.csv"', "Cache-Control": "no-store" } });
}
