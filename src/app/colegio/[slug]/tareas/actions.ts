"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { fallo, type Resultado } from "@/lib/resultado";
import { adjuntosDeFormData, idsParaQuitar } from "@/lib/server/adjuntos";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { requireFeature } from "@/lib/server/plan";
import {
  actualizarTarea, anularEntrega, archivarTarea, calificarEntrega, cambiarCierreTarea, cambiarPlazo, comentarTarea, crearTarea, devolverEntrega,
  editarDestinatarios, eliminarTarea, guardarEntrega, marcarEntregaFisica, marcarNoEntregaron, marcarRevisada, ocultarComentario, publicarTarea,
} from "@/lib/server/tareas";
import { requireTenantContext } from "@/lib/server/tenant";

// Server actions del módulo de tareas (specs/39). Toda la lógica y los permisos viven en src/lib/server/tareas.

const texto = (f: FormData, k: string) => String(f.get(k) ?? "");
const marcado = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

async function contexto(slug: string) {
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "tareas");
  return ctx;
}

function json<T>(f: FormData, k: string, defecto: T): T {
  try {
    const v = f.get(k);
    return typeof v === "string" && v ? (JSON.parse(v) as T) : defecto;
  } catch {
    return defecto;
  }
}

/** Enlaces: uno por línea (`enlacesTexto`) o JSON (`enlaces`). */
function enlacesDe(f: FormData) {
  if (f.has("enlacesTexto")) return texto(f, "enlacesTexto").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((url) => ({ url }));
  return json(f, "enlaces", undefined);
}

function refrescar(tareaId?: string) {
  revalidatePath("/colegio/[slug]/tareas", "page");
  if (tareaId) {
    revalidatePath("/colegio/[slug]/tareas/[id]", "page");
    revalidatePath("/colegio/[slug]/tareas/[id]/revision", "page");
  }
}

/** Envía en segundo plano los push encolados por la acción. */
function despacharAvisos(tenantId: string) {
  after(async () => {
    try {
      await procesarCola({ tenantId });
    } catch (error) {
      console.error("[avisos] error al procesar la cola", error);
    }
  });
}

export async function crearTareaAction(slug: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  const avisarFamilias = marcado(f, "avisarFamilias");
  const r = await crearTarea(ctx, {
    cursoId: texto(f, "cursoId"), titulo: texto(f, "titulo"), descripcion: texto(f, "descripcion"), indicacionesEntrega: texto(f, "indicacionesEntrega"),
    fechaEntrega: texto(f, "fechaEntrega"), horaEntrega: texto(f, "horaEntrega"), permiteTardias: f.has("permiteTardias") ? marcado(f, "permiteTardias") : false,
    comentariosGenerales: marcado(f, "comentariosGenerales"), calificable: marcado(f, "calificable"), accion: texto(f, "accion") || "publicar",
    publicarEn: texto(f, "publicarEn"), secciones: json(f, "secciones", undefined), enlaces: enlacesDe(f), avisarFamilias,
    materialesExistentes: json(f, "materialesExistentes", []),
  }, await adjuntosDeFormData(f));
  if (r.ok) {
    refrescar();
    if (avisarFamilias) despacharAvisos(ctx.tenant.id);
  }
  return { ...r } as Resultado;
}

export async function actualizarTareaAction(slug: string, tareaId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await actualizarTarea(ctx, tareaId, {
    titulo: texto(f, "titulo"), descripcion: texto(f, "descripcion"), indicacionesEntrega: texto(f, "indicacionesEntrega"),
    fechaEntrega: texto(f, "fechaEntrega"), horaEntrega: texto(f, "horaEntrega"), motivoPlazo: texto(f, "motivoPlazo"),
    permiteTardias: marcado(f, "permiteTardias"), comentariosGenerales: marcado(f, "comentariosGenerales"), enlaces: enlacesDe(f),
    materialesExistentes: json(f, "materialesExistentes", []),
  }, { nuevos: await adjuntosDeFormData(f), quitar: idsParaQuitar(f) });
  if (r.ok) {
    refrescar(tareaId);
    despacharAvisos(ctx.tenant.id);
  }
  return r;
}

export async function cambiarPlazoAction(slug: string, tareaId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await cambiarPlazo(ctx, tareaId, { fechaEntrega: texto(f, "fechaEntrega"), horaEntrega: texto(f, "horaEntrega"), tareaCursoId: texto(f, "tareaCursoId"), motivo: texto(f, "motivo") });
  if (r.ok) {
    refrescar(tareaId);
    despacharAvisos(ctx.tenant.id);
  }
  return r;
}

