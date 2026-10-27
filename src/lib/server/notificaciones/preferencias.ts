import "server-only";
import { z } from "zod";
import { db } from "../db";
import type { TenantContext } from "../tenant";

// Preferencias de aviso del apoderado y suscripciones Web Push del dispositivo (specs/06).

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
