import "server-only";
import { redirect } from "next/navigation";
import { CONSENTIMIENTO_VERSION } from "@/lib/consentimiento";
import { auditar } from "./auditoria";
import type { TenantContext } from "./tenant";

export type EstadoConsentimiento = "pendiente" | "vigente" | "revocado";

/**
 * - pendiente: nunca aceptó (debe ver la pantalla de consentimiento).
 * - vigente: tiene un consentimiento sin revocar.
 * - revocado: aceptó antes y lo retiró (no recibe avisos, pero puede usar la plataforma).
 */
export async function estadoConsentimiento(ctx: TenantContext, apoderadoId = ctx.membership.id): Promise<EstadoConsentimiento> {
  const filas = await ctx.db.consentimiento.findMany({ where: { apoderadoId }, select: { revocadoAt: true } });
  if (filas.length === 0) return "pendiente";
  return filas.some((f) => f.revocadoAt === null) ? "vigente" : "revocado";
}

/** Para apoderados sin consentimiento aceptado alguna vez: lleva a la pantalla de consentimiento. */
export async function requireConsentimiento(ctx: TenantContext): Promise<void> {
  if (ctx.rol !== "apoderado") return;
  if ((await estadoConsentimiento(ctx)) === "pendiente") redirect("/consentimiento");
}

/** Registra la aceptación y la enlaza a todos los vínculos del apoderado con sus hijos. */
export async function aceptarConsentimiento(ctx: TenantContext, ip: string | null): Promise<void> {
  if (ctx.rol !== "apoderado") throw new Error("Solo las familias aceptan el consentimiento.");
  const consentimiento = await ctx.db.consentimiento.create({
    data: { tenantId: ctx.tenant.id, apoderadoId: ctx.membership.id, versionTexto: CONSENTIMIENTO_VERSION, ip },
  });
  await ctx.db.apoderadoAlumno.updateMany({
    where: { apoderadoId: ctx.membership.id },
    data: { consentimientoId: consentimiento.id },
  });
  await auditar({
    tenantId: ctx.tenant.id,
    actorId: ctx.user.id,
    accion: "crear",
    entidad: "consentimiento",
    entidadId: consentimiento.id,
    detalle: { version: CONSENTIMIENTO_VERSION },
  });
}

/** Revoca el consentimiento: desde ahora no se encolan avisos para esta familia. */
export async function revocarConsentimiento(ctx: TenantContext): Promise<void> {
  if (ctx.rol !== "apoderado") throw new Error("Solo las familias pueden retirar su consentimiento.");
  await ctx.db.consentimiento.updateMany({
    where: { apoderadoId: ctx.membership.id, revocadoAt: null },
    data: { revocadoAt: new Date() },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "consentimiento", detalle: { revocado: true } });
}
