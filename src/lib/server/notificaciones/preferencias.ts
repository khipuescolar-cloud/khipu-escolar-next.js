import "server-only";
import { z } from "zod";
import { db } from "../db";
import type { DbTenant } from "../db";
import type { TenantContext } from "../tenant";

// Preferencias de aviso y suscripciones Web Push del dispositivo (specs/06).
// `PreferenciaAviso.apoderadoId` es en realidad un id de MEMBRESÍA (`memberships.id`): aplica a cualquier rol
// (apoderado, profesor, dirección, administrativo). Sin fila = correo y push activados.

export type DestinoPersonal = { email: string; correo: boolean; pushEndpoints: string[] };

/**
 * Canales a los que se puede avisar a un miembro del personal (profesor, dirección, administrativo) según su
 * perfil: correo si no lo apagó y un envío push por cada dispositivo suscrito si no apagó el push.
 * Devuelve null si la membresía no existe, no está activa o no tiene ese rol.
 */
export async function destinoPersonal(tdb: DbTenant, membershipId: string, roles: ("profesor" | "direccion" | "administrativo")[]): Promise<DestinoPersonal | null> {
  const m = await tdb.membership.findFirst({
    where: { id: membershipId, rol: { in: roles }, estado: "activa" },
    select: { preferenciaAviso: { select: { correo: true, push: true } }, user: { select: { email: true, pushSuscripciones: { select: { endpoint: true } } } } },
  });
  if (!m) return null;
  const pref = m.preferenciaAviso ?? { correo: true, push: true };
  return { email: m.user.email, correo: pref.correo, pushEndpoints: pref.push ? m.user.pushSuscripciones.map((s) => s.endpoint) : [] };
}

export async function obtenerPreferencias(ctx: TenantContext) {
  const pref = await ctx.db.preferenciaAviso.findUnique({ where: { apoderadoId: ctx.membership.id } });
  return { correo: pref?.correo ?? true, push: pref?.push ?? true };
}

export async function guardarPreferencias(ctx: TenantContext, datos: { correo: boolean; push: boolean }) {
  const { correo, push } = z.object({ correo: z.boolean(), push: z.boolean() }).parse(datos);
  await ctx.db.preferenciaAviso.upsert({
    where: { apoderadoId: ctx.membership.id },
    update: { correo, push },
    create: { tenantId: ctx.tenant.id, apoderadoId: ctx.membership.id, correo, push },
  });
}

export const esquemaSuscripcion = z.object({
  endpoint: z.url().refine((u) => u.startsWith("https://"), "El endpoint debe ser https"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** Guarda (o reasigna al usuario actual) la suscripción push del dispositivo. */
export async function guardarSuscripcionPush(ctx: TenantContext, suscripcion: unknown, userAgent?: string | null) {
  const s = esquemaSuscripcion.parse(suscripcion);
  await db.pushSuscripcion.upsert({
    where: { endpoint: s.endpoint },
    update: { userId: ctx.user.id, p256dh: s.keys.p256dh, auth: s.keys.auth, userAgent: userAgent?.slice(0, 300) ?? null },
    create: { userId: ctx.user.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, userAgent: userAgent?.slice(0, 300) ?? null },
  });
}

export async function quitarSuscripcionPush(ctx: TenantContext, endpoint: string) {
  await db.pushSuscripcion.deleteMany({ where: { endpoint, userId: ctx.user.id } });
}
