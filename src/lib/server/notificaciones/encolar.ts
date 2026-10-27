import "server-only";
import type { TipoAviso } from "@/generated/prisma/enums";
import type { TenantContext } from "../tenant";

/**
 * Cola de avisos: solo INSERTA filas en `avisos` con estado "pendiente"; el worker de la cola
 * (otro módulo) las envía. Contrato de plantillas y payloads:
 *   mensaje_nuevo → { colegio, remitente, alumno, url }  (tipo mensaje; máx. 1 por conversación cada 15 min)
 *   comunicado    → { colegio, titulo, url }             (tipo comunicado)
 *   invitacion    → { colegio, nombre, rol, url }        (tipo invitacion)
 * Para mensajes y comunicados solo se encola si el apoderado tiene consentimiento sin revocar,
 * aceptó correos y `recibeAvisos` no está apagado. Las invitaciones no exigen consentimiento (aún no entró).
 */
export type EntradaAviso =
  | { plantilla: "mensaje_nuevo"; apoderadoId: string; payload: { colegio: string; remitente: string; alumno: string; url: string } }
  | { plantilla: "comunicado"; apoderadoId: string; payload: { colegio: string; titulo: string; url: string } }
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

/** Devuelve true si se encoló el aviso, false si se omitió (sin consentimiento, límite de 15 min, etc.). */
export async function encolarAviso(ctx: Pick<TenantContext, "db" | "tenant">, entrada: EntradaAviso): Promise<boolean> {
  const apoderadoId = entrada.apoderadoId ?? null;
  let destinatario: string;

  if (entrada.plantilla === "invitacion") {
    destinatario = entrada.destinatario;
  } else {
    const apoderado = await ctx.db.membership.findFirst({
      where: { id: entrada.apoderadoId, rol: "apoderado", estado: "activa" },
      select: { user: { select: { email: true } } },
    });
    if (!apoderado) return false;
    const consentimiento = await ctx.db.consentimiento.count({ where: { apoderadoId: entrada.apoderadoId, revocadoAt: null } });
    if (consentimiento === 0) return false;
    const preferencia = await ctx.db.preferenciaAviso.findFirst({ where: { apoderadoId: entrada.apoderadoId } });
    if (preferencia && !preferencia.correo) return false;
    destinatario = apoderado.user.email;

    if (entrada.plantilla === "mensaje_nuevo") {
      const desde = new Date(Date.now() - VENTANA_MENSAJE_MINUTOS * 60_000);
      const reciente = await ctx.db.aviso.count({
        where: { apoderadoId, plantilla: "mensaje_nuevo", createdAt: { gte: desde }, payload: { path: ["url"], equals: entrada.payload.url } },
      });
      if (reciente > 0) return false;
    }
  }

  await ctx.db.aviso.create({
    data: {
      tenantId: ctx.tenant.id,
      tipo: TIPO[entrada.plantilla],
      canal: "correo",
      apoderadoId,
      destinatario,
      plantilla: entrada.plantilla,
      asunto: asunto(entrada),
      payload: entrada.payload,
      estado: "pendiente",
    },
  });
  return true;
}
