"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { procesarEventosYPush } from "@/lib/server/eventos-academicos";
import type { Resultado } from "@/lib/resultado";
import {
  cerrarCursoPeriodo, publicarLibreta, reabrirCursoPeriodo,
  cambiarEstadoPeriodo, crearPeriodo,
  guardarCalificacionPeriodo, guardarNota, actualizarPeriodo, organizarNivel,
  compartirInformeProgreso, guardarInformeProgreso, publicarEvaluacion, decidirRecuperacion } from "@/lib/server/notas";
import { crearCriterio, eliminarCriterio, guardarResultadoCriterio } from "@/lib/server/criterios";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "");
const refrescar = () => revalidatePath("/colegio/[slug]/notas", "layout");

async function contexto(slug: string) {
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "notas");
  return ctx;
}

/** Guardado rápido de una celda de la grilla (sin refrescar la página). */
export async function guardarNotaAction(
  slug: string, evaluacionId: string, alumnoId: string, valor: string,
  extra: { motivo?: string; tipo?: string; fechaRecuperacion?: string } = {},
): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await guardarNota(ctx, { evaluacionId, alumnoId, valor, ...extra });
  // Con motivo = nota publicada (o NSP) corregida: puede haber un evento de corrección para la familia (specs/38).
  if (r.ok && extra.motivo) notificarDespues(ctx.tenant.id);
  return r;
}

/** Procesa el outbox académico y envía el push después de responder (no bloquea al profesor; specs/38). */
function notificarDespues(tenantId: string) {
  after(async () => {
    try {
      await procesarEventosYPush(tenantId);
    } catch (error) {
      console.error("[eventos-academicos] error al notificar", error);
    }
  });
}

/** El profesor autoriza o no la recuperación de una actividad con NSP justificado (specs/37). */
export async function decidirRecuperacionAction(slug: string, evaluacionId: string, alumnoId: string, decision: "autorizada" | "denegada"): Promise<Resultado> {
  const r = await decidirRecuperacion(await contexto(slug), { evaluacionId, alumnoId, decision });
  if (r.ok) refrescar();
  return r;
}

export async function guardarCalificacionAction(slug: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await guardarCalificacionPeriodo(await contexto(slug), {
    alumnoId: texto(f, "alumnoId"), competenciaId: texto(f, "competenciaId"), periodoId: texto(f, "periodoId"),
    valor: texto(f, "valor"), conclusion: texto(f, "conclusion"),
  });
  if (r.ok) refrescar();
  return r;
}

export async function crearPeriodoAction(slug: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await crearPeriodo(await contexto(slug), {
    anio: texto(f, "anio"), tipo: texto(f, "tipo"), numero: texto(f, "numero"), nombre: texto(f, "nombre"),
    inicio: texto(f, "inicio"), fin: texto(f, "fin"), niveles: f.getAll("niveles").map(String),
  });
  if (r.ok) refrescar();
  return r;
}

export async function organizarNivelAction(slug: string, nivel: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await organizarNivel(await contexto(slug), { anio: texto(f, "anio"), nivel, tipo: texto(f, "tipo") });
  if (r.ok) refrescar();
  return r;
}

export async function actualizarPeriodoAction(slug: string, periodoId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await actualizarPeriodo(await contexto(slug), periodoId, { nombre: texto(f, "nombre"), inicio: texto(f, "inicio"), fin: texto(f, "fin") });
  if (r.ok) refrescar();
  return r;
}

export async function cambiarEstadoPeriodoAction(slug: string, periodoId: string, cerrado: boolean): Promise<Resultado> {
  const r = await cambiarEstadoPeriodo(await contexto(slug), periodoId, cerrado);
  if (r.ok) refrescar();
  return r;
}

export async function cerrarCursoAction(slug: string, cursoId: string, periodoId: string): Promise<Resultado> {
  const r = await cerrarCursoPeriodo(await contexto(slug), cursoId, periodoId);
  if (r.ok) refrescar();
  return r;
}

export async function reabrirCursoAction(slug: string, cursoId: string, periodoId: string): Promise<Resultado> {
  const r = await reabrirCursoPeriodo(await contexto(slug), cursoId, periodoId);
  if (r.ok) refrescar();
  return r;
}

/** `reenviar = "1"` repite el aviso de una libreta ya publicada. */
export async function publicarLibretaAction(slug: string, periodoId: string, reenviar: boolean): Promise<Resultado> {
  const r = await publicarLibreta(await contexto(slug), periodoId, { reenviar });
  if (r.ok) {
    refrescar();
    revalidatePath("/colegio/[slug]/libreta", "layout");
  }
  return r;
}

/** Guardado del informe de progreso de un alumno en una competencia (sin refrescar la página). */
export async function guardarInformeAction(
  slug: string, entrada: { alumnoId: string; competenciaId: string; periodoId: string; logros: string; mejorar: string; recomendaciones: string },
): Promise<Resultado> {
  return guardarInformeProgreso(await contexto(slug), entrada);
}

export async function compartirInformeAction(slug: string, cursoId: string, periodoId: string, reenviar: boolean): Promise<Resultado> {
  const r = await compartirInformeProgreso(await contexto(slug), cursoId, periodoId, { reenviar });
  if (r.ok) refrescar();
  return r;
}

export async function publicarEvaluacionAction(slug: string, grupoId: string): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await publicarEvaluacion(ctx, grupoId);
  if (r.ok) {
    refrescar();
    notificarDespues(ctx.tenant.id);
  }
  return r;
}

export async function crearCriterioAction(slug: string, evaluacionId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await crearCriterio(await contexto(slug), {
    evaluacionId, descripcion: texto(f, "descripcion"), escala: texto(f, "escala"),
    puntajeMaximo: texto(f, "escala") === "puntaje" ? texto(f, "puntajeMaximo") : undefined, desempenoId: texto(f, "desempenoId"),
  });
  if (r.ok) refrescar();
  return r;
}

export async function eliminarCriterioAction(slug: string, criterioId: string): Promise<Resultado> {
  const r = await eliminarCriterio(await contexto(slug), criterioId);
  if (r.ok) refrescar();
  return r;
}

/** Guardado rápido de un resultado de criterio (sin refrescar la página). */
export async function guardarResultadoCriterioAction(slug: string, criterioId: string, alumnoId: string, valor: string): Promise<Resultado> {
  return guardarResultadoCriterio(await contexto(slug), { criterioId, alumnoId, valor });
}
