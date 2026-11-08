import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { MAX_COMENTARIO_TAREA, MAX_TEXTO_ENTREGA, puedeEnviar } from "@/lib/tareas";
import { contarRestantes, guardarAdjuntos, quitarAdjuntos, type EntradaAdjunto } from "../adjuntos";
import { auditar } from "../auditoria";
import { guardarNota, publicarEvaluacion } from "../notas";
import { avisarDevuelta } from "../notificaciones/avisos-tareas";
import { requireFeature } from "../plan";
import type { TenantContext } from "../tenant";
import { limiteDe, mensajeDe, puedeRevisarSeccion, requireAsignacionFamilia, requireTareaDocente, validarAdjuntosTarea } from "./comun";

// Entregas (specs/39): el alumno con cuenta o su apoderado (en nombre del hijo sin cuenta) entrega; el docente puede
// marcar «entregada en físico», devolver para corrección y marcar revisada. Cada envío es un intento numerado; la hora
// real de envío nunca se recalcula.

const esquemaEntrega = z.object({
  texto: z.preprocess((v) => (typeof v === "string" ? v : undefined), z.string().trim().max(MAX_TEXTO_ENTREGA, `El texto es muy largo (máximo ${MAX_TEXTO_ENTREGA} caracteres).`).optional()),
  enviar: z.boolean().default(false),
});

/** Intento en borrador vigente (lo crea si no hay: el siguiente número tras el último enviado). */
async function intentoEnBorrador(ctx: TenantContext, asignacionId: string) {
  const ultimo = await ctx.db.tareaEntrega.findFirst({ where: { asignacionId }, orderBy: { numero: "desc" } });
  if (ultimo?.borrador) return ultimo;
  return ctx.db.tareaEntrega.create({ data: { tenantId: ctx.tenant.id, asignacionId, numero: (ultimo?.numero ?? 0) + 1, borrador: true } });
}

/**
 * Guarda el borrador de la entrega (texto + archivos) y, con `enviar`, la entrega: registra la hora real y si fue tarde.
 * Se bloquea si la tarea se cerró o venció sin permitir tardías. Ya entregada o revisada: hay que anular primero.
 */
export async function guardarEntrega(
  ctx: TenantContext, tareaId: string, alumnoId: string, entrada: unknown,
  archivos: { nuevos?: EntradaAdjunto[]; quitar?: string[] } = {}, ahora = new Date(),
): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const d = esquemaEntrega.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const a = await requireAsignacionFamilia(ctx, tareaId, alumnoId, ahora);
  if (a.estado === "entregada" || a.estado === "revisada") return fallo("Esta tarea ya se entregó. Anula la entrega si quieres cambiarla.");
  const regla = puedeEnviar({ estado: a.tarea.estado, permiteTardias: a.tarea.permiteTardias, limite: limiteDe(a.tarea, a.tareaCurso, ctx.tenant.zonaHoraria) }, ahora);
  if (!regla.ok) return fallo(regla.error);
  const intento = await intentoEnBorrador(ctx, a.id);
  const quitar = archivos.quitar ?? [];
  let validados;
  try {
    validados = validarAdjuntosTarea(ctx, archivos.nuevos ?? [], await contarRestantes(ctx, { entregaId: intento.id }, quitar));
  } catch (e) {
    return fallo(mensajeDe(e));
  }
  await quitarAdjuntos(ctx, { entregaId: intento.id }, quitar);
  await guardarAdjuntos(ctx, { entregaId: intento.id }, validados);
  const texto = d.data.texto === undefined ? intento.texto : d.data.texto || null;
  if (!d.data.enviar) {
    await ctx.db.tareaEntrega.updateMany({ where: { id: intento.id }, data: { texto } });
    if (a.estado === "asignada") await ctx.db.tareaAsignacion.updateMany({ where: { id: a.id, estado: "asignada" }, data: { estado: "en_proceso" } });
    return ok("Borrador guardado.");
  }
  const nArchivos = await ctx.db.archivo.count({ where: { entregaId: intento.id } });
  if (!texto && nArchivos === 0) return fallo("Adjunta un archivo o escribe tu respuesta antes de entregar.");
  // Reclamo atómico: solo se entrega desde un estado pendiente (dos clics no generan dos envíos).
  const r = await ctx.db.tareaAsignacion.updateMany({
    where: { id: a.id, estado: { in: ["asignada", "en_proceso", "devuelta"] } },
    data: { estado: "entregada", entregadaAt: ahora, tarde: regla.tarde, entregadaPorId: ctx.membership.id, enFisico: false },
  });
  if (r.count === 0) return fallo("Esta tarea ya se entregó.");
  await ctx.db.tareaEntrega.updateMany({ where: { id: intento.id }, data: { texto, borrador: false, enviadaAt: ahora, tarde: regla.tarde, enviadaPorId: ctx.membership.id } });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "tarea_entrega", entidadId: intento.id,
    detalle: { tareaId, alumnoId, intento: intento.numero, tarde: regla.tarde, por: ctx.rol },
  });
  return ok(regla.tarde ? "Entregada con retraso." : "¡Entregada!");
}

