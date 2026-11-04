"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { adjuntosDeFormData, idsParaQuitar } from "@/lib/server/adjuntos";
import { ejecutarYVolver, texto, textoONulo } from "@/lib/server/accion-formulario";
import { leerAudiencia } from "@/lib/audiencia-comunicado";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { borrarComunicado, editarComunicado, publicarComunicado } from "@/lib/server/comunicados";
import { contextoDeAccion } from "@/lib/server/contexto-accion";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { requireFeature } from "@/lib/server/plan";

export async function publicarComunicadoAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion", "profesor", "administrativo"]);
  requireFeature(ctx, "comunicados");
  await ejecutarYVolver("/comunicados", async () => {
    const leida = leerAudiencia({
      destino: textoONulo(formData, "destino"),
      niveles: formData.getAll("niveles").map(String),
      grado: textoONulo(formData, "grado"),
      salonId: textoONulo(formData, "salonId"),
    });
    if (!leida.ok) throw new ErrorDeNegocio(leida.error);
    const r = await publicarComunicado(ctx, { titulo: texto(formData, "titulo"), cuerpo: texto(formData, "cuerpo"), audiencia: leida.audiencia, importante: formData.get("importante") === "on" }, await adjuntosDeFormData(formData));
    revalidatePath("/comunicados");
    // Envía el push (y el correo si es importante) ahora, sin esperar al cron (respeta el tope diario y la reserva atómica de la cola).
    if (r.encolados > 0) {
      after(async () => {
        try {
          await procesarCola({ tenantId: ctx.tenant.id });
        } catch (error) {
          console.error("[avisos] error al procesar la cola", error);
        }
      });
    }
    return `Comunicado publicado. Se avisó a ${r.avisados} ${r.avisados === 1 ? "familia" : "familias"}.`;
  });
}

export async function editarComunicadoAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion", "profesor", "administrativo"]);
  requireFeature(ctx, "comunicados");
  await ejecutarYVolver("/comunicados", async () => {
    await editarComunicado(ctx, texto(formData, "id"), { titulo: texto(formData, "titulo"), cuerpo: texto(formData, "cuerpo") }, {
      nuevos: await adjuntosDeFormData(formData),
      quitar: idsParaQuitar(formData),
    });
    revalidatePath("/comunicados");
    return "Comunicado actualizado.";
  });
}

export async function borrarComunicadoAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion", "profesor", "administrativo"]);
  requireFeature(ctx, "comunicados");
  await ejecutarYVolver("/comunicados", async () => {
    await borrarComunicado(ctx, texto(formData, "id"));
    return "Comunicado borrado.";
  });
}
