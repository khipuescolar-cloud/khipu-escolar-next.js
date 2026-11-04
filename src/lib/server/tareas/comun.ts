import "server-only";
import { forbidden } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { ACCEPT_TAREAS, extensionCoincide, limiteEfectivo, limitesAdjuntosTarea, TIPOS_TAREA_TEXTO } from "@/lib/tareas";
import { MIME_DOCX, MIME_ODT, MIME_PPTX, MIME_XLSX, validarAdjuntos, type EntradaAdjunto, type MimeAdjunto } from "../adjuntos";
import { ErrorDeNegocio } from "../contexto-accion";
import type { DbTenant } from "../db";
import { alumnoIdsVisibles, type TenantContext } from "../tenant";

// Piezas comunes del módulo de tareas (specs/39): permisos, límites, visibilidad y sincronización de destinatarios.

export const MIMES_TAREA: ReadonlySet<MimeAdjunto> = new Set<MimeAdjunto>([
  "application/pdf", "image/jpeg", "image/png", "image/webp", MIME_DOCX, MIME_XLSX, MIME_PPTX, MIME_ODT,
]);

/** Límites de adjuntos de tareas del colegio (acotados al techo duro) para el cliente. */
export function limitesTarea(ctx: TenantContext) {
  return { ...limitesAdjuntosTarea(ctx.tenant), tiposTexto: TIPOS_TAREA_TEXTO, accept: ACCEPT_TAREAS };
}

/** Valida adjuntos de materiales o entregas con los límites del colegio, el tipo real y la extensión. */
export function validarAdjuntosTarea(ctx: TenantContext, entradas: EntradaAdjunto[], yaTiene = 0) {
  const l = limitesAdjuntosTarea(ctx.tenant);
  return validarAdjuntos(entradas, yaTiene, { maxArchivos: l.archivos, maxBytes: l.bytes, tipos: MIMES_TAREA, tiposTexto: TIPOS_TAREA_TEXTO, exigirExtension: extensionCoincide });
}

/** Convierte ErrorDeNegocio en mensaje; relanza lo demás. */
export function mensajeDe(e: unknown): string {
  if (e instanceof ErrorDeNegocio) return e.message;
  throw e;
}

/** Tarea visible para familias y alumnos: publicada o con entregas cerradas, y ya llegó su hora de publicación. */
export function whereTareaVisible(ahora: Date): Prisma.TareaWhereInput {
  return { estado: { in: ["publicada", "cerrada"] }, OR: [{ publicarEn: null }, { publicarEn: { lte: ahora } }] };
}

/** Límite efectivo de una asignación: el de su sección, si tiene; si no, el de la tarea. */
export function limiteDe(
  t: { fechaEntrega: Date | null; conHora: boolean },
  seccion: { fechaEntrega: Date | null } | null | undefined,
  zona: string,
): Date | null {
  return limiteEfectivo(seccion?.fechaEntrega ?? t.fechaEntrega, t.conHora, zona);
}

/**
 * ¿Puede el usuario gestionar (revisar, devolver, ver entregas) la sección? Dirección siempre; profesor solo si dicta ese
 * curso o creó la tarea. NO basta con ser tutor u otro profesor del salón. El modo soporte no ve entregas.
 */
export function puedeRevisarSeccion(ctx: TenantContext, t: { creadoPorId: string }, curso: { profesorId: string | null }): boolean {
  if (ctx.soporte) return false;
  if (ctx.rol === "direccion") return true;
  return ctx.rol === "profesor" && (curso.profesorId === ctx.membership.id || t.creadoPorId === ctx.membership.id);
}

/** Carga la tarea con sus secciones y exige que el usuario pueda revisar al menos una (403 si no). */
export async function requireTareaDocente(ctx: TenantContext, tareaId: string) {
  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") forbidden();
  const t = await ctx.db.tarea.findFirst({
    where: { id: tareaId },
    include: { cursos: { include: { curso: { select: { id: true, nombre: true, profesorId: true, salonId: true, salon: { select: { nombre: true } } } } } } },
  });
  if (!t) forbidden();
  const propias = t.cursos.filter((s) => puedeRevisarSeccion(ctx, t, s.curso));
  if (propias.length === 0) forbidden();
  return { tarea: t, secciones: propias };
}

