import "server-only";
import type { EntradaArchivo } from "../almacenamiento";
import { liberarArchivo, materializarArchivos } from "../almacenamiento";
import type { TenantContext } from "../tenant";
import { ErrorDeNegocio } from "../contexto-accion";
import { entregaTardia } from "@/lib/solicitudes";
import { acceso, destinatarioVisible, evento, fallo } from "./comun";
import { avisarVersionSolicitud } from "../notificaciones/avisos-solicitudes";

export async function presentarVersion(ctx: TenantContext, destinatarioId: string, e: { archivos: EntradaArchivo[]; comentario?: string }): Promise<{ numero: number }> {
  acceso(ctx, ["profesor"]);
  const d = await destinatarioVisible(ctx, destinatarioId);
  if (d.membershipId !== ctx.membership.id || d.solicitud.estado !== "publicada" || !["pendiente", "observado"].includes(d.estado)) fallo();
  if (e.archivos.length < 1 || e.archivos.length > 3) throw new ErrorDeNegocio("Adjunta entre uno y tres archivos.");
  if (e.archivos.some(a => "buffer" in a && a.buffer.length > 25 * 1024 * 1024)) throw new ErrorDeNegocio("Cada archivo puede pesar hasta 25 MB.");
  const ahora = new Date();
  const tardia = d.versionActual === 0 && entregaTardia(ahora, d.solicitud.fechaLimite);
  if (tardia && !d.solicitud.permiteTardias) throw new ErrorDeNegocio("La fecha límite ya pasó.");
  const archivos = await materializarArchivos(ctx, "solicitud", e.archivos, { maxArchivos: 3 });
  let version: { id: string; numero: number };
  try {
    version = await ctx.db.$transaction(async tx => {
      const r = await tx.solicitudDestinatario.updateMany({ where: { id: d.id, estado: d.estado, versionActual: d.versionActual, retiradoAt: null }, data: { estado: "entregado", versionActual: { increment: 1 }, ultimaEntregaAt: ahora, primeraEntregaAt: d.versionActual === 0 ? ahora : d.primeraEntregaAt, entregaTardia: d.versionActual === 0 ? tardia : d.entregaTardia, plazoCorreccion: null } });
      if (!r.count) fallo();
      return tx.solicitudVersion.create({ data: { tenantId: ctx.tenant.id, destinatarioId: d.id, numero: d.versionActual + 1, comentario: e.comentario?.trim() || null, presentadaPorId: ctx.membership.id, presentadaAt: ahora, tardia, archivos: { create: archivos.map((a, orden) => ({ tenantId: ctx.tenant.id, archivoId: a.id, orden })) } } });
    });
  } catch (error) {
    await Promise.allSettled(archivos.map(a => liberarArchivo(ctx, a.id)));
    throw error;
  }
  await evento(ctx, d.solicitudId, "version_presentada", d.id, version.id);
  await avisarVersionSolicitud(ctx, d.solicitudId, d.id, version.numero);
  return { numero: version.numero };
}
