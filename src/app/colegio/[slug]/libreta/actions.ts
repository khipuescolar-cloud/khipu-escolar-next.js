"use server";

import { revalidatePath } from "next/cache";
import type { Resultado } from "@/lib/resultado";
import { datosLibreta, guardarComentarioTutor } from "@/lib/server/libreta";
import { listarRectificaciones, resolverRectificacion } from "@/lib/server/libreta-emision";
import { requireTenantContext } from "@/lib/server/tenant";

export async function guardarComentarioTutorAction(slug: string, alumnoId: string, periodoId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await guardarComentarioTutor(await requireTenantContext(slug), { alumnoId, periodoId, texto: String(f.get("texto") ?? "") });
  if (r.ok) revalidatePath("/colegio/[slug]/libreta", "layout");
  return r;
}

const refrescarLibreta = () => revalidatePath("/colegio/[slug]/libreta", "layout");

/** Dirección aprueba o rechaza una rectificación. */
export async function resolverRectificacionAction(slug: string, id: string, decision: "aprobada" | "rechazada"): Promise<Resultado> {
  const r = await resolverRectificacion(await requireTenantContext(slug), { id, decision });
  if (r.ok) refrescarLibreta();
  return r;
}

/** Carga y audita una libreta al abrir el diálogo. Cada llamada valida de nuevo el alcance. */
export async function abrirDocumentoLibretaAction(slug: string, alumnoId: string, periodoId: string) {
  const ctx = await requireTenantContext(slug);
  const datos = await datosLibreta(ctx, alumnoId, periodoId, "ver");
  // Las rectificaciones se piden desde «Calificación del periodo»; aquí solo dirección las ve y las resuelve (specs/37).
  const rectificaciones = ctx.rol === "direccion" && datos.emision ? await listarRectificaciones(ctx, { alumnoId, periodoId }) : [];
  return { datos, rectificaciones, esDireccion: ctx.rol === "direccion" };
}
