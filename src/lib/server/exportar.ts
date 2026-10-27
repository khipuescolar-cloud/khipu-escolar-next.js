import "server-only";
import { auditar } from "./auditoria";
import { db } from "./db";
import { requireRol, type TenantContext } from "./tenant";

// Garantía de salida del piloto (specs/15-privacidad-auditoria-exportacion.md): todos los datos del colegio en JSON.

/** Convierte BigInt (auditoría) a texto para poder serializar. */
export function aJson(valor: unknown): string {
  return JSON.stringify(valor, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

/**
 * Datos completos del colegio. Solo dirección; queda auditado.
 * No incluye secretos: se omiten los hashes de tokens de justificación y de carnets QR.
 */
export async function exportarColegio(ctx: TenantContext) {
  requireRol(ctx, ["direccion"]);
  const d = ctx.db;
  const [
    memberships, salones, cursos, alumnos, apoderadosAlumnos, consentimientos, auditoria, asistencias, avisos, justificaciones, archivos,
    conversaciones, mensajes, comunicados, preferenciasAviso, periodos, competencias, evaluaciones, notas, calificacionesPeriodo, tareas,
    eventosAgenda, documentosColegio, nuditoConversaciones, nuditoMensajes,
  ] = await Promise.all([
    d.membership.findMany(), d.salon.findMany(), d.curso.findMany(), d.alumno.findMany(), d.apoderadoAlumno.findMany(),
    d.consentimiento.findMany(), d.auditoria.findMany(), d.asistencia.findMany(), d.aviso.findMany(), d.justificacion.findMany(),
    d.archivo.findMany(), d.conversacion.findMany(), d.mensaje.findMany(), d.comunicado.findMany(), d.preferenciaAviso.findMany(),
    d.periodo.findMany(), d.competencia.findMany(), d.evaluacion.findMany(), d.nota.findMany(), d.calificacionPeriodo.findMany(),
    d.tarea.findMany(), d.eventoAgenda.findMany(), d.documentoColegio.findMany(), d.nuditoConversacion.findMany(), d.nuditoMensaje.findMany(),
  ]);
  const perfiles = await db.profile.findMany({
    where: { id: { in: [...new Set(memberships.map((m) => m.userId))] } },
    select: { id: true, email: true, nombres: true, apellidos: true, telefono: true },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "exportar", entidad: "colegio", entidadId: ctx.tenant.id });
  return {
    exportadoAt: new Date().toISOString(),
    colegio: { id: ctx.tenant.id, slug: ctx.tenant.slug, nombre: ctx.tenant.nombre, plan: ctx.tenant.plan },
    perfiles, memberships, salones, cursos, alumnos, apoderadosAlumnos, consentimientos, asistencias, avisos, justificaciones, archivos,
    conversaciones, mensajes, comunicados, preferenciasAviso, periodos, competencias, evaluaciones, notas, calificacionesPeriodo, tareas,
    eventosAgenda, documentosColegio, nuditoConversaciones, nuditoMensajes, auditoria,
  };
}

/** Vista de la bitácora para `/configuracion/auditoria` (más recientes primero). */
export async function listarAuditoria(ctx: TenantContext, filtro: { accion?: string; entidad?: string } = {}) {
  requireRol(ctx, ["direccion"]);
  const filas = await ctx.db.auditoria.findMany({
    where: { ...(filtro.accion ? { accion: filtro.accion } : {}), ...(filtro.entidad ? { entidad: filtro.entidad } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const actores = await db.profile.findMany({
    where: { id: { in: [...new Set(filas.map((f) => f.actorId).filter((x): x is string => !!x))] } },
    select: { id: true, nombres: true, apellidos: true },
  });
  const nombre = new Map(actores.map((a) => [a.id, `${a.nombres} ${a.apellidos}`.trim()]));
  return filas.map((f) => ({ ...f, id: f.id.toString(), actor: f.actorId ? (nombre.get(f.actorId) ?? "Usuario eliminado") : "Sistema" }));
}
