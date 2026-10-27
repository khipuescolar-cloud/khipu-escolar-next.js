"use server";

import { z } from "zod";
import { ejecutarYVolver } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { db } from "@/lib/server/db";
import { solicitarExportacion } from "@/lib/server/exportar";
import { auditarPlataforma, requireAdminPlataforma } from "@/lib/server/plataforma";

/** El super administrador pide la exportación de un colegio (se prepara en segundo plano). Auditado en `auditoria_plataforma`. */
export async function prepararExportacionPlataformaAction(formData: FormData) {
  const admin = await requireAdminPlataforma();
  const id = String(formData.get("tenantId") ?? "");
  await ejecutarYVolver(`/colegios/${id}/exportar`, async () => {
    if (!z.uuid().safeParse(id).success) throw new ErrorDeNegocio("Colegio no válido.");
    const tenant = await db.tenant.findUnique({ where: { id }, select: { id: true } });
    if (!tenant) throw new ErrorDeNegocio("No existe ese colegio.");
    const e = await solicitarExportacion(tenant.id, admin.user.id);
    await auditarPlataforma(admin, "exportar_colegio", tenant.id, { exportacionId: e.id, paso: "solicitud" });
    return "Listo. La exportación se prepara en segundo plano; actualiza esta página en unos minutos.";
  });
}
