import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { forbidden, notFound, redirect } from "next/navigation";
import type { Membership, Profile, Tenant } from "@/generated/prisma/client";
import type { Rol } from "@/generated/prisma/enums";
import { urlRaiz } from "@/lib/dominio";
import { auditar } from "./auditoria";
import { esAdminPlataforma } from "./auth";
import { db, dbTenant, type DbTenant } from "./db";
import { supabaseServidor } from "./supabase";

/** Prioridad cuando un usuario tiene varios roles en el mismo colegio. */
const PRIORIDAD_ROL: Rol[] = ["direccion", "profesor", "administrativo", "porteria", "apoderado", "alumno"];
export const COOKIE_ROL = "khipu_rol";

export type TenantContext = {
  tenant: Tenant;
  user: Profile;
  /** Membresía con la que se actúa en este request. */
  membership: Membership;
  rol: Rol;
  /** Todas las membresías activas del usuario en este colegio (para cambiar de rol). */
  roles: Rol[];
  /** Prisma con aislamiento por colegio (de solo lectura en modo soporte). */
  db: DbTenant;
  /**
   * Solo cuando un super administrador entra con un acceso de soporte vigente (specs/16):
   * actúa como `direccion`, en solo lectura y sin acceso a chats, notas, libreta ni Nudito.
   */
  soporte?: { accesoId: string; expiraAt: Date };
};

/** Id de la membresía sintética del modo soporte (no existe en la BD). */
export const MEMBERSHIP_SOPORTE_ID = "00000000-0000-0000-0000-000000000000";

/** Acceso de soporte vigente (no cerrado ni vencido) del super administrador activo en ese colegio, o null. */
export async function accesoSoporteVigente(userId: string, tenantId: string, ahora = new Date()) {
  if (!(await esAdminPlataforma(userId))) return null;
  return db.accesoSoporte.findFirst({
    where: { adminId: userId, tenantId, cerradoAt: null, expiraAt: { gt: ahora } },
    orderBy: { expiraAt: "desc" },
  });
}

/** Fin del acceso de soporte vigente más tardío de cualquier administrador en el colegio (campana de dirección), o null. */
export async function soporteVigenteHasta(tenantId: string, ahora = new Date()): Promise<Date | null> {
  const accesos = await db.accesoSoporte.findMany({
    where: { tenantId, cerradoAt: null, expiraAt: { gt: ahora } },
    orderBy: { expiraAt: "desc" },
    select: { adminId: true, expiraAt: true },
  });
  if (accesos.length === 0) return null;
  // Solo cuentan los de super administradores activos (los demás no dan entrada).
  const activos = await db.adminPlataforma.findMany({ where: { userId: { in: accesos.map((a) => a.adminId) }, activo: true }, select: { userId: true } });
  const ids = new Set(activos.map((a) => a.userId));
  return accesos.find((a) => ids.has(a.adminId))?.expiraAt ?? null;
}

/** Usuario autenticado (verificado contra Supabase Auth) o null. */
export const usuarioActual = cache(async (): Promise<Profile | null> => {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return db.profile.findUnique({ where: { id: data.user.id } });
});

/**
 * Contexto del colegio para el request actual. Valida sesión, colegio y membresía activa.
 * Nunca confía en un tenant_id enviado por el cliente: el colegio sale del subdominio (slug).
 */
const contextoDelColegio = cache(async (slug: string): Promise<TenantContext> => {
  const user = await usuarioActual();
  if (!user) redirect(urlRaiz(`/login?colegio=${encodeURIComponent(slug)}`));
  if (user.debeCambiarPassword) redirect(urlRaiz(`/cambiar-password?siguiente=${encodeURIComponent(`/entrando?colegio=${slug}`)}`));
  const preferido = (await cookies()).get(COOKIE_ROL)?.value as Rol | undefined;
  const ctx = await resolverContextoColegio(user, slug, preferido);
  if (ctx.soporte) {
    // Cada request en modo soporte queda en la auditoría del colegio (una vez por request: está cacheado).
    await auditar({
      tenantId: ctx.tenant.id,
      actorId: user.id,
      accion: "soporte_ver",
      entidad: "colegio",
      entidadId: ctx.tenant.id,
      detalle: { accesoId: ctx.soporte.accesoId },
    });
  }
  return ctx;
});

/**
 * Arma el contexto del colegio para un usuario ya autenticado (sin cookies ni cache: se prueba directo).
 * 1. Membresía activa → contexto normal con el rol preferido o el de mayor prioridad.
 * 2. Sin membresía, pero super administrador con `AccesoSoporte` vigente → rol `direccion`,
 *    `ctx.soporte` y `ctx.db` de solo lectura.
 * 3. Si no → 403.
 * Colegio suspendido: se ignoran las membresías (403 para todos) salvo el acceso de soporte vigente.
 */
