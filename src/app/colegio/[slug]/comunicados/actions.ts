"use server";

import { revalidatePath } from "next/cache";
import { ejecutarYVolver, texto, textoONulo } from "@/lib/server/accion-formulario";
import { borrarComunicado, editarComunicado, publicarComunicado } from "@/lib/server/comunicados";
import { contextoDeAccion } from "@/lib/server/contexto-accion";
import { requireFeature } from "@/lib/server/plan";

export async function publicarComunicadoAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion", "profesor", "administrativo"]);
  requireFeature(ctx, "comunicados");
  await ejecutarYVolver("/comunicados", async () => {
    const r = await publicarComunicado(ctx, { titulo: texto(formData, "titulo"), cuerpo: texto(formData, "cuerpo"), salonId: textoONulo(formData, "salonId") });
    revalidatePath("/comunicados");
    return `Comunicado publicado. Se avisó a ${r.avisados} ${r.avisados === 1 ? "familia" : "familias"}.`;
  });
}

export async function editarComunicadoAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion", "profesor", "administrativo"]);
  requireFeature(ctx, "comunicados");
  await ejecutarYVolver("/comunicados", async () => {
    await editarComunicado(ctx, texto(formData, "id"), { titulo: texto(formData, "titulo"), cuerpo: texto(formData, "cuerpo") });
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
