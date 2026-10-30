import "server-only";
import type { TipoAviso } from "@/generated/prisma/enums";
import type { TenantContext } from "../tenant";

/**
 * Avisos de chat, comunicados e invitaciones (correo). Solo INSERTA filas en `avisos` con estado "pendiente"; el worker de la cola
 * (notificaciones/cola.ts) las envía. Contrato de plantillas y payloads:
 *   mensaje_nuevo → { colegio, remitente, alumno, url }  (tipo mensaje; referenciaId = conversación; máx. 1 por conversación cada 15 min)
 *   comunicado    → { colegio, titulo, url, adjuntos? }  (tipo comunicado; referenciaId = comunicado; url = /comunicados#comunicado-<id>)
 *   invitacion    → { colegio, nombre, rol, url }        (tipo invitacion)
 * Para mensajes y comunicados solo se encola si el apoderado tiene consentimiento sin revocar y
 * acepta al menos un canal (correo y/o push de sus dispositivos, según `preferencias_aviso`). Las invitaciones no exigen consentimiento (aún no entró).
 */
export type EntradaAviso =
  | { plantilla: "mensaje_nuevo"; apoderadoId: string; conversacionId: string; payload: { colegio: string; remitente: string; alumno: string; url: string } }
  | { plantilla: "comunicado"; apoderadoId: string; referenciaId?: string; payload: { colegio: string; titulo: string; url: string; adjuntos?: number } }
  | { plantilla: "invitacion"; destinatario: string; apoderadoId?: string; payload: { colegio: string; nombre: string; rol: string; url: string } };

export const VENTANA_MENSAJE_MINUTOS = 15;

const TIPO: Record<EntradaAviso["plantilla"], TipoAviso> = { mensaje_nuevo: "mensaje", comunicado: "comunicado", invitacion: "invitacion" };

function asunto(e: EntradaAviso): string {
  switch (e.plantilla) {
    case "mensaje_nuevo":
      return `Tienes un mensaje nuevo de ${e.payload.remitente}`;
    case "comunicado":
      return `${e.payload.colegio}: ${e.payload.titulo}`;
    case "invitacion":
      return `${e.payload.colegio} te invita a Khipu Escolar`;
  }
}

/** Devuelve true si se encoló algún aviso, false si se omitió (sin consentimiento, límite de 15 min, sin canales, etc.). */
export async function encolarAvisoFamilia(ctx: Pick<TenantContext, "db" | "tenant">, entrada: EntradaAviso): Promise<boolean> {
  const apoderadoId = entrada.apoderadoId ?? null;
  const referenciaId =
    entrada.plantilla === "mensaje_nuevo" ? entrada.conversacionId : entrada.plantilla === "comunicado" ? (entrada.referenciaId ?? null) : null;
  const base = {
    tenantId: ctx.tenant.id,
    tipo: TIPO[entrada.plantilla],
    apoderadoId,
    plantilla: entrada.plantilla,
    asunto: asunto(entrada),
    payload: entrada.payload,
    referenciaId,
    estado: "pendiente" as const,
  };

  if (entrada.plantilla === "invitacion") {
    await ctx.db.aviso.create({ data: { ...base, canal: "correo", destinatario: entrada.destinatario } });
    return true;
  }

  const apoderado = await ctx.db.membership.findFirst({
    where: { id: entrada.apoderadoId, rol: "apoderado", estado: "activa" },
    select: { user: { select: { email: true, pushSuscripciones: { select: { endpoint: true } } } } },
  });
  if (!apoderado) return false;
  const consentimiento = await ctx.db.consentimiento.count({ where: { apoderadoId: entrada.apoderadoId, revocadoAt: null } });
  if (consentimiento === 0) return false;
  const preferencia = await ctx.db.preferenciaAviso.findFirst({ where: { apoderadoId: entrada.apoderadoId } });
  const correo = preferencia?.correo ?? true;
  const endpoints = (preferencia?.push ?? true) ? apoderado.user.pushSuscripciones.map((s) => s.endpoint) : [];
  if (!correo && endpoints.length === 0) return false;

  if (entrada.plantilla === "mensaje_nuevo") {
    const desde = new Date(Date.now() - VENTANA_MENSAJE_MINUTOS * 60_000);
    const reciente = await ctx.db.aviso.count({
      where: { apoderadoId, plantilla: "mensaje_nuevo", referenciaId: entrada.conversacionId, createdAt: { gte: desde } },
    });
    if (reciente > 0) return false;
  }

  if (correo) await ctx.db.aviso.create({ data: { ...base, canal: "correo", destinatario: apoderado.user.email } });
  for (const endpoint of endpoints) await ctx.db.aviso.create({ data: { ...base, canal: "push", destinatario: endpoint } });
  return true;
}
