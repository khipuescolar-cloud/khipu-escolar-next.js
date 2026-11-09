"use server";

import { revalidatePath } from "next/cache";
import type { Resultado } from "@/lib/resultado";
import { datosLibreta, guardarComentarioTutor } from "@/lib/server/libreta";
import { listarRectificaciones, resolverRectificacion, solicitarRectificacion } from "@/lib/server/libreta-emision";
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

/** Carga y audita una libreta al abrir el diálogo. Cada llamada valida de nuevo el alcance. */
export async function abrirDocumentoLibretaAction(slug: string, alumnoId: string, periodoId: string) {
  const ctx = await requireTenantContext(slug);
  const datos = await datosLibreta(ctx, alumnoId, periodoId, "ver");
  const rectificaciones = (ctx.rol === "profesor" || ctx.rol === "direccion") && datos.emision
    ? await listarRectificaciones(ctx, { alumnoId, periodoId }) : [];
  const cursosPropios = ctx.rol === "profesor" ? new Set((await ctx.db.curso.findMany({ where: { profesorId: ctx.membership.id }, select: { id: true } })).map((c) => c.id)) : null;
  const competenciasRectificables = datos.cursos.filter((c) => !cursosPropios || cursosPropios.has(c.id)).flatMap((c) => c.competencias.map((x) => ({ id: x.id, nombre: c.nombre + " · " + x.nombre, actual: x.calificacion ? (x.calificacion.valorLiteral ?? String(x.calificacion.valorNumerico)) : "sin calificar" })));
  return { datos, rectificaciones, competenciasRectificables, esDireccion: ctx.rol === "direccion" };
}
