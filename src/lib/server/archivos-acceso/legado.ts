import "server-only";
import type { Archivo } from "@/generated/prisma/client";
import { auditar } from "../auditoria";
import { whereComunicadosVisibles } from "../comunicados";
import { puedeVerDocumento } from "../documentos";
import { requireFeature } from "../plan";
import { puedeVerAdjuntoSoporte } from "../soporte";
import { whereTareaVisible } from "../tareas/comun";
import { alumnoIdsVisibles, salonIdsVisibles, type TenantContext } from "../tenant";

// Quién puede ver un archivo privado del colegio (specs/14). Se usa en /archivos/<id>.

export async function resolverAccesoLegado(ctx: TenantContext, archivo: Archivo): Promise<"permitir" | "denegar" | null> {
  if (!archivo.privado || ctx.tenant.logoArchivoId === archivo.id) return "permitir";

  // Adjunto de una justificación: dirección, tutor del salón o el apoderado que la envió.
  const justificacion = await ctx.db.justificacion.findFirst({
    where: { adjuntoArchivoId: archivo.id },
    select: { apoderadoId: true, asistencia: { select: { alumno: { select: { salon: { select: { tutorId: true } } } } } } },
  });
  if (justificacion) {
    // Modo soporte (specs/16): los adjuntos de justificaciones (certificados médicos, datos de menores) no se ven.
    if (ctx.soporte) return "denegar";
    if (
      ctx.rol === "direccion" ||
      (ctx.rol === "profesor" && justificacion.asistencia.alumno.salon.tutorId === ctx.membership.id) ||
      (ctx.rol === "apoderado" && justificacion.apoderadoId === ctx.membership.id)
    ) {
      return "permitir";
    }
    return "denegar";
  }

  // Adjunto de un comunicado: autor, dirección o quien puede ver el comunicado (todo el colegio o su salón).
  if (archivo.comunicadoId) {
    if (await puedeVerComunicado(ctx, archivo.comunicadoId)) return "permitir";
    return "denegar";
  }

  // Material de una tarea (specs/39): dirección, autor, profesores de los salones de sus secciones y familias/alumnos con
  // asignación vigente en la tarea visible.
  if (archivo.tareaId) {
    if (await puedeVerTarea(ctx, archivo.tareaId)) return "permitir";
    return "denegar";
  }

  // Archivo de una ENTREGA (specs/39): solo el alumno, sus apoderados, el profesor del curso de la sección (o el autor) y
  // dirección. No otros profesores del salón ni el modo soporte. Cada descarga se audita.
  if (archivo.entregaId) {
    if (ctx.soporte) return "denegar";
    const e = await ctx.db.tareaEntrega.findFirst({
      where: { id: archivo.entregaId },
      select: { asignacion: { select: { alumnoId: true, tarea: { select: { id: true, creadoPorId: true } }, tareaCurso: { select: { curso: { select: { profesorId: true } } } } } } },
    });
    if (!e) return "denegar";
    const a = e.asignacion;
    const permitido =
      ctx.rol === "direccion" ||
      (ctx.rol === "profesor" && (a.tareaCurso.curso.profesorId === ctx.membership.id || a.tarea.creadoPorId === ctx.membership.id)) ||
      ((ctx.rol === "alumno" || ctx.rol === "apoderado") && (await alumnoIdsVisibles(ctx)).includes(a.alumnoId));
    if (!permitido) return "denegar";
    await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "tarea_entrega_archivo", entidadId: archivo.id, detalle: { descarga: true, tareaId: a.tarea.id, alumnoId: a.alumnoId } });
    return "permitir";
  }

  // Documento de la biblioteca (specs/31): lo ve quien cumple la regla de visibilidad por rol, carpeta y salón. Cada descarga se audita.
  if (archivo.documentoId) {
    requireFeature(ctx, "documentos");
    if (!(await puedeVerDocumento(ctx, archivo.documentoId))) return "denegar";
    await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "documento", entidadId: archivo.documentoId, detalle: { descarga: true, archivoId: archivo.id } });
    return "permitir";
  }

  // Captura de la mesa de ayuda (specs/23): quien ve la conversación, nunca de una nota interna.
  if (archivo.mensajeSoporteId) {
    if (await puedeVerAdjuntoSoporte(ctx, archivo.mensajeSoporteId)) return "permitir";
    return "denegar";
  }

  // Foto de un alumno: quien puede ver al alumno. Nunca en modo soporte (specs/16).
  const alumno = await ctx.db.alumno.findFirst({ where: { fotoArchivoId: archivo.id }, select: { id: true } });
  if (alumno && !ctx.soporte && (await alumnoIdsVisibles(ctx)).includes(alumno.id)) return "permitir";
  return null;
}

/** Misma regla que `listarComunicados` (`whereComunicadosVisibles`): dirección, administrativo y autor siempre; el resto, todo el colegio, sus salones y su nivel o grado. */
export async function puedeVerComunicado(ctx: TenantContext, comunicadoId: string): Promise<boolean> {
  if (!["direccion", "profesor", "apoderado", "administrativo", "alumno"].includes(ctx.rol)) return false;
  return (await ctx.db.comunicado.count({ where: { AND: [{ id: comunicadoId }, await whereComunicadosVisibles(ctx)] } })) > 0;
}

/**
 * Materiales de una tarea (specs/39): dirección y autor siempre; profesores de los salones de sus secciones; familias y
 * alumnos solo si tienen una asignación vigente (no retirada) en la tarea ya publicada y visible.
 */
export async function puedeVerTarea(ctx: TenantContext, tareaId: string): Promise<boolean> {
  const t = await ctx.db.tarea.findFirst({ where: { id: tareaId }, select: { creadoPorId: true, cursos: { select: { curso: { select: { salonId: true } } } } } });
  if (!t) return false;
  if (ctx.rol === "direccion" || t.creadoPorId === ctx.membership.id) return true;
  if (ctx.rol === "profesor") {
    const salones = await salonIdsVisibles(ctx);
    return t.cursos.some((s) => salones.includes(s.curso.salonId));
  }
  if (ctx.rol !== "apoderado" && ctx.rol !== "alumno") return false;
  const n = await ctx.db.tareaAsignacion.count({
    where: { tareaId, alumnoId: { in: await alumnoIdsVisibles(ctx) }, retiradaAt: null, tarea: whereTareaVisible(new Date()) },
  });
  return n > 0;
}
