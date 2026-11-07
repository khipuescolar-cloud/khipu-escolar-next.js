import "server-only";
import type { TenantContext } from "../tenant";
import { ErrorDeNegocio } from "../contexto-accion";
import { acceso, destinatarioVisible, evento, fallo } from "./comun";
import { avisarRevisionSolicitud } from "../notificaciones/avisos-solicitudes";

export async function comenzarRevision(ctx: TenantContext, id: string) {
  acceso(ctx, ["direccion"]);
  const d = await destinatarioVisible(ctx, id);
  if (d.solicitud.estado !== "publicada") fallo();
  const r = await ctx.db.solicitudDestinatario.updateMany({ where: { id, estado: "entregado", retiradoAt: null }, data: { estado: "en_revision", revisadoPorId: ctx.membership.id, revisadoAt: new Date() } });
  if (!r.count) fallo();
  await evento(ctx, d.solicitudId, "revision_iniciada", id);
}
async function decidir(ctx: TenantContext, id: string, resultado: "observada" | "aprobada", observaciones?: string, plazoCorreccion?: Date) {
  acceso(ctx, ["direccion"]);
  const d = await destinatarioVisible(ctx, id);
  if (d.solicitud.estado !== "publicada" || !["entregado", "en_revision"].includes(d.estado)) fallo();
  const v = await ctx.db.solicitudVersion.findFirst({ where: { destinatarioId: id, numero: d.versionActual, resultado: "presentada" } });
  if (!v) fallo();
  const ahora = new Date();
  await ctx.db.$transaction(async tx => {
    const r = await tx.solicitudDestinatario.updateMany({ where: { id, estado: d.estado, versionActual: d.versionActual, retiradoAt: null }, data: { estado: resultado === "observada" ? "observado" : "aprobado", plazoCorreccion: resultado === "observada" ? plazoCorreccion ?? null : null, aprobadoAt: resultado === "aprobada" ? ahora : null, revisadoPorId: ctx.membership.id, revisadoAt: ahora } });
    if (!r.count) fallo();
    await tx.solicitudVersion.update({ where: { id: v.id }, data: { resultado, observaciones: observaciones ?? null, revisadaPorId: ctx.membership.id, revisadaAt: ahora } });
  });
  await evento(ctx, d.solicitudId, resultado, id, v.id, observaciones ? { observaciones } : undefined);
  await avisarRevisionSolicitud(ctx, d.solicitudId, id, resultado);
}
export async function observarVersion(ctx: TenantContext, id: string, e: { observaciones: string; plazoCorreccion?: Date }) {
  const texto = e.observaciones.trim();
  if (!texto) throw new ErrorDeNegocio("Escribe las observaciones.");
  await decidir(ctx, id, "observada", texto, e.plazoCorreccion);
}
export async function aprobarVersion(ctx: TenantContext, id: string) { await decidir(ctx, id, "aprobada"); }
export async function reabrirRevision(ctx: TenantContext, id: string, motivo: string) {
  acceso(ctx, ["direccion"]);
  if (!motivo.trim()) throw new ErrorDeNegocio("Escribe el motivo de reapertura.");
  const d = await destinatarioVisible(ctx, id);
  if (d.solicitud.estado !== "publicada") fallo();
  const r = await ctx.db.solicitudDestinatario.updateMany({ where: { id, estado: "aprobado", retiradoAt: null }, data: { estado: "en_revision", aprobadoAt: null } });
  if (!r.count) fallo();
  await evento(ctx, d.solicitudId, "revision_reabierta", id, undefined, { motivo });
}
