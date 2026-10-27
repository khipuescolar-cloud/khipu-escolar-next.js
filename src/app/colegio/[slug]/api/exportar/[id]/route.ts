import { forbidden, notFound } from "next/navigation";
import { auditarDescargaExportacion, exportacionDescargable, nombreZip, respuestaDescarga } from "@/lib/server/exportar";
import { requireTenantContext } from "@/lib/server/tenant";

// Descarga del ZIP de una exportación lista (specs/15). Solo dirección del colegio; auditado.
export async function GET(_request: Request, { params }: RouteContext<"/colegio/[slug]/api/exportar/[id]">) {
  const { slug, id } = await params;
  const ctx = await requireTenantContext(slug);
  if (ctx.rol !== "direccion" || ctx.soporte) forbidden(); // el ZIP incluye chats y notas: nunca en modo soporte
  const lista = await exportacionDescargable(ctx.tenant.id, id);
  if (!lista) notFound();
  await auditarDescargaExportacion(ctx, lista.exportacion.id);
  return respuestaDescarga(lista.archivo, nombreZip(ctx.tenant.slug, lista.exportacion.terminadoAt ?? new Date()));
}
