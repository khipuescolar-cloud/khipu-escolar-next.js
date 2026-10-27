import "server-only";
import { forbidden, notFound } from "next/navigation";
import type { Archivo } from "@/generated/prisma/client";
import { alumnoIdsVisibles, type TenantContext } from "./tenant";

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

  // Foto de un alumno: quien puede ver al alumno.
  const alumno = await ctx.db.alumno.findFirst({ where: { fotoArchivoId: archivo.id }, select: { id: true } });
  if (alumno && (await alumnoIdsVisibles(ctx)).includes(alumno.id)) return archivo;
  forbidden();
}
