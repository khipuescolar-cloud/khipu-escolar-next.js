"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { TipoCarga } from "@/lib/carga-masiva/plantillas";
import { importarCarga, previsualizarCarga, type ResultadoCarga, type VistaCarga } from "@/lib/server/carga-masiva";
import { leerArchivoCarga } from "@/lib/server/carga-masiva-archivo";
import { ErrorDeNegocio, contextoDeAccion } from "@/lib/server/contexto-accion";
import { procesarCola } from "@/lib/server/notificaciones/cola";

// Carga masiva (specs/36): salones y cursos solo dirección; familias dirección y administrativo.
// El colegio sale del Host (contextoDeAccion); el archivo se vuelve a leer y validar al confirmar.

export type RespuestaVista = { ok: true; vista: VistaCarga } | { ok: false; error: string };
export type RespuestaImportacion = { ok: true; resultado: ResultadoCarga } | { ok: false; error: string };

const tipoValido = (tipo: string): TipoCarga => (tipo === "salones" ? "salones" : "familias");
const contexto = (tipo: TipoCarga) => contextoDeAccion(tipo === "salones" ? ["direccion"] : ["direccion", "administrativo"]);

async function conMensaje<T>(fn: () => Promise<T>): Promise<T | { ok: false; error: string }> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { ok: false, error: e.message };
    throw e;
  }
}

export async function previsualizarCargaAction(tipoCrudo: string, formData: FormData): Promise<RespuestaVista> {
  const tipo = tipoValido(tipoCrudo);
  const ctx = await contexto(tipo);
  return conMensaje(async () => {
    const tabla = await leerArchivoCarga(formData.get("archivo"));
    return { ok: true as const, vista: await previsualizarCarga(ctx, tipo, tabla) };
  });
}

export async function importarCargaAction(tipoCrudo: string, formData: FormData): Promise<RespuestaImportacion> {
  const tipo = tipoValido(tipoCrudo);
  const ctx = await contexto(tipo);
  return conMensaje(async () => {
    const tabla = await leerArchivoCarga(formData.get("archivo"));
    const resultado = await importarCarga(ctx, tipo, tabla);
    if (tipo === "familias") {
      // Las bienvenidas salen por la cola (un solo worker por colegio, al ritmo de EMAIL_RATE_PER_SECOND).
      after(async () => {
        try {
          await procesarCola({ tenantId: ctx.tenant.id });
        } catch (error) {
          console.error("[avisos] error al procesar la cola", error);
        }
      });
    }
    revalidatePath("/colegio/[slug]/gestion", "layout");
    return { ok: true as const, resultado };
  });
}
