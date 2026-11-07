"use server";
import { revalidatePath } from "next/cache";
import { enviarCalificacionPeriodo, estadoCalificacionPeriodo, guardarBorradorPeriodo, reabrirCalificacionPeriodo } from "@/lib/server/calificacion-periodo";
import { requireTenantContext } from "@/lib/server/tenant";

const refrescar = () => revalidatePath("/colegio/[slug]/notas", "layout");

export async function estadoBotonAction(slug: string, cursoId: string, periodoId: string) {
  return estadoCalificacionPeriodo(await requireTenantContext(slug), cursoId, periodoId);
}

export async function guardarBorradorPeriodoAction(slug: string, entrada: unknown) {
  return guardarBorradorPeriodo(await requireTenantContext(slug), entrada);
}

/** Guarda lo pendiente y envía. Si faltan datos, devuelve la lista y no envía. */
export async function enviarCalificacionPeriodoAction(slug: string, entrada: { cursoId: string; periodoId: string; celdas: unknown[] }) {
  const ctx = await requireTenantContext(slug);
  if (entrada.celdas.length > 0) {
    const g = await guardarBorradorPeriodo(ctx, entrada);
    if (!g.ok) return g;
  }
  const r = await enviarCalificacionPeriodo(ctx, { cursoId: entrada.cursoId, periodoId: entrada.periodoId });
  if (r.ok) refrescar();
  return r;
}

export async function reabrirCalificacionPeriodoAction(slug: string, cursoId: string, periodoId: string) {
  const r = await reabrirCalificacionPeriodo(await requireTenantContext(slug), cursoId, periodoId);
  if (r.ok) refrescar();
  return r;
}
