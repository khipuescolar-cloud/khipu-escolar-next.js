import "server-only";
import { urlColegio } from "@/lib/dominio";
import { nombreCompleto } from "@/lib/mensajes";
import type { TenantContext } from "../tenant";
import { VENTANA_MENSAJE_MINUTOS } from "./avisos-familia";
import { entregarNotificaciones, type Entrega } from "./internas";
import { destinoPersonal } from "./preferencias";

// Aviso de mensaje nuevo en el chat familia ↔ profesor (specs/08 y 38): bandeja + push, sin correo (el chat no es una
// comunicación importante; el correo queda para asistencia, justificaciones, correcciones, comunicados importantes y libretas).
// - Escribe el profesor → la familia: bandeja siempre (membresía activa); push con consentimiento vigente y preferencia `push`.
// - Escribe la familia → el profesor: bandeja y push según sus preferencias de perfil (`destinoPersonal`; sin consentimiento).
//   La fila de la cola no lleva `apoderadoId` (no es un aviso a familia).
// En ambos casos `referenciaId = conversacionId` y máx. 1 notificación por conversación y destinatario cada 15 min
// (clave `mensaje:<conversación>:<ventana de 15 min>`: un reintento no duplica).

export type ConversacionParaAviso = {
  id: string;
  apoderadoId: string;
  profesorId: string;
  /** Alumno de la conversación: la familia deja de ver la notificación si se desvincula. */
  alumnoId?: string;
  alumno: { nombres: string; apellidos: string };
};

/** Devuelve cuántas filas de aviso (push) encoló; 0 si se omitió por el límite de 15 min, sin destinatario o sin push. */
export async function avisarMensajeNuevo(ctx: TenantContext, c: ConversacionParaAviso): Promise<number> {
  let destino: { membershipId: string; endpoints: string[]; apoderadoId: string | null } | null = null;
  if (ctx.rol === "profesor") {
    const m = await ctx.db.membership.findFirst({
      where: { id: c.apoderadoId, rol: "apoderado", estado: "activa" },
      select: {
        preferenciaAviso: { select: { push: true } },
        consentimientos: { where: { revocadoAt: null }, select: { id: true }, take: 1 },
        user: { select: { pushSuscripciones: { select: { endpoint: true } } } },
      },
    });
    if (m) {
      const push = m.consentimientos.length > 0 && (m.preferenciaAviso?.push ?? true);
      destino = { membershipId: c.apoderadoId, endpoints: push ? m.user.pushSuscripciones.map((s) => s.endpoint) : [], apoderadoId: c.apoderadoId };
    }
  } else if (ctx.rol === "apoderado") {
    const p = await destinoPersonal(ctx.db, c.profesorId, ["profesor"]);
    if (p) destino = { membershipId: c.profesorId, endpoints: p.pushEndpoints, apoderadoId: null };
  }
  if (!destino) return 0;

  const ventanaMs = VENTANA_MENSAJE_MINUTOS * 60_000;
  const ahora = Date.now();
  const ruta = `/mensajes/${c.id}`;
  const reciente = await ctx.db.notificacion.count({
    where: { membershipId: destino.membershipId, tipo: "mensaje", url: ruta, createdAt: { gte: new Date(ahora - ventanaMs) } },
  });
  if (reciente > 0) return 0;

  const remitente = nombreCompleto(ctx.user);
  const alumno = nombreCompleto(c.alumno);
  const entrega: Entrega<"mensaje_nuevo"> = {
    membershipId: destino.membershipId, alumnoId: destino.apoderadoId ? (c.alumnoId ?? null) : null, titulo: `Mensaje nuevo de ${remitente}`, cuerpo: `${remitente} te escribió sobre ${alumno}.`, url: ruta,
    email: null, endpoints: destino.endpoints, apoderadoId: destino.apoderadoId,
    payload: { colegio: ctx.tenant.nombre, remitente, alumno, url: urlColegio(ctx.tenant.slug, ruta) },
  };
  const r = await entregarNotificaciones(ctx.db, {
    tenant: ctx.tenant, tipo: "mensaje", clave: `mensaje:${c.id}:${Math.floor(ahora / ventanaMs)}`, tipoAviso: "mensaje", plantilla: "mensaje_nuevo",
    referenciaId: c.id, entregas: [entrega],
  });
  return r.avisos;
}
