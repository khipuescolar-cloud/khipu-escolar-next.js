import "server-only";
import { urlColegio } from "@/lib/dominio";
import { nombreCompleto } from "@/lib/mensajes";
import type { TenantContext } from "../tenant";
import { encolarAviso } from "./encolar";
import { encolarAvisoFamilia, VENTANA_MENSAJE_MINUTOS } from "./avisos-familia";

// Aviso de mensaje nuevo en el chat familia ↔ profesor (specs/08). Solo encola; el worker envía.
// - Escribe el profesor → aviso a la familia (consentimiento y preferencias; ver avisos-familia.ts).
// - Escribe la familia → aviso al profesor por correo y por cada suscripción push suya (el personal no necesita
//   consentimiento). La fila no lleva `apoderadoId` (no es un aviso a familia).
// En ambos casos `referenciaId = conversacionId` y máx. 1 aviso por conversación y destinatario cada 15 min.

export type ConversacionParaAviso = {
  id: string;
  apoderadoId: string;
  profesorId: string;
  alumno: { nombres: string; apellidos: string };
};

/** Devuelve cuántas filas de aviso encoló (0 si se omitió por límite, consentimiento, etc.). */
export async function avisarMensajeNuevo(ctx: TenantContext, c: ConversacionParaAviso): Promise<number> {
  const payload = {
    colegio: ctx.tenant.nombre,
    remitente: nombreCompleto(ctx.user),
    alumno: nombreCompleto(c.alumno),
    url: urlColegio(ctx.tenant.slug, `/mensajes/${c.id}`),
  };
  if (ctx.rol === "profesor") {
    const ok = await encolarAvisoFamilia(ctx, { plantilla: "mensaje_nuevo", apoderadoId: c.apoderadoId, conversacionId: c.id, payload });
    return ok ? 1 : 0;
  }
  if (ctx.rol !== "apoderado") return 0;

  const profesor = await ctx.db.membership.findFirst({
    where: { id: c.profesorId, rol: "profesor", estado: "activa" },
    select: { user: { select: { email: true, pushSuscripciones: { select: { endpoint: true } } } } },
  });
  if (!profesor) return 0;
  const desde = new Date(Date.now() - VENTANA_MENSAJE_MINUTOS * 60_000);
  const reciente = await ctx.db.aviso.count({
    where: { plantilla: "mensaje_nuevo", referenciaId: c.id, apoderadoId: null, createdAt: { gte: desde } },
  });
  if (reciente > 0) return 0;

  const base = { tenantId: ctx.tenant.id, tipo: "mensaje" as const, plantilla: "mensaje_nuevo" as const, payload, referenciaId: c.id };
  await encolarAviso(ctx.db, { ...base, canal: "correo", destinatario: profesor.user.email });
  for (const { endpoint } of profesor.user.pushSuscripciones) {
    await encolarAviso(ctx.db, { ...base, canal: "push", destinatario: endpoint });
  }
  return 1 + profesor.user.pushSuscripciones.length;
}