/** Exige que el usuario sea autor (creador o profesor del curso de origen) para editar la tarea. Dirección solo consulta. */
export async function requireTareaAutor(ctx: TenantContext, tareaId: string) {
  if (ctx.rol !== "profesor") forbidden();
  const t = await ctx.db.tarea.findFirst({ where: { id: tareaId }, include: { curso: { select: { profesorId: true } } } });
  if (!t) forbidden();
  if (t.creadoPorId !== ctx.membership.id && t.curso.profesorId !== ctx.membership.id) forbidden();
  return t;
}

/**
 * Asignación vigente y visible de un alumno que el usuario (alumno o apoderado) puede ver; 403 si no.
 * El alumno solo actúa por sí mismo; el apoderado, por sus hijos vinculados.
 */
export async function requireAsignacionFamilia(ctx: TenantContext, tareaId: string, alumnoId: string, ahora = new Date()) {
  if (ctx.rol !== "alumno" && ctx.rol !== "apoderado") forbidden();
  if (!(await alumnoIdsVisibles(ctx)).includes(alumnoId)) forbidden();
  const a = await ctx.db.tareaAsignacion.findFirst({
    where: { tareaId, alumnoId, retiradaAt: null, tarea: whereTareaVisible(ahora) },
    include: {
      tarea: true,
      tareaCurso: { select: { id: true, fechaEntrega: true, evaluacionGrupoId: true, curso: { select: { nombre: true, profesorId: true } } } },
    },
  });
  if (!a) forbidden();
  return a;
}

/**
 * Crea las asignaciones que faltan en las secciones «Todos» de la tarea (alumnos activos del salón, incluidos los que
 * llegaron después). Idempotente (`createMany skipDuplicates` sobre unique(tarea, alumno)); no revive a los retirados.
 */
export async function sincronizarAsignaciones(tdb: DbTenant, tenantId: string, tareaId: string): Promise<number> {
  const secciones = await tdb.tareaCurso.findMany({ where: { tareaId, todos: true }, select: { id: true, curso: { select: { salonId: true } } } });
  let creadas = 0;
  for (const s of secciones) {
    const alumnos = await tdb.alumno.findMany({ where: { salonId: s.curso.salonId, estado: "activo" }, select: { id: true } });
    if (alumnos.length === 0) continue;
    const r = await tdb.tareaAsignacion.createMany({
      data: alumnos.map((a) => ({ tenantId, tareaId, tareaCursoId: s.id, alumnoId: a.id })),
      skipDuplicates: true,
    });
    creadas += r.count;
  }
  return creadas;
}

/**
 * Para las vistas de familia: crea las asignaciones faltantes de los alumnos dados en secciones «Todos» de tareas
 * visibles de su salón (alumno nuevo en el salón). Una consulta + un createMany.
 */
export async function asegurarAsignacionesDeAlumnos(tdb: DbTenant, tenantId: string, alumnos: { id: string; salonId: string }[], ahora = new Date()) {
  if (alumnos.length === 0) return;
  const secciones = await tdb.tareaCurso.findMany({
    where: { todos: true, curso: { salonId: { in: [...new Set(alumnos.map((a) => a.salonId))] } }, tarea: whereTareaVisible(ahora) },
    select: { id: true, tareaId: true, curso: { select: { salonId: true } } },
  });
  const data = secciones.flatMap((s) => alumnos.filter((a) => a.salonId === s.curso.salonId).map((a) => ({ tenantId, tareaId: s.tareaId, tareaCursoId: s.id, alumnoId: a.id })));
  if (data.length > 0) await tdb.tareaAsignacion.createMany({ data, skipDuplicates: true });
}
