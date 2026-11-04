import "server-only";
import type { TenantContext } from "../tenant";

/**
 * Invitaciones (correo). Solo INSERTA la fila en `avisos` con estado "pendiente"; el worker de la cola
 * (notificaciones/cola.ts) la envía. Contrato: invitacion → { colegio, nombre, rol, url } (tipo invitacion).
 * No exige consentimiento (la persona aún no entró).
 * Mensajes y comunicados ya no pasan por aquí: van a la bandeja interna + push en lote (`internas.ts`, specs/38).
 */
export type EntradaAviso = {
  plantilla: "invitacion"; destinatario: string; apoderadoId?: string; payload: { colegio: string; nombre: string; rol: string; url: string };
};

/** Máx. 1 notificación de chat por conversación y destinatario en esta ventana (specs/08). */
export const VENTANA_MENSAJE_MINUTOS = 15;

/** Encola la invitación. Devuelve true. */
export async function encolarAvisoFamilia(ctx: Pick<TenantContext, "db" | "tenant">, entrada: EntradaAviso): Promise<boolean> {
  await ctx.db.aviso.create({
    data: {
      tenantId: ctx.tenant.id, tipo: "invitacion", canal: "correo", destinatario: entrada.destinatario, apoderadoId: entrada.apoderadoId ?? null,
      plantilla: "invitacion", asunto: `${entrada.payload.colegio} te invita a Khipu Escolar`, payload: entrada.payload, estado: "pendiente",
    },
  });
  return true;
}
