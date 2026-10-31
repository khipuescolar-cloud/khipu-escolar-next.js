import { plantillaCarga, plantillaCsv } from "@/lib/carga-masiva/plantillas";
import { plantillaXlsx, TIPO_XLSX } from "@/lib/server/carga-masiva-archivo";
import { exigirAlumnosFamilias, exigirGestion } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";

export const runtime = "nodejs";

/** GET /api/carga-masiva/plantilla?tipo=salones|familias&formato=csv|xlsx → plantilla con filas de ejemplo ficticias (specs/36). */
export async function GET(request: Request, { params }: RouteContext<"/colegio/[slug]/api/carga-masiva/plantilla">) {
  const { slug } = await params;
  const q = new URL(request.url).searchParams;
  const tipo = q.get("tipo") === "salones" ? "salones" : "familias";
  const ctx = await requireTenantContext(slug, tipo === "salones" ? ["direccion"] : ["direccion", "administrativo"]);
  if (tipo === "salones") exigirGestion(ctx);
  else exigirAlumnosFamilias(ctx);
  const anio = Number(new Intl.DateTimeFormat("en-CA", { timeZone: ctx.tenant.zonaHoraria, year: "numeric" }).format(new Date()));
  const { archivo } = plantillaCarga(tipo, anio);
  const cabeceras = { "Cache-Control": "private, no-store" };
  if (q.get("formato") === "xlsx") {
    return new Response(new Uint8Array(await plantillaXlsx(tipo, anio)), {
      headers: { ...cabeceras, "Content-Type": TIPO_XLSX, "Content-Disposition": `attachment; filename="${archivo}.xlsx"` },
    });
  }
  return new Response(plantillaCsv(tipo, anio), {
    headers: { ...cabeceras, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${archivo}.csv"` },
  });
}