/** Anula la última entrega (antes de que el docente la revise): vuelve a borrador para corregirla y reenviarla. */
export async function anularEntrega(ctx: TenantContext, tareaId: string, alumnoId: string, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const a = await requireAsignacionFamilia(ctx, tareaId, alumnoId, ahora);
  if (a.estado !== "entregada") return fallo(a.estado === "revisada" ? "El profesor ya revisó esta entrega." : "No hay una entrega para anular.");
  if (a.enFisico) return fallo("Esta entrega la registró el profesor en físico.");
  const regla = puedeEnviar({ estado: a.tarea.estado, permiteTardias: a.tarea.permiteTardias, limite: limiteDe(a.tarea, a.tareaCurso, ctx.tenant.zonaHoraria) }, ahora);
  if (!regla.ok) return fallo(`No puedes anular: ${regla.error.charAt(0).toLowerCase()}${regla.error.slice(1)}`);
  const ultimo = await ctx.db.tareaEntrega.findFirst({ where: { asignacionId: a.id, borrador: false }, orderBy: { numero: "desc" } });
  const r = await ctx.db.tareaAsignacion.updateMany({
    where: { id: a.id, estado: "entregada" },
    data: { estado: a.devueltaAt ? "devuelta" : "en_proceso", entregadaAt: null, tarde: false },
  });
  if (r.count === 0) return fallo("No hay una entrega para anular.");
  if (ultimo) await ctx.db.tareaEntrega.updateMany({ where: { id: ultimo.id }, data: { borrador: true, enviadaAt: null, tarde: false } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "tarea_entrega_anulada", entidadId: ultimo?.id ?? a.id, detalle: { tareaId, alumnoId } });
  return ok("Entrega anulada. Puedes corregirla y volver a entregar.");
}

/** Asignación de una sección que el docente puede revisar (403 si no). */
async function requireAsignacionDocente(ctx: TenantContext, asignacionId: string) {
  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") forbidden();
  const a = await ctx.db.tareaAsignacion.findFirst({
    where: { id: asignacionId },
    include: { tarea: true, tareaCurso: { include: { curso: { select: { profesorId: true } } } } },
  });
  if (!a || !puedeRevisarSeccion(ctx, a.tarea, a.tareaCurso.curso)) forbidden();
  return a;
}

async function comentarioPrivado(ctx: TenantContext, a: { id: string; tareaId: string }, texto: string | undefined) {
  const t = texto?.trim().slice(0, MAX_COMENTARIO_TAREA);
  if (t) await ctx.db.tareaComentario.create({ data: { tenantId: ctx.tenant.id, tareaId: a.tareaId, asignacionId: a.id, autorId: ctx.membership.id, texto: t } });
}

