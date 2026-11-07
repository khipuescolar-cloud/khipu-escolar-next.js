import "server-only";
import { ErrorDeNegocio } from "../contexto-accion";
import { requireFeature } from "../plan";
import { requireRol, type TenantContext } from "../tenant";
import { auditar } from "../auditoria";
import type { TipoEventoSolicitud } from "@/generated/prisma/enums";

export function acceso(ctx: TenantContext, roles: ("direccion" | "profesor")[]) {
  requireFeature(ctx, "documentos");
  if (ctx.soporte) throw new ErrorDeNegocio("El modo soporte no accede a solicitudes.");
  requireRol(ctx, roles);
}
export function fallo(): never { throw new ErrorDeNegocio("La solicitud cambió de estado o no está disponible."); }
export async function evento(ctx: TenantContext, solicitudId: string, tipo: TipoEventoSolicitud, destinatarioId?: string, versionId?: string, detalle?: Record<string, string | number | boolean | null>) {
  await ctx.db.solicitudEvento.create({ data: { tenantId: ctx.tenant.id, solicitudId, destinatarioId, versionId, tipo, actorId: ctx.membership.id, detalle } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.membership.id, accion: tipo === "version_presentada" ? "enviar" : "editar", entidad: "solicitud_documental", entidadId: solicitudId, detalle: { tipo, destinatarioId: destinatarioId ?? null } });
}
export async function destinatarioVisible(ctx: TenantContext, id: string) {
  const d = await ctx.db.solicitudDestinatario.findFirst({ where: { id, ...(ctx.rol === "profesor" ? { membershipId: ctx.membership.id } : {}) }, include: { solicitud: true } });
  if (!d || d.retiradoAt) fallo();
  return d;
}
