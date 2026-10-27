"use server";

import { revalidatePath } from "next/cache";
import type { Resultado } from "@/lib/resultado";
import {
  cerrarCursoPeriodo, guardarComentarioNota, importarNotas, previsualizarImportacionNotas, publicarLibreta, reabrirCursoPeriodo,
  type VistaPreviaImportacion,
  cambiarEstadoPeriodo, crearCompetencia, crearEvaluacion, crearPeriodo, editarEvaluacion, eliminarCompetencia,
  eliminarEvaluacion, guardarCalificacionPeriodo, guardarNota,
} from "@/lib/server/notas";
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
export async function guardarNotaAction(slug: string, evaluacionId: string, alumnoId: string, valor: string): Promise<Resultado> {
  return guardarNota(await contexto(slug), { evaluacionId, alumnoId, valor });
}

export async function crearEvaluacionAction(slug: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await crearEvaluacion(await contexto(slug), {
    cursoId: texto(f, "cursoId"), periodoId: texto(f, "periodoId"), competenciaId: texto(f, "competenciaId"),
    titulo: texto(f, "titulo"), fecha: texto(f, "fecha"), peso: texto(f, "peso"),
  });
  if (r.ok) refrescar();
  return r;
}

export async function editarEvaluacionAction(slug: string, evaluacionId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await editarEvaluacion(await contexto(slug), evaluacionId, {
    competenciaId: texto(f, "competenciaId"), titulo: texto(f, "titulo"), fecha: texto(f, "fecha"), peso: texto(f, "peso"),
  });
  if (r.ok) refrescar();
  return r;
}

export async function eliminarEvaluacionAction(slug: string, evaluacionId: string): Promise<Resultado> {
  const r = await eliminarEvaluacion(await contexto(slug), evaluacionId);
  if (r.ok) refrescar();
  return r;
}

export async function crearCompetenciaAction(slug: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await crearCompetencia(await contexto(slug), {
    cursoId: texto(f, "cursoId"), nombre: texto(f, "nombre"), descripcion: texto(f, "descripcion"),
  });
  if (r.ok) refrescar();
  return r;
}

export async function eliminarCompetenciaAction(slug: string, competenciaId: string): Promise<Resultado> {
  const r = await eliminarCompetencia(await contexto(slug), competenciaId);
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
    inicio: texto(f, "inicio"), fin: texto(f, "fin"),
  });
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

export async function guardarComentarioNotaAction(slug: string, evaluacionId: string, alumnoId: string, comentario: string): Promise<Resultado> {
  return guardarComentarioNota(await contexto(slug), { evaluacionId, alumnoId, comentario });
}

export async function previsualizarImportacionAction(slug: string, cursoId: string, periodoId: string, texto: string): Promise<VistaPreviaImportacion> {
  return previsualizarImportacionNotas(await contexto(slug), cursoId, periodoId, texto);
}

export async function importarNotasAction(slug: string, cursoId: string, periodoId: string, texto: string): Promise<Resultado> {
  const r = await importarNotas(await contexto(slug), cursoId, periodoId, texto);
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
