"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { revisarJustificacion } from "@/lib/server/justificaciones";
import { requireTenantContext } from "@/lib/server/tenant";

export async function revisarJustificacionAction(slug: string, id: string, formData: FormData) {
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const comentario = String(formData.get("comentario") ?? "").trim();
  await revisarJustificacion(ctx, {
    id,
    decision: formData.get("decision"),
    ...(comentario ? { comentario } : {}),
  });
  after(async () => {
    try {
      await procesarCola({ tenantId: ctx.tenant.id });
    } catch (error) {
      console.error("[avisos] error al procesar la cola", error);
    }
  });
  revalidatePath("/colegio/[slug]/justificaciones", "page");
}
