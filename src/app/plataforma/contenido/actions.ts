"use server";

import { revalidatePath } from "next/cache";
import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { cambiarEstadoEditorial, revisarBloqueEditorial } from "@/lib/server/curriculum/estado-editorial";

export async function cambiarEstadoContenidoAction(formData: FormData): Promise<never> {
  return ejecutarYVolver("/contenido", async () => {
    const siguiente = texto(formData, "estado");
    await cambiarEstadoEditorial(texto(formData, "clave"), siguiente, formData.get("checklist") === "si");
    revalidatePath("/plataforma/contenido");
    return siguiente === "borrador" ? "El tema volvió a borrador." : siguiente === "revisado" ? "Tema revisado." : "Tema publicado.";
  });
}

export async function revisarBloqueContenidoAction(formData: FormData): Promise<never> {
  return ejecutarYVolver("/contenido", async () => {
    const cantidad = await revisarBloqueEditorial({
      area: texto(formData, "area"), nivel: texto(formData, "nivel") as "inicial" | "primaria" | "secundaria",
      grado: texto(formData, "grado"), disciplina: texto(formData, "disciplina"),
    }, formData.get("checklist") === "si");
    revalidatePath("/plataforma/contenido");
    return `${cantidad} ${cantidad === 1 ? "tema revisado" : "temas revisados"} en el bloque.`;
  });
}
