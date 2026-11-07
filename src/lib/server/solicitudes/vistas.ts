import "server-only";
import { resumenDestinatarios, vencida } from "@/lib/solicitudes";
import type { TenantContext } from "../tenant";
import { auditar } from "../auditoria";
import { acceso, fallo } from "./comun";
import type { EstadoSolicitud, SolicitudVista } from "./tipos";

function nombre(m?: { user: { nombres: string; apellidos: string } } | null) { return m ? `${m.user.nombres} ${m.user.apellidos}`.trim() : "—"; }
const adjunto = (a: { id: string; nombre: string | null; mimeType: string; bytes: number }) => ({ id: a.id, nombre: a.nombre ?? "Archivo", mimeType: a.mimeType, bytes: a.bytes });
export async function listarSolicitudes(ctx: TenantContext, f: { estado?: EstadoSolicitud; anio?: number } = {}): Promise<SolicitudVista[]> {
  acceso(ctx, ["direccion", "profesor"]);
  const filas = await ctx.db.solicitudDocumental.findMany({ where: { estado: ctx.rol === "profesor" ? { in: ["publicada", "cerrada"] } : f.estado, anioAcademico: f.anio, destinatarios: ctx.rol === "profesor" ? { some: { membershipId: ctx.membership.id, retiradoAt: null } } : undefined }, orderBy: { createdAt: "desc" }, select: { id: true } });
  return Promise.all(filas.map(s => detalleSolicitud(ctx, s.id)));
}
export async function detalleSolicitud(ctx: TenantContext, id: string): Promise<SolicitudVista> {
  acceso(ctx, ["direccion", "profesor"]);
  const s = await ctx.db.solicitudDocumental.findFirst({ where: { id, ...(ctx.rol === "profesor" ? { estado: { in: ["publicada", "cerrada"] }, destinatarios: { some: { membershipId: ctx.membership.id, retiradoAt: null } } } : {}) }, include: { plantillaDocumento: { include: { archivos: { orderBy: { createdAt: "desc" }, take: 1 } } }, destinatarios: { where: { retiradoAt: null, ...(ctx.rol === "profesor" ? { membershipId: ctx.membership.id } : {}) }, include: { membership: { include: { user: true } }, versiones: { orderBy: { numero: "asc" }, include: { presentadaPor: { include: { user: true } }, revisadaPor: { include: { user: true } }, archivos: { orderBy: { orden: "asc" }, include: { archivo: true } } } } } } } });
  if (!s) fallo();
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.membership.id, accion: "ver", entidad: "solicitud_documental", entidadId: id });
  const destinatarios = s.destinatarios.map(d => ({ id: d.id, membershipId: d.membershipId, docente: nombre(d.membership), grupo: d.grupo, estado: d.estado, vencida: vencida(d.estado, s.fechaLimite, d.plazoCorreccion), entregaTardia: d.entregaTardia, versionActual: d.versionActual, plazoCorreccion: d.plazoCorreccion, versiones: d.versiones.map(v => ({ id: v.id, numero: v.numero, presentadaAt: v.presentadaAt, presentadaPor: nombre(v.presentadaPor), tardia: v.tardia, comentario: v.comentario, resultado: v.resultado, observaciones: v.observaciones, revisadaPor: nombre(v.revisadaPor), revisadaAt: v.revisadaAt, archivos: v.archivos.map(a => adjunto(a.archivo)) })) }));
  const resumen = resumenDestinatarios(s.destinatarios.map(d => ({ estado: d.estado, versionActual: d.versionActual, entregaTardia: d.entregaTardia, fechaLimite: s.fechaLimite, plazoCorreccion: d.plazoCorreccion })));
  return { id: s.id, titulo: s.titulo, instrucciones: s.instrucciones, anioAcademico: s.anioAcademico, periodoEtiqueta: s.periodoEtiqueta, fechaLimite: s.fechaLimite, conHora: s.conHora, estado: s.estado, plantilla: s.plantillaDocumento?.archivos[0] ? adjunto(s.plantillaDocumento.archivos[0]) : null, destinatarios, resumen };
}
