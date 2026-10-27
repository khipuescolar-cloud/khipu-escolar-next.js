import { notFound } from "next/navigation";
import { z } from "zod";
import { exportacionDescargable, nombreZip, respuestaDescarga } from "@/lib/server/exportar";
import { db } from "@/lib/server/db";
import { auditarPlataforma, requireAdminPlataforma } from "@/lib/server/plataforma";

// Descarga del ZIP de una exportación lista (specs/15 y 16). Solo super administrador; auditado en la bitácora de plataforma.
export async function GET(_request: Request, { params }: RouteContext<"/plataforma/colegios/[id]/exportar/descargar/[exportacionId]">) {
  const admin = await requireAdminPlataforma();
  const { id, exportacionId } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const tenant = await db.tenant.findUnique({ where: { id }, select: { id: true, slug: true } });
  const lista = tenant ? await exportacionDescargable(tenant.id, exportacionId) : null;
  if (!tenant || !lista) notFound();
  await auditarPlataforma(admin, "exportar_colegio", tenant.id, { exportacionId: lista.exportacion.id, paso: "descarga" });
  return respuestaDescarga(lista.archivo, nombreZip(tenant.slug, lista.exportacion.terminadoAt ?? new Date()));
}
