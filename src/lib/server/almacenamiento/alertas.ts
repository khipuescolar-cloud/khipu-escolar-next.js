import "server-only";
import { umbralDe, umbralRearmado } from "@/lib/almacenamiento";
import { urlColegio } from "@/lib/dominio";
import { auditar } from "../auditoria";
import { db, dbTenant } from "../db";
import { entregarNotificaciones } from "../notificaciones/internas";

/** Reclama el umbral con CAS: dos confirmaciones concurrentes producen un solo aviso. */
export async function actualizarAvisoCuota(tenantId: string, actorId: string | null = null): Promise<number | null> {
  const medidor = await db.almacenamientoColegio.findUnique({ where: { tenantId } });
  if (!medidor?.limiteBytes || medidor.limiteBytes <= BigInt(0)) return null;
  const porcentaje = Number(medidor.usadoBytes * BigInt(100) / medidor.limiteBytes);
  const nuevo = umbralDe(porcentaje);
  if (nuevo <= medidor.umbralNotificado) {
    const rearmado = umbralRearmado(medidor.umbralNotificado, porcentaje);
    if (rearmado < medidor.umbralNotificado) await db.almacenamientoColegio.updateMany({ where: { tenantId, umbralNotificado: medidor.umbralNotificado }, data: { umbralNotificado: rearmado } });
    return null;
  }
  const reclamado = await db.almacenamientoColegio.updateMany({ where: { tenantId, umbralNotificado: medidor.umbralNotificado }, data: { umbralNotificado: nuevo } });
  if (!reclamado.count) return null;
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { id: true, slug: true, nombre: true } });
  const directores = await db.membership.findMany({ where: { tenantId, rol: "direccion", estado: "activa" }, select: { id: true, userId: true, user: { select: { email: true } } } });
  const dispositivos = await db.pushSuscripcion.findMany({ where: { userId: { in: directores.map(d => d.userId) } }, select: { userId: true, endpoint: true } });
  const tdb = dbTenant(tenantId);
  const ruta = "/configuracion/almacenamiento";
  try {
    await entregarNotificaciones(tdb, { tenant, tipo: "comunicado", tipoAviso: "alerta_direccion", clave: `cuota:${nuevo}:${medidor.umbralNotificado}:${medidor.actualizadoAt.getTime()}`, plantilla: "cuota_umbral", entregas: directores.map(d => ({ membershipId: d.id, titulo: `Almacenamiento al ${nuevo} %`, cuerpo: `El colegio usó ${nuevo} % de su espacio.`, url: ruta, email: d.user.email, endpoints: dispositivos.filter(p => p.userId === d.userId).map(p => p.endpoint), apoderadoId: null, payload: { colegio: tenant.nombre, porcentaje: nuevo, url: urlColegio(tenant.slug, ruta) } })) });
  } catch (error) {
    await db.almacenamientoColegio.updateMany({ where: { tenantId, umbralNotificado: nuevo }, data: { umbralNotificado: medidor.umbralNotificado } });
    throw error;
  }
  await auditar({ tenantId, actorId, accion: "enviar", entidad: "cuota_almacenamiento", entidadId: tenantId, detalle: { porcentaje: nuevo } });
  return nuevo;
}
