import "server-only";
import type { TenantContext } from "../tenant";
import { crearNotificaciones } from "./internas";

/** Bandeja interna idempotente. Push queda pendiente de un tipo propio en el outbox de avisos. */
async function avisar(ctx: TenantContext, solicitudId: string, clave: string, titulo: string, cuerpo: string, membershipIds: string[]) {
  await crearNotificaciones(ctx.db, { tenantId: ctx.tenant.id, tipo: "tarea", clave, filas: membershipIds.map(membershipId => ({ membershipId, titulo, cuerpo, url: `/documentos?solicitud=${solicitudId}` })) });
}
export async function avisarSolicitudNueva(ctx: TenantContext, solicitudId: string) {
  const s = await ctx.db.solicitudDocumental.findFirst({ where: { id: solicitudId }, include: { destinatarios: { where: { retiradoAt: null } } } });
  if (!s) return;
  await Promise.all(s.destinatarios.map(d => avisar(ctx, s.id, `solicitud:${s.id}:${d.id}`, "Nueva solicitud documental", s.titulo, [d.membershipId])));
}
export async function avisarVersionSolicitud(ctx: TenantContext, solicitudId: string, destinatarioId: string, numero: number) {
  const directores = await ctx.db.membership.findMany({ where: { rol: "direccion", estado: "activa" }, select: { id: true } });
  await avisar(ctx, solicitudId, `solicitud-version:${destinatarioId}:${numero}`, "Nueva versión documental", `Se presentó la versión ${numero}.`, directores.map(d => d.id));
}
export async function avisarRevisionSolicitud(ctx: TenantContext, solicitudId: string, destinatarioId: string, resultado: "observada" | "aprobada") {
  const d = await ctx.db.solicitudDestinatario.findFirst({ where: { id: destinatarioId } });
  if (!d) return;
  await avisar(ctx, solicitudId, `solicitud-revision:${destinatarioId}:${d.versionActual}:${resultado}`, resultado === "observada" ? "Solicitud observada" : "Solicitud aprobada", resultado === "observada" ? "Revisa las observaciones y presenta una nueva versión." : "Tu documento fue aprobado.", [d.membershipId]);
}
