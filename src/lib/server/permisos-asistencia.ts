import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { diasEntre, fechaDb, isoDeFechaDb, momentoEnZona } from "@/lib/fechas";
import { cubreDiaCompleto, cubreHora, type PermisoCobertura } from "@/lib/permisos-asistencia";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { auditar } from "./auditoria";
import type { DbTenant } from "./db";
import { sincronizarNsp } from "./nsp";
import { requireFeature } from "./plan";
import { requireRol, salonIdsVisibles, type TenantContext } from "./tenant";

// Permisos de asistencia (specs/04). El colegio autoriza que un alumno no asista (todo el día) o falte unas horas,
// entre dos fechas. Regla aprobada: las tardanzas y los permisos autorizados no se convierten en NSP (specs/37).
// - Un permiso de día completo evita la falta automática del control de ingreso y su aviso (specs/05).
// - Una falta cubierta por un permiso vigente no genera NSP; si el permiso se registra después, el NSP automático se
//   retira (con historial), igual que al corregir una falta a presente. Al anularlo, vuelve el NSP si la falta sigue.
// - Registran y anulan: dirección, administrativo y el tutor del salón del alumno. Los demás profesores, solo lectura.
// - No se borran: se anulan con motivo (quién y cuándo).

export const MAX_DIAS_PERMISO = 60;
const ROLES_LECTURA = ["direccion", "administrativo", "profesor"] as const;
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Escribe la hora como 10:30.");
const vacioAIndefinido = (v: unknown) => (v === "" || v === null ? undefined : v);

const esquemaPermiso = z
  .object({
    alumnoId: z.uuid("Elige al alumno."),
    desde: z.iso.date("Elige la fecha de inicio."),
    hasta: z.iso.date("Elige la fecha final."),
    todoElDia: z.boolean().default(true),
    horaDesde: z.preprocess(vacioAIndefinido, hhmm.optional()),
    horaHasta: z.preprocess(vacioAIndefinido, hhmm.optional()),
    motivo: z.string().trim().min(3, "Escribe el motivo del permiso.").max(500, "El motivo es muy largo (máximo 500 caracteres)."),
  })
  .refine((d) => d.desde <= d.hasta, { message: "La fecha final no puede ser anterior a la de inicio.", path: ["hasta"] })
  .refine((d) => diasEntre(d.desde, d.hasta) + 1 <= MAX_DIAS_PERMISO, { message: `Un permiso no puede pasar de ${MAX_DIAS_PERMISO} días.`, path: ["hasta"] })
  .refine((d) => d.todoElDia || (d.horaDesde && d.horaHasta && d.horaDesde < d.horaHasta), {
    message: "Indica desde y hasta qué hora es el permiso (la hora final debe ser posterior).",
    path: ["horaHasta"],
  });

const esquemaAnular = z.object({
  permisoId: z.uuid(),
  motivo: z.string().trim().min(3, "Escribe por qué anulas el permiso.").max(500, "El motivo es muy largo (máximo 500 caracteres)."),
});

/** ¿Puede registrar o anular permisos de un alumno de ese salón? Dirección y administrativo siempre; profesor, si es su tutor. */
function puedeGestionar(ctx: TenantContext, salon: { tutorId: string | null }): boolean {
  if (ctx.rol === "direccion" || ctx.rol === "administrativo") return true;
  return ctx.rol === "profesor" && salon.tutorId === ctx.membership.id;
}

async function alumnoGestionable(ctx: TenantContext, alumnoId: string) {
  const alumno = await ctx.db.alumno.findFirst({
    where: { id: alumnoId },
    select: { id: true, salonId: true, nombres: true, apellidos: true, salon: { select: { tutorId: true } } },
  });
  if (!alumno || !puedeGestionar(ctx, alumno.salon)) forbidden();
  return alumno;
}

