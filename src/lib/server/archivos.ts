import "server-only";
import { forbidden, notFound } from "next/navigation";
import type { Archivo } from "@/generated/prisma/client";
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
    const c = await ctx.db.comunicado.findFirst({ where: { id: archivo.comunicadoId }, select: { autorId: true, salonId: true } });
    if (c && (await puedeVerComunicado(ctx, c))) return archivo;
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

  // Foto de un alumno: quien puede ver al alumno.
  const alumno = await ctx.db.alumno.findFirst({ where: { fotoArchivoId: archivo.id }, select: { id: true } });
  if (alumno && (await alumnoIdsVisibles(ctx)).includes(alumno.id)) return archivo;
  forbidden();
}

/** Misma regla que `listarComunicados`: dirección y autor siempre; el resto, los de todo el colegio y los de sus salones. */
export async function puedeVerComunicado(ctx: TenantContext, c: { autorId: string; salonId: string | null }): Promise<boolean> {
  if (ctx.rol === "direccion" || c.autorId === ctx.membership.id) return true;
  if (!["profesor", "apoderado", "administrativo", "alumno"].includes(ctx.rol)) return false;
  if (c.salonId === null) return true;
  return (await salonIdsVisibles(ctx)).includes(c.salonId);
}

/** Tareas: dirección y creador siempre; profesores y apoderados solo de sus salones. */
export async function puedeVerTarea(ctx: TenantContext, t: { creadoPorId: string; curso: { salonId: string } }): Promise<boolean> {
  if (ctx.rol === "direccion" || t.creadoPorId === ctx.membership.id) return true;
  if (ctx.rol !== "profesor" && ctx.rol !== "apoderado" && ctx.rol !== "alumno") return false;
  return (await salonIdsVisibles(ctx)).includes(t.curso.salonId);
}