/** El docente marca «entregada en físico» (cuaderno, maqueta…). Cuenta la hora del registro para «tarde». */
export async function marcarEntregaFisica(ctx: TenantContext, asignacionId: string, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const a = await requireAsignacionDocente(ctx, asignacionId);
  if (a.retiradaAt) return fallo("Este estudiante ya no tiene asignada la tarea.");
  if (a.estado === "entregada" || a.estado === "revisada") return fallo("Esta tarea ya figura como entregada.");
  const limite = limiteDe(a.tarea, a.tareaCurso, ctx.tenant.zonaHoraria);
  const tarde = limite !== null && ahora > limite;
  const intento = await intentoEnBorrador(ctx, a.id);
  await ctx.db.tareaEntrega.updateMany({ where: { id: intento.id }, data: { borrador: false, enviadaAt: ahora, tarde, enviadaPorId: ctx.membership.id } });
  await ctx.db.tareaAsignacion.updateMany({ where: { id: a.id }, data: { estado: "entregada", entregadaAt: ahora, tarde, enFisico: true, entregadaPorId: ctx.membership.id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "tarea_entrega", entidadId: intento.id, detalle: { tareaId: a.tareaId, alumnoId: a.alumnoId, enFisico: true, tarde } });
  return ok("Marcada como entregada en físico.");
}

/** Devuelve la entrega para corrección (con observación privada opcional). El alumno puede reentregar (nuevo intento). */
export async function devolverEntrega(ctx: TenantContext, asignacionId: string, observacion?: string, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const a = await requireAsignacionDocente(ctx, asignacionId);
  const r = await ctx.db.tareaAsignacion.updateMany({ where: { id: a.id, estado: { in: ["entregada", "revisada"] } }, data: { estado: "devuelta", devueltaAt: ahora, revisadaAt: null } });
  if (r.count === 0) return fallo("Solo se devuelven tareas entregadas.");
  await comentarioPrivado(ctx, a, observacion);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "tarea_devuelta", entidadId: a.id, detalle: { tareaId: a.tareaId, alumnoId: a.alumnoId } });
  await avisarDevuelta(ctx, a.id);
  return ok("Devuelta para corrección.");
}

/** Marca la entrega como revisada (con observación privada opcional). */
export async function marcarRevisada(ctx: TenantContext, asignacionId: string, observacion?: string, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const a = await requireAsignacionDocente(ctx, asignacionId);
  const r = await ctx.db.tareaAsignacion.updateMany({ where: { id: a.id, estado: "entregada" }, data: { estado: "revisada", revisadaAt: ahora } });
  if (r.count === 0) return fallo("Solo se revisan tareas entregadas.");
  await comentarioPrivado(ctx, a, observacion);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "tarea_revisada", entidadId: a.id, detalle: { tareaId: a.tareaId, alumnoId: a.alumnoId } });
  return ok("Marcada como revisada.");
}

/**
 * Calificación (specs/39 · 6): pone la nota en la evaluación ligada a la sección con `guardarNota` (mismo registro,
 * historial y reglas). Nunca NSP; solo a asignados (lo valida `guardarNota`).
 */
export async function calificarEntrega(ctx: TenantContext, asignacionId: string, entrada: { valor: string; motivo?: string; tipo?: string }): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const a = await requireAsignacionDocente(ctx, asignacionId);
  if (!a.tareaCurso.evaluacionGrupoId) return fallo("Esta tarea no es calificable.");
  const e = await ctx.db.evaluacion.findFirst({ where: { grupoId: a.tareaCurso.evaluacionGrupoId, tareaId: a.tareaId }, select: { id: true } });
  if (!e) return fallo("No encontramos la columna de calificación de esta tarea.");
  return guardarNota(ctx, { evaluacionId: e.id, alumnoId: a.alumnoId, ...entrada });
}

/**
 * «Marcar NE a quienes no entregaron» (acción explícita del docente, nunca automática): NE en la evaluación de la sección
 * para asignados vigentes sin entrega y sin nota. Devuelve cuántos marcó.
 */
export async function marcarNoEntregaron(ctx: TenantContext, tareaId: string, tareaCursoId: string): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const { secciones } = await requireTareaDocente(ctx, tareaId);
  const s = secciones.find((x) => x.id === tareaCursoId);
  if (!s) forbidden();
  if (!s.evaluacionGrupoId) return fallo("Esta tarea no es calificable.");
  const e = await ctx.db.evaluacion.findFirst({ where: { grupoId: s.evaluacionGrupoId, tareaId }, select: { id: true } });
  if (!e) return fallo("No encontramos la columna de calificación de esta tarea.");
  const pendientes = await ctx.db.tareaAsignacion.findMany({
    where: { tareaId, tareaCursoId, retiradaAt: null, estado: { in: ["asignada", "en_proceso"] }, alumno: { notas: { none: { evaluacionId: e.id } } } },
    select: { alumnoId: true },
  });
  let marcados = 0;
  for (const p of pendientes) {
    const r = await guardarNota(ctx, { evaluacionId: e.id, alumnoId: p.alumnoId, valor: "NE" });
    if (r.ok) marcados++;
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "tarea_ne", entidadId: tareaId, detalle: { seccion: tareaCursoId, marcados } });
  return ok(marcados === 0 ? "Nadie quedó sin entregar." : `Marcamos «NE» a ${marcados} ${marcados === 1 ? "estudiante" : "estudiantes"}.`);
}

