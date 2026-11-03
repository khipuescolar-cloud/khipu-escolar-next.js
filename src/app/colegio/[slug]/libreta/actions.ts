"use server";

import { revalidatePath } from "next/cache";
import type { Resultado } from "@/lib/resultado";
import { guardarComentarioTutor } from "@/lib/server/libreta";
import { resolverRectificacion, solicitarRectificacion } from "@/lib/server/libreta-emision";
import { requireTenantContext } from "@/lib/server/tenant";

export async function guardarComentarioTutorAction(slug: string, alumnoId: string, periodoId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await guardarComentarioTutor(await requireTenantContext(slug), { alumnoId, periodoId, texto: String(f.get("texto") ?? "") });
  if (r.ok) revalidatePath("/colegio/[slug]/libreta", "layout");
  return r;
}

const refrescarLibreta = () => revalidatePath("/colegio/[slug]/libreta", "layout");

/** Profesor del curso o dirección pide rectificar una calificación de una libreta emitida (specs/37). */
export async function solicitarRectificacionAction(slug: string, alumnoId: string, periodoId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await solicitarRectificacion(await requireTenantContext(slug), {
    alumnoId, periodoId, competenciaId: String(f.get("competenciaId") ?? ""), valor: String(f.get("valor") ?? ""),
    conclusion: String(f.get("conclusion") ?? ""), motivo: String(f.get("motivo") ?? ""), evidencia: String(f.get("evidencia") ?? ""),
  });
  if (r.ok) refrescarLibreta();
  return r;
}

/** Dirección aprueba o rechaza una rectificación. */
export async function resolverRectificacionAction(slug: string, id: string, decision: "aprobada" | "rechazada"): Promise<Resultado> {
  const r = await resolverRectificacion(await requireTenantContext(slug), { id, decision });
  if (r.ok) refrescarLibreta();
  return r;
}
