import "server-only";
import { expandirAreas } from "@/lib/solicitudes";
import { ErrorDeNegocio } from "../contexto-accion";
import { acceso, evento, fallo } from "./comun";
import type { TenantContext } from "../tenant";
import { avisarSolicitudNueva } from "../notificaciones/avisos-solicitudes";

export type EntradaSolicitud = { titulo: string; instrucciones?: string; anioAcademico: number; periodoEtiqueta?: string; plantillaDocumentoId?: string; fechaLimite?: Date; conHora?: boolean; permiteTardias?: boolean; destinatarios: { membershipIds?: string[]; areas?: string[] } };
async function resolverDestinatarios(ctx: TenantContext, e: EntradaSolicitud) {
  const directos = e.destinatarios.membershipIds ?? [];
  const areas = e.destinatarios.areas ?? [];
  const cursos = areas.length ? await ctx.db.curso.findMany({ where: { salon: { anio: e.anioAcademico, archivadoAt: null } }, select: { profesorId: true, areaCneb: true, nombre: true } }) : [];
  const candidatos = new Map<string, string | null>(expandirAreas(cursos, areas).map(x => [x.membershipId, x.grupo]));
  directos.forEach(id => candidatos.set(id, null));
  const miembros = await ctx.db.membership.findMany({ where: { id: { in: [...candidatos.keys()] }, rol: "profesor", estado: "activa" }, select: { id: true } });
  if (!candidatos.size || miembros.length !== candidatos.size) throw new ErrorDeNegocio("Elige profesores activos del colegio o áreas con docentes asignados.");
  return miembros.map(m => ({ membershipId: m.id, grupo: candidatos.get(m.id) ?? null }));
}
export async function crearSolicitud(ctx: TenantContext, e: EntradaSolicitud): Promise<{ id: string }> {
  acceso(ctx, ["direccion"]);
  const titulo = e.titulo.trim();
  if (titulo.length < 3 || titulo.length > 200) throw new ErrorDeNegocio("Escribe un título de 3 a 200 caracteres.");
  if (!Number.isInteger(e.anioAcademico) || e.anioAcademico < 2000 || e.anioAcademico > 2200) throw new ErrorDeNegocio("El año académico no es válido.");
  if (e.plantillaDocumentoId) {
    const plantilla = await ctx.db.documento.findFirst({ where: { id: e.plantillaDocumentoId, eliminadoAt: null, ambito: "biblioteca" } });
    if (!plantilla) throw new ErrorDeNegocio("La plantilla no pertenece a la biblioteca del colegio.");
  }
  const destinatarios = await resolverDestinatarios(ctx, e);
  const s = await ctx.db.solicitudDocumental.create({ data: { tenantId: ctx.tenant.id, titulo, instrucciones: e.instrucciones?.trim() || null, anioAcademico: e.anioAcademico, periodoEtiqueta: e.periodoEtiqueta?.trim() || null, plantillaDocumentoId: e.plantillaDocumentoId ?? null, fechaLimite: e.fechaLimite, conHora: e.conHora ?? false, permiteTardias: e.permiteTardias ?? true, creadaPorId: ctx.membership.id, destinatarios: { create: destinatarios.map(d => ({ tenantId: ctx.tenant.id, ...d })) } } });
  await evento(ctx, s.id, "creada");
  return { id: s.id };
}
export async function editarSolicitud(ctx: TenantContext, id: string, e: Pick<EntradaSolicitud, "titulo" | "instrucciones" | "periodoEtiqueta" | "plantillaDocumentoId" | "fechaLimite" | "conHora" | "permiteTardias">) {
  acceso(ctx, ["direccion"]);
  if (!e.titulo.trim()) throw new ErrorDeNegocio("Escribe el título.");
  if (e.plantillaDocumentoId && !(await ctx.db.documento.findFirst({ where: { id: e.plantillaDocumentoId, eliminadoAt: null, ambito: "biblioteca" } }))) fallo();
  const r = await ctx.db.solicitudDocumental.updateMany({ where: { id, estado: "borrador" }, data: { titulo: e.titulo.trim(), instrucciones: e.instrucciones?.trim() || null, periodoEtiqueta: e.periodoEtiqueta?.trim() || null, plantillaDocumentoId: e.plantillaDocumentoId ?? null, fechaLimite: e.fechaLimite ?? null, conHora: e.conHora ?? false, permiteTardias: e.permiteTardias ?? true } });
  if (!r.count) fallo();
  await evento(ctx, id, "plazo_cambiado", undefined, undefined, { motivo: "Edición de borrador" });
}
export async function publicarSolicitud(ctx: TenantContext, id: string): Promise<void> {
  acceso(ctx, ["direccion"]);
  const r = await ctx.db.solicitudDocumental.updateMany({ where: { id, estado: "borrador" }, data: { estado: "publicada", publicadaAt: new Date() } });
  if (!r.count) fallo();
  await evento(ctx, id, "publicada");
  await avisarSolicitudNueva(ctx, id);
}
export async function cambiarEstadoSolicitud(ctx: TenantContext, id: string, estado: "cerrada" | "publicada" | "anulada") {
  acceso(ctx, ["direccion"]);
  const desde = estado === "publicada" ? "cerrada" : "publicada";
  const r = await ctx.db.solicitudDocumental.updateMany({ where: { id, estado: desde }, data: { estado, cerradaAt: estado === "cerrada" ? new Date() : null } });
  if (!r.count) fallo();
  await evento(ctx, id, estado === "publicada" ? "reabierta" : estado);
}
export async function cambiarPlazoSolicitud(ctx: TenantContext, id: string, fechaLimite: Date | null, motivo: string) {
  acceso(ctx, ["direccion"]);
  if (!motivo.trim()) throw new ErrorDeNegocio("Escribe el motivo del cambio.");
  const s = await ctx.db.solicitudDocumental.findFirst({ where: { id, estado: "publicada" } });
  if (!s) fallo();
  await ctx.db.solicitudDocumental.update({ where: { id }, data: { fechaLimite } });
  await evento(ctx, id, "plazo_cambiado", undefined, undefined, { antes: s.fechaLimite?.toISOString() ?? null, despues: fechaLimite?.toISOString() ?? null, motivo });
}
export async function agregarDestinatarios(ctx: TenantContext, id: string, e: EntradaSolicitud["destinatarios"]) {
  acceso(ctx, ["direccion"]);
  const s = await ctx.db.solicitudDocumental.findFirst({ where: { id, estado: { in: ["borrador", "publicada"] } } });
  if (!s) fallo();
  const filas = await resolverDestinatarios(ctx, { titulo: s.titulo, anioAcademico: s.anioAcademico, destinatarios: e });
  for (const f of filas) {
    const existe = await ctx.db.solicitudDestinatario.findFirst({ where: { solicitudId: id, membershipId: f.membershipId } });
    if (existe && !existe.retiradoAt) continue;
    if (existe) await ctx.db.solicitudDestinatario.update({ where: { id: existe.id }, data: { retiradoAt: null } });
    else await ctx.db.solicitudDestinatario.create({ data: { tenantId: ctx.tenant.id, solicitudId: id, ...f } });
    await evento(ctx, id, "destinatario_agregado", undefined, undefined, { membershipId: f.membershipId });
  }
  if (s.estado === "publicada") await avisarSolicitudNueva(ctx, id);
}
export async function retirarDestinatario(ctx: TenantContext, id: string) {
  acceso(ctx, ["direccion"]);
  const d = await ctx.db.solicitudDestinatario.findFirst({ where: { id }, include: { solicitud: true } });
  if (!d || d.retiradoAt || !["borrador", "publicada"].includes(d.solicitud.estado)) fallo();
  await ctx.db.solicitudDestinatario.update({ where: { id }, data: { retiradoAt: new Date() } });
  await evento(ctx, d.solicitudId, "destinatario_retirado", id);
}
