import { forbidden } from "next/navigation";
import { aJson, exportarColegio } from "@/lib/server/exportar";
import { requireTenantContext } from "@/lib/server/tenant";

// Garantía de salida (specs/15): descarga JSON con todos los datos del colegio. Solo dirección; auditado.
export async function GET(_request: Request, { params }: RouteContext<"/colegio/[slug]/api/exportar">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  if (ctx.rol !== "direccion") forbidden();
  const datos = await exportarColegio(ctx);
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(aJson(datos), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${ctx.tenant.slug}-datos-${fecha}.json"`,
      "cache-control": "no-store",
    },
  });
}
