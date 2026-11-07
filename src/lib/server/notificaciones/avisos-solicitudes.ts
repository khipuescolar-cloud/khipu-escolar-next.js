import "server-only";
import type { TenantContext } from "../tenant";
import { entregarNotificaciones } from "./internas";

/** Bandeja y push para personal; claves por evento y membresía, sin correo. */
async function avisar(ctx: TenantContext, solicitudId: string, clave: string, titulo: string, cuerpo: string, plantilla: "solicitud_nueva" | "solicitud_version" | "solicitud_observada" | "solicitud_aprobada", membershipIds: string[]) {
  const miembros = await ctx.db.membership.findMany({ where: { id: { in: membershipIds }, estado: "activa" }, select: { id: true, preferenciaAviso: { select: { push: true } }, user: { select: { pushSuscripciones: { select: { endpoint: true } } } } } });
  const url = `/documentos?seccion=gestion&solicitud=${solicitudId}`;
  await entregarNotificaciones(ctx.db, { tenant: ctx.tenant, tipo: "solicitud", clave, tipoAviso: "documento", plantilla,
    referenciaId: solicitudId,
    entregas: miembros.map(m => ({ membershipId: m.id, titulo, cuerpo, url, email: null, endpoints: m.preferenciaAviso?.push === false ? [] : m.user.pushSuscripciones.map(p => p.endpoint), apoderadoId: null, payload: { colegio: ctx.tenant.nombre, titulo, url } })) });
}
export async function avisarSolicitudNueva(ctx: TenantContext, solicitudId: string) {
  const s = await ctx.db.solicitudDocumental.findFirst({ where: { id: solicitudId }, include: { destinatarios: { where: { retiradoAt: null } } } });
  if (!s) return;
  await Promise.all(s.destinatarios.map(d => avisar(ctx, s.id, `solicitud:${s.id}:${d.id}`, "Nueva solicitud documental", s.titulo, "solicitud_nueva", [d.membershipId])));
}
export async function avisarVersionSolicitud(ctx: TenantContext, solicitudId: string, destinatarioId: string, numero: number) {
  const directores = await ctx.db.membership.findMany({ where: { rol: "direccion", estado: "activa" }, select: { id: true } });
  await avisar(ctx, solicitudId, `solicitud-version:${destinatarioId}:${numero}`, "Nueva versión documental", `Se presentó la versión ${numero}.`, "solicitud_version", directores.map(d => d.id));
}
export async function avisarRevisionSolicitud(ctx: TenantContext, solicitudId: string, destinatarioId: string, resultado: "observada" | "aprobada") {
  const d = await ctx.db.solicitudDestinatario.findFirst({ where: { id: destinatarioId } });
  if (!d) return;
  await avisar(ctx, solicitudId, `solicitud-revision:${destinatarioId}:${d.versionActual}:${resultado}`, resultado === "observada" ? "Solicitud observada" : "Solicitud aprobada", resultado === "observada" ? "Revisa las observaciones y presenta una nueva versión." : "Tu documento fue aprobado.", resultado === "observada" ? "solicitud_observada" : "solicitud_aprobada", [d.membershipId]);
}
