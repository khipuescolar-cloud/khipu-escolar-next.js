import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { forbidden, notFound, redirect } from "next/navigation";
import type { Membership, Profile, Tenant } from "@/generated/prisma/client";
import type { Rol } from "@/generated/prisma/enums";
import { urlRaiz } from "@/lib/dominio";
import { db, dbTenant, type DbTenant } from "./db";
import { supabaseServidor } from "./supabase";

/** Prioridad cuando un usuario tiene varios roles en el mismo colegio. */
const PRIORIDAD_ROL: Rol[] = ["direccion", "profesor", "porteria", "apoderado", "alumno"];
export const COOKIE_ROL = "khipu_rol";

export type TenantContext = {
  tenant: Tenant;
  user: Profile;
  /** Membresía con la que se actúa en este request. */
  membership: Membership;
  rol: Rol;
  /** Todas las membresías activas del usuario en este colegio (para cambiar de rol). */
  roles: Rol[];
  /** Prisma con aislamiento por colegio. */
  db: DbTenant;
};

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

  const tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant) notFound();
  if (tenant.estado === "suspendido") forbidden();

  const memberships = await db.membership.findMany({
    where: { tenantId: tenant.id, userId: user.id, estado: "activa" },
  });
  if (memberships.length === 0) forbidden();

  const roles = PRIORIDAD_ROL.filter((r) => memberships.some((m) => m.rol === r));
  const preferido = (await cookies()).get(COOKIE_ROL)?.value as Rol | undefined;
  const rol = preferido && roles.includes(preferido) ? preferido : roles[0];
  const membership = memberships.find((m) => m.rol === rol)!;

  return { tenant, user, membership, rol, roles, db: dbTenant(tenant.id) };
});

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
