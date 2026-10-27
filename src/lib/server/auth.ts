import "server-only";
import { dominioDeCorreo, urlRaiz } from "@/lib/dominio";
import { db } from "./db";
import { supabaseServidor } from "./supabase";

// Límite de intentos de login (specs/02-autenticacion-login.md).
export const MAX_FALLOS_POR_CORREO = 5;
export const MAX_FALLOS_POR_IP = 20;
export const VENTANA_MINUTOS = 15;

export type ResultadoLogin =
  | { ok: true; destino: Destino; debeCambiarPassword: boolean }
  | { ok: false; error: "credenciales" | "bloqueado" | "sin-colegio" };

export type Destino = { tipo: "colegio"; slug: string; nombre: string } | { tipo: "elegir" } | { tipo: "plataforma" };

/** Super administrador activo de la plataforma (specs/16). */
export async function esAdminPlataforma(userId: string): Promise<boolean> {
  return (await db.adminPlataforma.count({ where: { userId, activo: true } })) > 0;
}

export async function estaBloqueado(email: string, ip: string): Promise<boolean> {
  const desde = new Date(Date.now() - VENTANA_MINUTOS * 60_000);
  const [porCorreo, porIp] = await Promise.all([
    db.loginIntento.count({ where: { email, exito: false, createdAt: { gte: desde } } }),
    db.loginIntento.count({ where: { ip, exito: false, createdAt: { gte: desde } } }),
  ]);
  return porCorreo >= MAX_FALLOS_POR_CORREO || porIp >= MAX_FALLOS_POR_IP;
}

/** Colegio cuyo dominio de correo coincide (p. ej. @nuevohorizonte.demo). No revela nada de correos personales. */
export async function colegioPorDominio(email: string) {
  const dominio = dominioDeCorreo(email);
  if (!dominio) return null;
  return db.tenant.findFirst({
    where: { emailDomains: { has: dominio }, estado: { not: "suspendido" } },
    select: { slug: true, nombre: true },
  });
}

/** Colegios donde el usuario tiene membresía activa. */
export async function colegiosDelUsuario(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId, estado: "activa", tenant: { estado: { not: "suspendido" } } },
    select: { rol: true, tenant: { select: { slug: true, nombre: true, ciudad: true, plan: true } } },
    orderBy: { createdAt: "asc" },
  });
  const porSlug = new Map<string, { slug: string; nombre: string; ciudad: string | null; roles: string[] }>();
  for (const m of memberships) {
    const actual = porSlug.get(m.tenant.slug) ?? { ...m.tenant, roles: [] };
    actual.roles.push(m.rol);
    porSlug.set(m.tenant.slug, actual);
  }
  return [...porSlug.values()];
}

/** Dominio del correo → ese colegio; un solo colegio → ese; varios → elegir. */
export async function resolverDestino(userId: string, email: string): Promise<Destino | null> {
  const colegios = await colegiosDelUsuario(userId);
  if (colegios.length === 0) return null;
  const porDominio = await colegioPorDominio(email);
  const delDominio = porDominio && colegios.find((c) => c.slug === porDominio.slug);
  if (delDominio) return { tipo: "colegio", slug: delDominio.slug, nombre: delDominio.nombre };
  if (colegios.length === 1) return { tipo: "colegio", slug: colegios[0].slug, nombre: colegios[0].nombre };
  return { tipo: "elegir" };
}

/**
 * Primer ingreso: las membresías «invitada» del usuario pasan a «activa» (specs/02).
 * Se llama al iniciar sesión y al fijar la contraseña desde el enlace de invitación.
 */
export async function activarInvitaciones(userId: string): Promise<number> {
  const r = await db.membership.updateMany({ where: { userId, estado: "invitada" }, data: { estado: "activa" } });
  return r.count;
}

export async function iniciarSesion(emailCrudo: string, password: string, ip: string): Promise<ResultadoLogin> {
  const email = emailCrudo.trim().toLowerCase();
  if (await estaBloqueado(email, ip)) return { ok: false, error: "bloqueado" };

  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  await db.loginIntento.create({ data: { email, ip, exito: !error } });
  if (error || !data.user) return { ok: false, error: "credenciales" };

  await activarInvitaciones(data.user.id);
  const perfil = await db.profile.findUnique({ where: { id: data.user.id }, select: { debeCambiarPassword: true } });
  const debeCambiarPassword = perfil?.debeCambiarPassword ?? false;
  if (await esAdminPlataforma(data.user.id)) return { ok: true, destino: { tipo: "plataforma" }, debeCambiarPassword };
  const destino = await resolverDestino(data.user.id, email);
  if (!destino) {
    await supabase.auth.signOut();
    return { ok: false, error: "sin-colegio" };
  }
  return { ok: true, destino, debeCambiarPassword };
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
}

/** Envía el correo de recuperación. Siempre responde igual para no revelar si el correo existe. */
export async function pedirRecuperacion(email: string): Promise<void> {
  const supabase = await supabaseServidor();
  await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: urlRaiz("/auth/callback?next=/restablecer"),
  });
}
