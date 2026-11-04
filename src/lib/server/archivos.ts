import "server-only";
import { forbidden, notFound } from "next/navigation";
import type { Archivo } from "@/generated/prisma/client";
import { auditar } from "./auditoria";
import { whereComunicadosVisibles } from "./comunicados";
import { puedeVerDocumento } from "./documentos";
import { requireFeature } from "./plan";
import { puedeVerAdjuntoSoporte } from "./soporte";
import { alumnoIdsVisibles, salonIdsVisibles, type TenantContext } from "./tenant";

// Quién puede ver un archivo privado del colegio (specs/14). Se usa en /archivos/<id>.

export async function requireArchivoVisible(ctx: TenantContext, archivoId: string): Promise<Archivo> {
  const archivo = await ctx.db.archivo.findUnique({ where: { id: archivoId } });
  if (!archivo) notFound();
  if (!archivo.privado || ctx.tenant.logoArchivoId === archivo.id) return archivo;

  // Adjunto de una justificación: dirección, tutor del salón o el apoderado que la envió.
  const justificacion = await ctx.db.justificacion.findFirst({
    where: { adjuntoArchivoId: archivo.id },
    select: { apoderadoId: true, asistencia: { select: { alumno: { select: { salon: { select: { tutorId: true } } } } } } },
  });
  if (justificacion) {
    // Modo soporte (specs/16): los adjuntos de justificaciones (certificados médicos, datos de menores) no se ven.
    if (ctx.soporte) forbidden();
    if (
      ctx.rol === "direccion" ||
      (ctx.rol === "profesor" && justificacion.asistencia.alumno.salon.tutorId === ctx.membership.id) ||
      (ctx.rol === "apoderado" && justificacion.apoderadoId === ctx.membership.id)
    ) {
      return archivo;
    }
    forbidden();
  }

  // Adjunto de un comunicado: autor, dirección o quien puede ver el comunicado (todo el colegio o su salón).
  if (archivo.comunicadoId) {
    if (await puedeVerComunicado(ctx, archivo.comunicadoId)) return archivo;
    forbidden();
  }

  // Adjunto de una tarea: dirección, quien la creó, profesores del curso/salón y familias de ese salón.
  if (archivo.tareaId) {
    const t = await ctx.db.tarea.findFirst({
      where: { id: archivo.tareaId },
      select: { creadoPorId: true, curso: { select: { salonId: true } } },
    });
    if (t && (await puedeVerTarea(ctx, t))) return archivo;
    forbidden();
  }

  // Documento de la biblioteca (specs/31): lo ve quien cumple la regla de visibilidad por rol, carpeta y salón. Cada descarga se audita.
  if (archivo.documentoId) {
    requireFeature(ctx, "documentos");
    if (!(await puedeVerDocumento(ctx, archivo.documentoId))) forbidden();
    await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "documento", entidadId: archivo.documentoId, detalle: { descarga: true, archivoId: archivo.id } });
    return archivo;
  }

  // Captura de la mesa de ayuda (specs/23): quien ve la conversación, nunca de una nota interna.
  if (archivo.mensajeSoporteId) {
    if (await puedeVerAdjuntoSoporte(ctx, archivo.mensajeSoporteId)) return archivo;
    forbidden();
  }

  // Foto de un alumno: quien puede ver al alumno. Nunca en modo soporte (specs/16).
  const alumno = await ctx.db.alumno.findFirst({ where: { fotoArchivoId: archivo.id }, select: { id: true } });
  if (alumno && !ctx.soporte && (await alumnoIdsVisibles(ctx)).includes(alumno.id)) return archivo;
  forbidden();
}

/** Misma regla que `listarComunicados` (`whereComunicadosVisibles`): dirección, administrativo y autor siempre; el resto, todo el colegio, sus salones y su nivel o grado. */
export async function puedeVerComunicado(ctx: TenantContext, comunicadoId: string): Promise<boolean> {
  if (!["direccion", "profesor", "apoderado", "administrativo", "alumno"].includes(ctx.rol)) return false;
  return (await ctx.db.comunicado.count({ where: { AND: [{ id: comunicadoId }, await whereComunicadosVisibles(ctx)] } })) > 0;
}

/** Tareas: dirección y creador siempre; profesores y apoderados solo de sus salones. */
export async function puedeVerTarea(ctx: TenantContext, t: { creadoPorId: string; curso: { salonId: string } }): Promise<boolean> {
  if (ctx.rol === "direccion" || t.creadoPorId === ctx.membership.id) return true;
  if (ctx.rol !== "profesor" && ctx.rol !== "apoderado" && ctx.rol !== "alumno") return false;
  return (await salonIdsVisibles(ctx)).includes(t.curso.salonId);
}