/** Permisos vigentes (no anulados) de esos alumnos que tocan el rango [desde, hasta]. */
export async function permisosVigentes(tdb: DbTenant, alumnoIds: string[], desde: Date, hasta: Date = desde) {
  if (alumnoIds.length === 0) return [];
  const filas = await tdb.permisoAsistencia.findMany({
    where: { alumnoId: { in: alumnoIds }, anuladoAt: null, desde: { lte: hasta }, hasta: { gte: desde } },
    select: { id: true, alumnoId: true, desde: true, hasta: true, todoElDia: true, horaDesde: true, horaHasta: true },
  });
  return filas.map((p) => ({ ...p, desde: isoDeFechaDb(p.desde), hasta: isoDeFechaDb(p.hasta) }));
}

export type PermisoVigente = Awaited<ReturnType<typeof permisosVigentes>>[number];

/** Por alumno: ¿tiene permiso de día completo ese día? ¿cubre esa hora? (helpers para NSP, listas y reportes). */
export function coberturaDePermisos(permisos: (PermisoCobertura & { alumnoId: string })[]) {
  return {
    diaCompleto: (alumnoId: string, fecha: string) => permisos.some((p) => p.alumnoId === alumnoId && cubreDiaCompleto(p, fecha)),
    hora: (alumnoId: string, fecha: string, hora: string) => permisos.some((p) => p.alumnoId === alumnoId && cubreHora(p, fecha, hora)),
  };
}

/** Recalcula los NSP del alumno en los días del permiso con actividades (hasta hoy): los quita o los vuelve a poner. */
async function resincronizarNsp(ctx: TenantContext, alumno: { id: string; salonId: string }, desde: string, hasta: string, ahora: Date) {
  const hoy = momentoEnZona(ahora, ctx.tenant.zonaHoraria).isoFecha;
  const fin = hasta < hoy ? hasta : hoy;
  if (desde > fin) return;
  const fechas = await ctx.db.evaluacion.findMany({
    where: { fecha: { gte: fechaDb(desde), lte: fechaDb(fin) }, curso: { salonId: alumno.salonId } },
    distinct: ["fecha"],
    select: { fecha: true },
  });
  for (const f of fechas) await sincronizarNsp(ctx.db, ctx.tenant, { fecha: f.fecha, alumnoIds: [alumno.id] }, ahora);
}

/** Registra un permiso (dirección, administrativo o tutor del salón) y ajusta los NSP de esos días. */
export async function registrarPermiso(ctx: TenantContext, entrada: unknown, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "asistencia");
  requireRol(ctx, ["direccion", "administrativo", "profesor"]);
  const d = esquemaPermiso.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const alumno = await alumnoGestionable(ctx, d.data.alumnoId);
  const todoElDia = d.data.todoElDia;
  const permiso = await ctx.db.permisoAsistencia.create({
    data: {
      tenantId: ctx.tenant.id, alumnoId: alumno.id, desde: fechaDb(d.data.desde), hasta: fechaDb(d.data.hasta), todoElDia,
      horaDesde: todoElDia ? null : d.data.horaDesde!, horaHasta: todoElDia ? null : d.data.horaHasta!, motivo: d.data.motivo,
      registradoPorId: ctx.membership.id,
    },
    select: { id: true },
  });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "permiso_asistencia", entidadId: permiso.id,
    detalle: { alumnoId: alumno.id, desde: d.data.desde, hasta: d.data.hasta, todoElDia },
  });
  await resincronizarNsp(ctx, alumno, d.data.desde, d.data.hasta, ahora);
  return ok("Permiso registrado.");
}

/** Anula un permiso con motivo (no se borra). Vuelve a poner los NSP de las faltas que cubría. */
export async function anularPermiso(ctx: TenantContext, entrada: unknown, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "asistencia");
  requireRol(ctx, ["direccion", "administrativo", "profesor"]);
  const d = esquemaAnular.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const permiso = await ctx.db.permisoAsistencia.findFirst({
    where: { id: d.data.permisoId },
    select: { id: true, alumnoId: true, desde: true, hasta: true, anuladoAt: true },
  });
  if (!permiso) forbidden();
  const alumno = await alumnoGestionable(ctx, permiso.alumnoId);
  const r = await ctx.db.permisoAsistencia.updateMany({
    where: { id: permiso.id, anuladoAt: null },
    data: { anuladoAt: ahora, anuladoPorId: ctx.membership.id, motivoAnulacion: d.data.motivo },
  });
  if (r.count === 0) return fallo("Este permiso ya estaba anulado.");
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "permiso_asistencia", entidadId: permiso.id,
    detalle: { alumnoId: alumno.id, anulado: true, motivo: d.data.motivo },
  });
  await resincronizarNsp(ctx, alumno, isoDeFechaDb(permiso.desde), isoDeFechaDb(permiso.hasta), ahora);
  return ok("Permiso anulado.");
}