export async function resolverContextoColegio(user: Profile, slug: string, rolPreferido?: Rol, ahora = new Date()): Promise<TenantContext> {
  const tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant) notFound();
  // Colegio suspendido: nadie del colegio entra, pero el soporte de Khipu sí (solo lectura y auditado, specs/16).
  const suspendido = tenant.estado === "suspendido";

  const memberships = suspendido
    ? []
    : await db.membership.findMany({ where: { tenantId: tenant.id, userId: user.id, estado: "activa" } });
  if (memberships.length === 0) {
    const acceso = await accesoSoporteVigente(user.id, tenant.id, ahora);
    if (!acceso) forbidden();
    const membership: Membership = {
      id: MEMBERSHIP_SOPORTE_ID,
      tenantId: tenant.id,
      userId: user.id,
      rol: "direccion",
      estado: "activa",
      cargo: "Soporte Khipu",
      createdAt: acceso.inicioAt,
    };
    return {
      tenant,
      user,
      membership,
      rol: "direccion",
      roles: ["direccion"],
      db: dbTenant(tenant.id, { soloLectura: true }),
      soporte: { accesoId: acceso.id, expiraAt: acceso.expiraAt },
    };
  }

  const roles = PRIORIDAD_ROL.filter((r) => memberships.some((m) => m.rol === r));
  const rol = rolPreferido && roles.includes(rolPreferido) ? rolPreferido : roles[0];
  const membership = memberships.find((m) => m.rol === rol)!;

  return { tenant, user, membership, rol, roles, db: dbTenant(tenant.id) };
}

export async function requireTenantContext(slug: string, rolesPermitidos?: Rol[]): Promise<TenantContext> {
  const ctx = await contextoDelColegio(slug);
  if (rolesPermitidos) requireRol(ctx, rolesPermitidos);
  return ctx;
}

export function requireRol(ctx: TenantContext, permitidos: Rol[]): void {
  if (!permitidos.includes(ctx.rol)) forbidden();
}

// ───────────── Alcance por rol: qué salones y alumnos puede ver cada quien ─────────────

/** Salones visibles: dirección y portería → todos; profesor → donde es tutor o dicta; apoderado → los de sus hijos. */
export async function salonIdsVisibles(ctx: TenantContext): Promise<string[]> {
  if (ctx.rol === "direccion" || ctx.rol === "porteria") {
    return (await ctx.db.salon.findMany({ select: { id: true } })).map((s) => s.id);
  }
  if (ctx.rol === "profesor") {
    const salones = await ctx.db.salon.findMany({
      where: { OR: [{ tutorId: ctx.membership.id }, { cursos: { some: { profesorId: ctx.membership.id } } }] },
      select: { id: true },
    });
    return salones.map((s) => s.id);
  }
  if (ctx.rol === "apoderado") {
    const hijos = await ctx.db.alumno.findMany({
      where: { apoderados: { some: { apoderadoId: ctx.membership.id } } },
      select: { salonId: true },
    });
    return [...new Set(hijos.map((h) => h.salonId))];
  }
  return [];
}

/** Alumnos visibles según el rol. El apoderado solo ve a sus hijos. */
export async function alumnoIdsVisibles(ctx: TenantContext): Promise<string[]> {
  if (ctx.rol === "apoderado") {
    const vinculos = await ctx.db.apoderadoAlumno.findMany({
      where: { apoderadoId: ctx.membership.id },
      select: { alumnoId: true },
    });
    return vinculos.map((v) => v.alumnoId);
  }
  const salonIds = await salonIdsVisibles(ctx);
  const alumnos = await ctx.db.alumno.findMany({ where: { salonId: { in: salonIds } }, select: { id: true } });
  return alumnos.map((a) => a.id);
}

/** Lanza 403 si el alumno no está en el alcance del usuario. */
export async function requireAlumnoVisible(ctx: TenantContext, alumnoId: string): Promise<void> {
  const ids = await alumnoIdsVisibles(ctx);
  if (!ids.includes(alumnoId)) forbidden();
}

/** Lanza 403 si el profesor no dicta el curso (dirección siempre puede). */
export async function requireCursoDelProfesor(ctx: TenantContext, cursoId: string): Promise<void> {
  if (ctx.rol === "direccion") return;
  const curso = await ctx.db.curso.findFirst({
    where: {
      id: cursoId,
      OR: [{ profesorId: ctx.membership.id }, { salon: { tutorId: ctx.membership.id } }],
    },
    select: { id: true },
  });
  if (!curso || ctx.rol !== "profesor") forbidden();
}