/**
 * Revisión con nota (specs/39): guarda la nota del alumno en la columna de su sección, marca la entrega como revisada
 * y, si hay observación, la deja como comentario privado. «Lo entregó en físico» registra la entrega antes. Después de
 * «Subir notas», la nota se corrige desde el Registro de notas (con motivo).
 */
export async function revisarConNota(ctx: TenantContext, asignacionId: string, entrada: { valor: string; observacion?: string; enFisico?: boolean }, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const a = await requireAsignacionDocente(ctx, asignacionId);
  if (a.retiradaAt) return fallo("Este estudiante ya no tiene asignada la tarea.");
  if (!a.tareaCurso.evaluacionGrupoId) return fallo("Primero elige la competencia de esta tarea.");
  const e = await ctx.db.evaluacion.findFirst({ where: { grupoId: a.tareaCurso.evaluacionGrupoId, tareaId: a.tareaId }, select: { id: true, estado: true } });
  if (!e) return fallo("No encontramos la columna de notas de esta tarea.");
  if (e.estado === "publicada") return fallo("Las notas ya se subieron: para cambiar esta nota, corrígela en el Registro de notas.");
  const valor = entrada.valor.trim();
  if (!valor) return fallo("Elige la nota.");
  if (valor.toUpperCase() === "NE") return fallo("«NE» se pone solo al subir notas, a quienes no entregaron.");
  const sinEntrega = a.estado === "asignada" || a.estado === "en_proceso" || a.estado === "devuelta";
  if (sinEntrega && !entrada.enFisico) return fallo("Este estudiante no entregó. Si te lo dio en clase, marca «Lo entregó en físico».");
  const r = await guardarNota(ctx, { evaluacionId: e.id, alumnoId: a.alumnoId, valor });
  if (!r.ok) return r;
  if (sinEntrega) {
    const f = await marcarEntregaFisica(ctx, asignacionId, ahora);
    if (!f.ok) return f;
  }
  await ctx.db.tareaAsignacion.updateMany({ where: { id: a.id, estado: "entregada" }, data: { estado: "revisada", revisadaAt: ahora } });
  await comentarioPrivado(ctx, a, entrada.observacion);
  return ok("Nota guardada.");
}

/**
 * «Subir notas» de una sección (specs/39): exige nota en cada estudiante que entregó; pone «NE» a quienes no entregaron
 * y publica la columna del registro con `publicarEvaluacion` (outbox: aviso «Tarea calificada» al apoderado y al alumno).
 */
export async function subirNotasDeSeccion(ctx: TenantContext, tareaId: string, tareaCursoId: string): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  requireFeature(ctx, "notas");
  const { secciones } = await requireTareaDocente(ctx, tareaId);
  const s = secciones.find((x) => x.id === tareaCursoId);
  if (!s) forbidden();
  if (!s.evaluacionGrupoId) return fallo("Primero elige la competencia de esta tarea.");
  const e = await ctx.db.evaluacion.findFirst({ where: { grupoId: s.evaluacionGrupoId, tareaId }, select: { id: true, estado: true } });
  if (!e) return fallo("No encontramos la columna de notas de esta tarea.");
  if (e.estado === "publicada") return fallo("Las notas de este salón ya se subieron.");
  const entregaron = await ctx.db.tareaAsignacion.findMany({
    where: { tareaId, tareaCursoId, retiradaAt: null, estado: { in: ["entregada", "revisada", "devuelta"] } },
    select: { alumnoId: true },
  });
  const conNota = new Set((await ctx.db.nota.findMany({ where: { evaluacionId: e.id }, select: { alumnoId: true } })).map((n) => n.alumnoId));
  const faltan = entregaron.filter((x) => !conNota.has(x.alumnoId)).length;
  if (faltan > 0) return fallo(`Falta poner nota a ${faltan} ${faltan === 1 ? "estudiante que entregó" : "estudiantes que entregaron"}.`);
  const ne = await marcarNoEntregaron(ctx, tareaId, tareaCursoId);
  if (!ne.ok) return ne;
  const r = await publicarEvaluacion(ctx, s.evaluacionGrupoId);
  if (!r.ok) return r;
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "tarea_notas_subidas", entidadId: tareaId, detalle: { seccion: tareaCursoId } });
  return ok("Notas subidas. Las familias y los estudiantes ya ven la nota y reciben un aviso en Khipu.");
}