export type PermisoVista = {
  id: string; alumnoId: string; alumno: string; salon: string; desde: string; hasta: string;
  todoElDia: boolean; horaDesde: string | null; horaHasta: string | null; motivo: string;
  registradoPor: string; createdAt: Date;
  anulado: { at: Date; por: string; motivo: string | null } | null;
  /** Dirección, administrativo o el tutor del salón. */
  puedeAnular: boolean;
};

/** Permisos del alcance (dirección y administrativo: todos; profesor: sus salones), los más recientes primero. */
export async function listarPermisos(ctx: TenantContext, opciones: { alumnoId?: string } = {}): Promise<PermisoVista[]> {
  requireFeature(ctx, "asistencia");
  requireRol(ctx, [...ROLES_LECTURA]);
  const salones = ctx.rol === "profesor" ? await salonIdsVisibles(ctx) : null;
  const alumnoId = opciones.alumnoId ? z.uuid().parse(opciones.alumnoId) : undefined;
  const filas = await ctx.db.permisoAsistencia.findMany({
    where: { ...(salones ? { alumno: { salonId: { in: salones } } } : {}), ...(alumnoId ? { alumnoId } : {}) },
    orderBy: [{ desde: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      alumno: { select: { nombres: true, apellidos: true, salon: { select: { nombre: true, tutorId: true } } } },
      registradoPor: { select: { user: { select: { nombres: true, apellidos: true } } } },
      anuladoPor: { select: { user: { select: { nombres: true, apellidos: true } } } },
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "permiso_asistencia", detalle: { cantidad: filas.length, ...(alumnoId ? { alumnoId } : {}) } });
  const nombre = (m: { user: { nombres: string; apellidos: string } } | null) => (m ? `${m.user.nombres} ${m.user.apellidos}`.trim() : "");
  return filas.map((f) => ({
    id: f.id, alumnoId: f.alumnoId, alumno: `${f.alumno.apellidos}, ${f.alumno.nombres}`, salon: f.alumno.salon.nombre,
    desde: isoDeFechaDb(f.desde), hasta: isoDeFechaDb(f.hasta), todoElDia: f.todoElDia, horaDesde: f.horaDesde, horaHasta: f.horaHasta,
    motivo: f.motivo, registradoPor: nombre(f.registradoPor), createdAt: f.createdAt,
    anulado: f.anuladoAt ? { at: f.anuladoAt, por: nombre(f.anuladoPor), motivo: f.motivoAnulacion } : null,
    puedeAnular: !f.anuladoAt && puedeGestionar(ctx, f.alumno.salon),
  }));
}

/** Alumnos a los que el usuario puede registrar un permiso (dirección y administrativo: todos; profesor: su tutoría). */
export async function alumnosParaPermiso(ctx: TenantContext) {
  requireFeature(ctx, "asistencia");
  requireRol(ctx, [...ROLES_LECTURA]);
  if (ctx.rol === "profesor") {
    return ctx.db.alumno.findMany({
      where: { estado: "activo", salon: { archivadoAt: null, tutorId: ctx.membership.id } },
      select: { id: true, nombres: true, apellidos: true, salon: { select: { nombre: true } } },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    });
  }
  return ctx.db.alumno.findMany({
    where: { estado: "activo", salon: { archivadoAt: null } },
    select: { id: true, nombres: true, apellidos: true, salon: { select: { nombre: true } } },
    orderBy: [{ salon: { nombre: "asc" } }, { apellidos: "asc" }, { nombres: "asc" }],
  });
}
