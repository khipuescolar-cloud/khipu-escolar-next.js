import { forbidden } from "next/navigation";
import { exportarColegioZip } from "@/lib/server/exportar";
import { requireTenantContext } from "@/lib/server/tenant";

// Garantía de salida (specs/15): descarga un ZIP con todos los datos del colegio. Solo dirección; auditado.
export async function GET(_request: Request, { params }: RouteContext<"/colegio/[slug]/api/exportar">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  if (ctx.rol !== "direccion" || ctx.soporte) forbidden(); // el ZIP incluye chats y notas: nunca en modo soporte
  const zip = await exportarColegioZip(ctx);
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${ctx.tenant.slug}-datos-${fecha}.zip"`,
      "cache-control": "no-store",
    },
  });
}
