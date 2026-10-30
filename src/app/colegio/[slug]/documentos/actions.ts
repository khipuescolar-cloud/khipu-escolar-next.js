"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ejecutarYVolver, texto, textoONulo } from "@/lib/server/accion-formulario";
import { contextoDeAccion } from "@/lib/server/contexto-accion";
import {
  borrarCarpeta, borrarDocumento, crearCarpeta, editarCarpeta, editarDocumento, reemplazarArchivoDocumento, subirDocumento,
} from "@/lib/server/documentos";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { requireFeature } from "@/lib/server/plan";
import type { EntradaAdjunto } from "@/lib/server/adjuntos";

const ROLES = ["direccion", "administrativo", "profesor"] as const;
const UUID = /^[0-9a-f-]{36}$/i;

/** Vuelve a la carpeta donde estaba el usuario (el id viene del formulario, solo se acepta si es un UUID). */
function destino(formData: FormData): string {
  const volver = textoONulo(formData, "volver");
  return volver && UUID.test(volver) ? `/documentos?carpeta=${volver}` : "/documentos";
}

async function archivoDe(formData: FormData, campo = "archivo"): Promise<EntradaAdjunto | null> {
  const v = formData.get(campo);
  if (!v || typeof v === "string" || v.size === 0) return null;
  return { nombre: v.name, buffer: Buffer.from(await v.arrayBuffer()) };
}

const marcado = (formData: FormData, campo: string) => ["on", "true"].includes(texto(formData, campo));
const roles = (formData: FormData) => formData.getAll("visibleRoles").filter((v): v is string => typeof v === "string");

function datosDocumento(formData: FormData) {
  return {
    titulo: texto(formData, "titulo"),
    descripcion: textoONulo(formData, "descripcion"),
    carpetaId: textoONulo(formData, "carpetaId"),
    visibleRoles: roles(formData),
    salonId: textoONulo(formData, "salonId"),
  };
}

export async function crearCarpetaAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    await crearCarpeta(ctx, { nombre: texto(formData, "nombre"), parentId: textoONulo(formData, "parentId"), visibleRoles: roles(formData) });
    revalidatePath("/documentos");
    return "Carpeta creada.";
  });
}

export async function editarCarpetaAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    await editarCarpeta(ctx, texto(formData, "id"), { nombre: texto(formData, "nombre"), parentId: textoONulo(formData, "parentId"), visibleRoles: roles(formData) });
    revalidatePath("/documentos");
    return "Carpeta actualizada.";
  });
}

export async function borrarCarpetaAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    const r = await borrarCarpeta(ctx, texto(formData, "id"));
    revalidatePath("/documentos");
    return `Carpeta borrada${r.documentos ? ` con ${r.documentos} ${r.documentos === 1 ? "documento" : "documentos"}` : ""}.`;
  });
}

export async function subirDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    const r = await subirDocumento(ctx, { ...datosDocumento(formData), avisar: marcado(formData, "avisar") }, await archivoDe(formData));
    revalidatePath("/documentos");
    if (r.avisados > 0) {
      // Envía el correo y el push ahora, sin esperar al cron.
      after(async () => {
        try {
          await procesarCola({ tenantId: ctx.tenant.id });
        } catch (error) {
          console.error("[avisos] error al procesar la cola", error);
        }
      });
    }
    return `Documento publicado.${r.avisados > 0 ? ` Se avisó a ${r.avisados} ${r.avisados === 1 ? "familia" : "familias"}.` : ""}`;
  });
}

export async function editarDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    const id = texto(formData, "id");
    const nuevo = await archivoDe(formData);
    await editarDocumento(ctx, id, datosDocumento(formData));
    if (nuevo) await reemplazarArchivoDocumento(ctx, id, nuevo);
    revalidatePath("/documentos");
    return nuevo ? "Documento actualizado con el archivo nuevo." : "Documento actualizado.";
  });
}

export async function borrarDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    await borrarDocumento(ctx, texto(formData, "id"));
    revalidatePath("/documentos");
    return "Documento borrado.";
  });
}
