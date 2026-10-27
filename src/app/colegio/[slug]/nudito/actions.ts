"use server";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { auditar } from "@/lib/server/auditoria";
import { leerAcciones } from "@/lib/server/nudito/acciones";
import { nuditoProvider } from "@/lib/server/nudito/intent-nudito";
import { detectarIntencion } from "@/lib/server/nudito/intenciones";
import type { AccionNudito, MensajeHistorial } from "@/lib/server/nudito/tipos";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

const MAX_CARACTERES = 500;
const LIMITE_POR_MINUTO = 20;

const entradaSchema = z.object({
  slug: z.string().min(1).max(63),
  conversacionId: z.uuid().nullable(),
  texto: z.string().trim().min(1, "Escribe tu pregunta.").max(MAX_CARACTERES, `Máximo ${MAX_CARACTERES} caracteres.`),
});

export type ResultadoNudito =
  | { ok: true; conversacionId: string; texto: string; derivado: boolean; acciones: AccionNudito[] }
  | { ok: false; error: string };

export async function enviarMensajeNuditoAction(entrada: z.input<typeof entradaSchema>): Promise<ResultadoNudito> {
  const parsed = entradaSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Mensaje no válido." };
  const { slug, conversacionId, texto } = parsed.data;

  const ctx = await requireTenantContext(slug, ["apoderado"]);
  requireFeature(ctx, "nudito");

  // Límite simple por membresía (en BD, vale entre instancias).
  const recientes = await ctx.db.nuditoMensaje.count({
    where: {
      autor: "usuario",
      createdAt: { gte: new Date(Date.now() - 60_000) },
      conversacion: { membershipId: ctx.membership.id },
    },
  });
  if (recientes >= LIMITE_POR_MINUTO) {
    return { ok: false, error: "Estás escribiendo muy rápido. Espera un momento e inténtalo de nuevo." };
  }

  // La conversación debe ser de esta membresía en este colegio.
  let convId = conversacionId;
  if (convId) {
    const existe = await ctx.db.nuditoConversacion.findFirst({ where: { id: convId, membershipId: ctx.membership.id }, select: { id: true } });
    if (!existe) return { ok: false, error: "No encontré esa conversación." };
  } else {
    const nueva = await ctx.db.nuditoConversacion.create({ data: { tenantId: ctx.tenant.id, membershipId: ctx.membership.id } });
    convId = nueva.id;
  }

  const previos = await ctx.db.nuditoMensaje.findMany({
    where: { conversacionId: convId },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { autor: true, cuerpo: true, intencion: true, derivado: true },
  });
  const historial: MensajeHistorial[] = previos.reverse();

  const respuesta = await nuditoProvider.responder(ctx, texto, historial);

  await ctx.db.nuditoMensaje.create({
    data: { tenantId: ctx.tenant.id, conversacionId: convId, autor: "usuario", cuerpo: texto, intencion: detectarIntencion(texto) },
  });
  await ctx.db.nuditoMensaje.create({
    data: { tenantId: ctx.tenant.id, conversacionId: convId, autor: "nudito", cuerpo: respuesta.texto, intencion: respuesta.intencion, derivado: respuesta.derivado,
      acciones: respuesta.acciones && respuesta.acciones.length > 0 ? (respuesta.acciones as unknown as Prisma.InputJsonValue) : undefined,
    },
  });
  if (respuesta.alumnoId) {
    await ctx.db.nuditoConversacion.updateMany({ where: { id: convId, alumnoId: null }, data: { alumnoId: respuesta.alumnoId } });
  }
  await auditar({
    tenantId: ctx.tenant.id,
    actorId: ctx.user.id,
    accion: "ver",
    entidad: "nudito_conversacion",
    entidadId: convId,
    detalle: { intencion: respuesta.intencion, derivado: respuesta.derivado },
  });

  return { ok: true, conversacionId: convId, texto: respuesta.texto, derivado: respuesta.derivado, acciones: respuesta.acciones ?? [] };
}

export type ConversacionReabierta = {
  conversacionId: string;
  mensajes: { autor: "usuario" | "nudito"; texto: string; acciones: AccionNudito[] }[];
};

const VENTANA_REABRIR_MS = 12 * 60 * 60 * 1000;

/** Al reabrir la burbuja: la última conversación de esta familia si tuvo actividad en las últimas 12 horas. */
export async function cargarConversacionNuditoAction(slug: string): Promise<ConversacionReabierta | null> {
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 63) return null;
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  requireFeature(ctx, "nudito");
  const ultima = await ctx.db.nuditoMensaje.findFirst({
    where: { conversacion: { membershipId: ctx.membership.id }, createdAt: { gte: new Date(Date.now() - VENTANA_REABRIR_MS) } },
    orderBy: { createdAt: "desc" },
    select: { conversacionId: true },
  });
  if (!ultima) return null;
  const recientes = await ctx.db.nuditoMensaje.findMany({
    where: { conversacionId: ultima.conversacionId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { autor: true, cuerpo: true, acciones: true },
  });
  return {
    conversacionId: ultima.conversacionId,
    mensajes: recientes.reverse().map((m) => ({ autor: m.autor, texto: m.cuerpo, acciones: leerAcciones(m.acciones) })),
  };
}
