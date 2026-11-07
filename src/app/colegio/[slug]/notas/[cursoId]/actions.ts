"use server";
import { revalidatePath } from "next/cache";
import { asignarCompetenciaTareaAntigua, crearCalificacion } from "@/lib/server/registro-notas";
import { guardarNotaAction } from "../actions";
import { requireTenantContext } from "@/lib/server/tenant";

export async function crearCalificacionAction(slug: string, entrada: unknown) {
  const r = await crearCalificacion(await requireTenantContext(slug), entrada);
  if (r.ok) revalidatePath("/colegio/[slug]/notas/[cursoId]", "page");
  return r;
}
export async function editarCeldaAction(slug: string, evaluacionId: string, alumnoId: string, valor: string, motivo?: string) {
  const r = await guardarNotaAction(slug, evaluacionId, alumnoId, valor, motivo ? { motivo, tipo: "correccion_digitacion" } : {});
  if (r.ok) revalidatePath("/colegio/[slug]/notas/[cursoId]", "page");
  return r;
}

export async function asignarCompetenciaAction(slug: string, evaluacionId: string, competenciaId: string) {
  const r = await asignarCompetenciaTareaAntigua(await requireTenantContext(slug), evaluacionId, competenciaId);
  if (r.ok) revalidatePath("/colegio/[slug]/notas/[cursoId]", "page");
  return r;
}