export async function publicarTareaAction(slug: string, tareaId: string): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await publicarTarea(ctx, tareaId, { avisarFamilias: true });
  if (r.ok) {
    refrescar(tareaId);
    despacharAvisos(ctx.tenant.id);
  }
  return r;
}

export async function cerrarTareaAction(slug: string, tareaId: string, f: FormData): Promise<Resultado> {
  const r = await cambiarCierreTarea(await contexto(slug), tareaId, f.get("cerrar") !== "false");
  if (r.ok) refrescar(tareaId);
  return r;
}

export async function archivarTareaAction(slug: string, tareaId: string): Promise<Resultado> {
  const r = await archivarTarea(await contexto(slug), tareaId);
  if (r.ok) refrescar(tareaId);
  return r;
}

export async function eliminarTareaAction(slug: string, tareaId: string): Promise<Resultado> {
  const r = await eliminarTarea(await contexto(slug), tareaId);
  if (r.ok) refrescar();
  return r;
}

export async function editarDestinatariosAction(slug: string, tareaId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await editarDestinatarios(await contexto(slug), tareaId, {
    tareaCursoId: texto(f, "tareaCursoId"), todos: marcado(f, "todos"),
    agregar: f.getAll("agregar").map(String), quitar: f.getAll("quitar").map(String),
  });
  if (r.ok) refrescar(tareaId);
  return r;
}

// ───────── Familia / alumno ─────────

export async function guardarEntregaAction(slug: string, tareaId: string, alumnoId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await guardarEntrega(ctx, tareaId, alumnoId, { texto: texto(f, "texto"), enviar: texto(f, "enviar") === "si" }, { nuevos: await adjuntosDeFormData(f), quitar: idsParaQuitar(f) });
  if (r.ok) refrescar(tareaId);
  return r;
}

export async function anularEntregaAction(slug: string, tareaId: string, alumnoId: string): Promise<Resultado> {
  const r = await anularEntrega(await contexto(slug), tareaId, alumnoId);
  if (r.ok) refrescar(tareaId);
  return r;
}

export async function comentarTareaAction(slug: string, tareaId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await comentarTarea(await contexto(slug), tareaId, {
    texto: texto(f, "texto"), alumnoId: texto(f, "alumnoId") || undefined, asignacionId: texto(f, "asignacionId") || undefined, general: marcado(f, "general"),
  });
  if (r.ok) refrescar(tareaId);
  return r;
}

// ───────── Revisión ─────────

export async function devolverEntregaAction(slug: string, tareaId: string, asignacionId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await devolverEntrega(ctx, asignacionId, texto(f, "observacion"));
  if (r.ok) {
    refrescar(tareaId);
    despacharAvisos(ctx.tenant.id);
  }
  return r;
}

export async function revisarEntregaAction(slug: string, tareaId: string, asignacionId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await marcarRevisada(await contexto(slug), asignacionId, texto(f, "observacion"));
  if (r.ok) refrescar(tareaId);
  return r;
}

export async function entregaFisicaAction(slug: string, tareaId: string, asignacionId: string): Promise<Resultado> {
  const r = await marcarEntregaFisica(await contexto(slug), asignacionId);
  if (r.ok) refrescar(tareaId);
  return r;
}

export async function calificarEntregaAction(slug: string, tareaId: string, asignacionId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const valor = texto(f, "valor");
  if (!valor.trim()) return fallo("Escribe la nota.");
  const r = await calificarEntrega(await contexto(slug), asignacionId, { valor, motivo: texto(f, "motivo") || undefined, tipo: texto(f, "tipo") || undefined });
  if (r.ok) refrescar(tareaId);
  return r;
}

export async function marcarNoEntregaronAction(slug: string, tareaId: string, tareaCursoId: string): Promise<Resultado> {
  const r = await marcarNoEntregaron(await contexto(slug), tareaId, tareaCursoId);
  if (r.ok) refrescar(tareaId);
  return r;
}

export async function ocultarComentarioAction(slug: string, tareaId: string, comentarioId: string): Promise<Resultado> {
  const r = await ocultarComentario(await contexto(slug), comentarioId);
  if (r.ok) refrescar(tareaId);
  return r;
}
