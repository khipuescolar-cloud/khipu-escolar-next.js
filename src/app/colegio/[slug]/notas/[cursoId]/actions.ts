"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fallo, type Resultado } from "@/lib/resultado";
import { leerArchivoCarga } from "@/lib/server/carga-masiva-archivo";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { informesProgreso } from "@/lib/server/notas";
import { requireFeature } from "@/lib/server/plan";
import { asignarCompetenciaTareaAntigua, crearCalificacion, editarObservacionRegistro } from "@/lib/server/registro-notas";
import { importarRegistro, previsualizarImportacionRegistro, type VistaPreviaRegistro } from "@/lib/server/registro-notas-archivos";
import { requireTenantContext } from "@/lib/server/tenant";
import { guardarNotaAction } from "../actions";

const refrescar = () => revalidatePath("/colegio/[slug]/notas/[cursoId]", "page");

export async function crearCalificacionAction(slug: string, entrada: unknown) {
  const r = await crearCalificacion(await requireTenantContext(slug), entrada);
  if (r.ok) refrescar();
  return r;
}
export async function editarCeldaAction(slug: string, evaluacionId: string, alumnoId: string, valor: string, motivo?: string) {
  const r = await guardarNotaAction(slug, evaluacionId, alumnoId, valor, motivo ? { motivo, tipo: "correccion_digitacion" } : {});
  if (r.ok) refrescar();
  return r;
}

/**
 * Recuperación de un NSP justificado (specs/37): la nota va en la actividad original, con la fecha en que el alumno la rindió.
 * Las reglas (autorizada por el profesor del curso, fecha no futura, historial `recuperacion`) viven en `guardarNota`.
 */
export async function registrarRecuperacionAction(slug: string, evaluacionId: string, alumnoId: string, valor: string, fechaRecuperacion: string) {
  const r = await guardarNotaAction(slug, evaluacionId, alumnoId, valor, { fechaRecuperacion });
  if (r.ok) refrescar();
  return r;
}

/** Observación de una celda; privada salvo que `visible` sea true (specs/38). */
export async function editarObservacionAction(slug: string, evaluacionId: string, alumnoId: string, observacion: string, visible: boolean): Promise<Resultado> {
  const r = await editarObservacionRegistro(await requireTenantContext(slug), { evaluacionId, alumnoId, observacion, visible });
  if (r.ok) refrescar();
  return r;
}

export async function asignarCompetenciaAction(slug: string, evaluacionId: string, competenciaId: string) {
  const r = await asignarCompetenciaTareaAntigua(await requireTenantContext(slug), evaluacionId, competenciaId);
  if (r.ok) refrescar();
  return r;
}

/** Datos del informe de progreso del curso y periodo; se piden al abrir el panel para no cargar la página del registro. */
export async function cargarInformesAction(slug: string, cursoId: string, periodoId: string) {
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "notas");
  return informesProgreso(ctx, cursoId, periodoId);
}

const camposImportacion = z.object({
  cursoId: z.uuid(), periodoId: z.uuid(), competenciaId: z.string(), nombre: z.string(), fecha: z.string(), claveIdempotencia: z.uuid(),
});

async function leerEntrada(formData: FormData) {
  const d = camposImportacion.safeParse(Object.fromEntries(["cursoId", "periodoId", "competenciaId", "nombre", "fecha", "claveIdempotencia"].map((k) => [k, String(formData.get(k) ?? "")])));
  if (!d.success) throw new ErrorDeNegocio("Completa el formulario antes de subir el archivo.");
  return { ...d.data, observacionVisible: formData.get("observacionVisible") === "on" };
}

export async function previsualizarImportacionRegistroAction(slug: string, formData: FormData): Promise<{ ok: true; vista: VistaPreviaRegistro } | { ok: false; error: string }> {
  const ctx = await requireTenantContext(slug);
  try {
    const entrada = await leerEntrada(formData);
    const tabla = await leerArchivoCarga(formData.get("archivo"));
    return { ok: true, vista: await previsualizarImportacionRegistro(ctx, entrada, tabla) };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { ok: false, error: e.message };
    throw e;
  }
}

export async function importarRegistroAction(slug: string, formData: FormData): Promise<Resultado & { evaluacionId?: string }> {
  const ctx = await requireTenantContext(slug);
  try {
    const entrada = await leerEntrada(formData);
    const tabla = await leerArchivoCarga(formData.get("archivo"));
    const r = await importarRegistro(ctx, entrada, tabla);
    if (r.ok) refrescar();
    return r;
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}
