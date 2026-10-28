import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { AutorSoporte, CategoriaTicket, EstadoTicket, PrioridadTicket } from "@/generated/prisma/enums";
import type { AdjuntoVista } from "@/lib/adjuntos";
import { nombreCompleto } from "@/lib/mensajes";
import {
  CATEGORIAS_TICKET, DIAS_CIERRE_AUTOMATICO, HORARIO_SOPORTE_POR_DEFECTO, MAX_ASUNTO, MAX_BYTES_CAPTURA, MAX_COMENTARIO_VALORACION,
  MAX_CUERPO_SOPORTE, MIMES_CAPTURA, PRIORIDADES_TICKET,
} from "@/lib/soporte";
import { adjuntoVista, detectarMimeAdjunto, guardarAdjuntos, limpiarNombre, type AdjuntoValidado, type EntradaAdjunto } from "./adjuntos";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import { avisarEquipoSoporte } from "./notificaciones/avisos-soporte";
import { requireFeature } from "./plan";
import { requireRol, type TenantContext } from "./tenant";

// Mesa de ayuda, lado del colegio (specs/23): chat de la dirección (y del personal con el módulo «soporte») con el equipo Khipu.
// - Visibilidad: dirección ve todas las conversaciones del colegio; administrativo, las suyas y las que abrió la dirección.
// - Las notas internas (`interno = true`) NUNCA salen de este módulo hacia el colegio: se filtran en cada consulta.
// - En modo soporte el módulo no existe (FEATURES_PRIVADAS_SOPORTE): el equipo responde desde la mesa de ayuda.

export const ROLES_SOPORTE = ["direccion", "administrativo"] as const;

export type MensajeVista = {
  id: string;
  autor: AutorSoporte;
  /** Escrito por quien mira (solo en mensajes de su lado). */
  propio: boolean;
  /** «Carmen Prueba», «Equipo Khipu · Rocío»; vacío en mensajes del sistema. */
  nombre: string;
  cuerpo: string;
  interno: boolean;
  createdAt: string;
  adjuntos: AdjuntoVista[];
};

export type TicketVista = {
  id: string;
  asunto: string;
  categoria: CategoriaTicket;
  prioridad: PrioridadTicket;
  estado: EstadoTicket;
  createdAt: string;
  valoracion: number | null;
  comentarioValoracion: string | null;
  mensajes: MensajeVista[];
  /** Momento en que se armó la vista (el cliente se queda con la más reciente entre el render y el sondeo). */
  generadoAt: number;
};

// ───────────── Validación ─────────────

const uuid = z.uuid();

export const esquemaTicketNuevo = z.object({
  asunto: z.string().trim().min(3, "Escribe un asunto de al menos 3 letras.").max(MAX_ASUNTO, `El asunto admite hasta ${MAX_ASUNTO} caracteres.`),
  categoria: z.enum(CATEGORIAS_TICKET as [CategoriaTicket, ...CategoriaTicket[]], { error: "Elige una categoría." }),
  prioridad: z.enum(PRIORIDADES_TICKET as [PrioridadTicket, ...PrioridadTicket[]], { error: "Elige una prioridad." }),
  cuerpo: z.string().trim().min(1, "Escribe tu mensaje.").max(MAX_CUERPO_SOPORTE, `El mensaje admite hasta ${MAX_CUERPO_SOPORTE} caracteres.`),
});
export type EntradaTicketNuevo = z.input<typeof esquemaTicketNuevo>;

export const esquemaCuerpo = z.string().trim().min(1, "Escribe tu mensaje.").max(MAX_CUERPO_SOPORTE, `El mensaje admite hasta ${MAX_CUERPO_SOPORTE} caracteres.`);

function validar<T extends z.ZodType>(esquema: T, entrada: unknown): z.output<T> {
  const r = esquema.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos.");
  return r.data;
}

/** Una sola captura opcional: PNG, JPG o PDF de hasta 5 MB (por su firma, no por la extensión). */
export function validarCaptura(entradas: EntradaAdjunto[]): AdjuntoValidado[] {
  if (entradas.length > 1) throw new ErrorDeNegocio("Puedes adjuntar un solo archivo por mensaje.");
  return entradas.map((e) => {
    const nombre = limpiarNombre(e.nombre);
    if (e.buffer.length === 0) throw new ErrorDeNegocio(`«${nombre}» está vacío.`);
    if (e.buffer.length > MAX_BYTES_CAPTURA) throw new ErrorDeNegocio(`«${nombre}» pesa más de 5 MB.`);
    const mimeType = detectarMimeAdjunto(e.buffer);
    if (!mimeType || !MIMES_CAPTURA.has(mimeType)) throw new ErrorDeNegocio(`«${nombre}» no se puede adjuntar. Solo aceptamos PNG, JPG o PDF.`);
    return { nombre, buffer: e.buffer, mimeType };
  });
}

// ───────────── Acceso ─────────────

/** Módulo activo (plan, colegio y rol), rol con pantallas del módulo y fuera del modo soporte. */
export function exigirSoporte(ctx: TenantContext): void {
  requireRol(ctx, [...ROLES_SOPORTE]);
  requireFeature(ctx, "soporte");
  if (ctx.soporte) forbidden();
}

/** Conversaciones que puede ver el rol: dirección, todas; administrativo, las suyas y las que abrió la dirección. */
export function filtroVisibles(ctx: TenantContext): Prisma.TicketSoporteWhereInput {
  if (ctx.rol === "direccion") return {};
  return { OR: [{ creadoPorId: ctx.membership.id }, { creadoPor: { rol: "direccion" } }] };
}

async function ticketVisibleOError(ctx: TenantContext, id: string) {
  if (!uuid.safeParse(id).success) notFound();
  const t = await ctx.db.ticketSoporte.findFirst({ where: { id, ...filtroVisibles(ctx) } });
  if (!t) notFound();
  return t;
}

/** Para la descarga de capturas: el archivo pertenece a un mensaje público de una conversación visible. */
export async function puedeVerAdjuntoSoporte(ctx: TenantContext, mensajeSoporteId: string): Promise<boolean> {
  if (ctx.soporte || (ctx.rol !== "direccion" && ctx.rol !== "administrativo")) return false;
  const m = await ctx.db.mensajeSoporte.findFirst({ where: { id: mensajeSoporteId, interno: false }, select: { ticketId: true } });
  if (!m) return false;
  const t = await ctx.db.ticketSoporte.findFirst({ where: { id: m.ticketId, ...filtroVisibles(ctx) }, select: { id: true } });
  return !!t;
}

// ───────────── Vistas ─────────────

/** Nombres de los perfiles que escribieron (Profile es global). */
export async function nombresDePerfiles(ids: (string | null)[]): Promise<Map<string, { nombres: string; apellidos: string }>> {
  const unicos = [...new Set(ids.filter((x): x is string => !!x))];
  if (unicos.length === 0) return new Map();
  const perfiles = await db.profile.findMany({ where: { id: { in: unicos } }, select: { id: true, nombres: true, apellidos: true } });
  return new Map(perfiles.map((p) => [p.id, { nombres: p.nombres, apellidos: p.apellidos }]));
}

/** «Equipo Khipu · Rocío» (solo el primer nombre del miembro del equipo). */
export function nombreEquipo(p: { nombres: string } | undefined): string {
  const primero = p?.nombres.trim().split(/\s+/)[0];
  return primero ? `Equipo Khipu · ${primero}` : "Equipo Khipu";
}

type FilaMensaje = Prisma.MensajeSoporteGetPayload<{ include: { adjuntos: true } }>;

export function armarVista(
  t: { id: string; asunto: string; categoria: CategoriaTicket; prioridad: PrioridadTicket; estado: EstadoTicket; createdAt: Date; valoracion: number | null; comentarioValoracion: string | null },
  mensajes: FilaMensaje[],
  nombres: Map<string, { nombres: string; apellidos: string }>,
  lado: { tipo: "colegio" | "khipu"; userId: string },
): TicketVista {
  return {
    id: t.id,
    asunto: t.asunto,
    categoria: t.categoria,
    prioridad: t.prioridad,
    estado: t.estado,
    createdAt: t.createdAt.toISOString(),
    valoracion: t.valoracion,
    comentarioValoracion: t.comentarioValoracion,
    generadoAt: Date.now(),
    mensajes: mensajes.map((m) => {
      const p = m.autorId ? nombres.get(m.autorId) : undefined;
      const nombre = m.autor === "sistema" ? "" : m.autor === "khipu" ? (lado.tipo === "colegio" ? nombreEquipo(p) : p ? nombreCompleto(p) : "Equipo Khipu") : p ? nombreCompleto(p) : "Colegio";
      return {
        id: m.id,
        autor: m.autor,
        propio: m.autor === lado.tipo && m.autorId === lado.userId,
        nombre,
        cuerpo: m.cuerpo,
        interno: m.interno,
        createdAt: m.createdAt.toISOString(),
        adjuntos: m.adjuntos.map(adjuntoVista),
      };
    }),
  };
}

export type FilaTicketColegio = {
  id: string;
  asunto: string;
  categoria: CategoriaTicket;
  prioridad: PrioridadTicket;
  estado: EstadoTicket;
  ultimoMensajeAt: Date;
  ultimo: { autor: AutorSoporte; cuerpo: string } | null;
  noLeidos: number;
  creadoPor: string;
};

/** Conversaciones visibles para quien mira, de la más reciente a la más antigua. Sin notas internas. */
export async function listarTicketsColegio(ctx: TenantContext): Promise<FilaTicketColegio[]> {
  exigirSoporte(ctx);
  const tickets = await ctx.db.ticketSoporte.findMany({
    where: filtroVisibles(ctx),
    orderBy: { ultimoMensajeAt: "desc" },
    take: 200,
    include: {
      creadoPor: { select: { user: { select: { nombres: true, apellidos: true } } } },
      mensajes: { where: { interno: false }, orderBy: { createdAt: "desc" }, take: 1, select: { autor: true, cuerpo: true } },
    },
  });
  const noLeidos = await contarNoLeidosColegio(ctx, tickets);
  return tickets.map((t) => ({
    id: t.id,
    asunto: t.asunto,
    categoria: t.categoria,
    prioridad: t.prioridad,
    estado: t.estado,
    ultimoMensajeAt: t.ultimoMensajeAt,
    ultimo: t.mensajes[0] ?? null,
    noLeidos: noLeidos.get(t.id) ?? 0,
    creadoPor: nombreCompleto(t.creadoPor.user),
  }));
}

/** Respuestas públicas de Khipu posteriores a `leidoColegioHasta`, por conversación. */
async function contarNoLeidosColegio(ctx: TenantContext, tickets: { id: string; leidoColegioHasta: Date | null }[]): Promise<Map<string, number>> {
  if (tickets.length === 0) return new Map();
  const mensajes = await ctx.db.mensajeSoporte.findMany({
    where: { ticketId: { in: tickets.map((t) => t.id) }, autor: "khipu", interno: false },
    select: { ticketId: true, createdAt: true },
  });
  const leido = new Map(tickets.map((t) => [t.id, t.leidoColegioHasta]));
  const conteo = new Map<string, number>();
  for (const m of mensajes) {
    const hasta = leido.get(m.ticketId);
    if (!hasta || m.createdAt > hasta) conteo.set(m.ticketId, (conteo.get(m.ticketId) ?? 0) + 1);
  }
  return conteo;
}

/** Campana del colegio: respuestas nuevas de Khipu en las conversaciones visibles. */
export async function respuestasNuevasSoporte(ctx: TenantContext): Promise<number> {
  const tickets = await ctx.db.ticketSoporte.findMany({ where: filtroVisibles(ctx), select: { id: true, leidoColegioHasta: true } });
  let total = 0;
  for (const n of (await contarNoLeidosColegio(ctx, tickets)).values()) total += n;
  return total;
}

/** Hilo para el colegio (sin notas internas). Marca la conversación como leída por el colegio. */
export async function obtenerTicketColegio(ctx: TenantContext, id: string): Promise<TicketVista> {
  exigirSoporte(ctx);
  const t = await ticketVisibleOError(ctx, id);
  const mensajes = await ctx.db.mensajeSoporte.findMany({
    where: { ticketId: t.id, interno: false },
    orderBy: { createdAt: "asc" },
    include: { adjuntos: true },
  });
  const ultimo = mensajes.at(-1)?.createdAt;
  if (ultimo && (!t.leidoColegioHasta || ultimo > t.leidoColegioHasta)) {
    await ctx.db.ticketSoporte.update({ where: { id: t.id }, data: { leidoColegioHasta: new Date() } });
  }
  return armarVista(t, mensajes, await nombresDePerfiles(mensajes.map((m) => m.autorId)), { tipo: "colegio", userId: ctx.user.id });
}

// ───────────── Escritura (colegio) ─────────────

/** Abre una conversación con su primer mensaje (y la captura opcional). Encola el aviso al equipo Khipu. */
export async function crearTicket(ctx: TenantContext, entrada: EntradaTicketNuevo, adjuntos: EntradaAdjunto[] = []): Promise<{ id: string; avisos: number }> {
  exigirSoporte(ctx);
  const datos = validar(esquemaTicketNuevo, entrada);
  const captura = validarCaptura(adjuntos);
  const ahora = new Date();
  const ticket = await ctx.db.ticketSoporte.create({
    data: {
      tenantId: ctx.tenant.id, asunto: datos.asunto, categoria: datos.categoria, prioridad: datos.prioridad, creadoPorId: ctx.membership.id,
      ultimoMensajeAt: ahora, leidoColegioHasta: ahora,
    },
  });
  try {
    const mensaje = await ctx.db.mensajeSoporte.create({
      data: { tenantId: ctx.tenant.id, ticketId: ticket.id, autor: "colegio", autorId: ctx.user.id, cuerpo: datos.cuerpo, createdAt: ahora },
    });
    if (captura.length) await guardarAdjuntos(ctx, { mensajeSoporteId: mensaje.id }, captura);
  } catch (e) {
    await ctx.db.ticketSoporte.delete({ where: { id: ticket.id } });
    throw e;
  }
  const avisos = await avisarEquipoSoporte(ticket, { nueva: true });
  return { id: ticket.id, avisos };
}

/** Responde en una conversación. Si estaba resuelta, la reabre; si estaba esperando al colegio, pasa a «En progreso». */
export async function responderColegio(ctx: TenantContext, id: string, cuerpo: string, adjuntos: EntradaAdjunto[] = []): Promise<{ avisos: number }> {
  exigirSoporte(ctx);
  const texto = validar(esquemaCuerpo, cuerpo);
  const captura = validarCaptura(adjuntos);
  const t = await ticketVisibleOError(ctx, id);
  if (t.estado === "cerrado") throw new ErrorDeNegocio("Esta conversación está cerrada. Si necesitas ayuda, abre una nueva.");
  const ahora = new Date();
  if (t.estado === "resuelto") {
    await mensajeSistema(t, `${nombreCompleto(ctx.user)} reabrió la conversación.`, new Date(ahora.getTime() - 1));
  }
  const mensaje = await ctx.db.mensajeSoporte.create({
    data: { tenantId: ctx.tenant.id, ticketId: t.id, autor: "colegio", autorId: ctx.user.id, cuerpo: texto, createdAt: ahora },
  });
  try {
    if (captura.length) await guardarAdjuntos(ctx, { mensajeSoporteId: mensaje.id }, captura);
  } catch (e) {
    await ctx.db.mensajeSoporte.delete({ where: { id: mensaje.id } });
    throw e;
  }
  // Sin respuesta de Khipu sigue «abierta»; con respuesta previa vuelve a «En progreso».
  const estado: EstadoTicket = t.primeraRespuestaAt ? "en_progreso" : "abierto";
  await ctx.db.ticketSoporte.update({
    where: { id: t.id },
    data: { estado, ultimoMensajeAt: ahora, leidoColegioHasta: ahora, ...(t.estado === "resuelto" ? { resueltoAt: null } : {}) },
  });
  const avisos = await avisarEquipoSoporte(t, { nueva: false });
  return { avisos };
}

/**
 * Mensaje discreto del sistema (cambio de estado, prioridad o asignación) visible para ambos lados.
 * Usa el cliente global con el `tenantId` de una conversación ya validada por quien llama.
 */
export async function mensajeSistema(t: { id: string; tenantId: string }, cuerpo: string, ahora = new Date()): Promise<void> {
  await db.mensajeSoporte.create({ data: { tenantId: t.tenantId, ticketId: t.id, autor: "sistema", autorId: null, cuerpo, createdAt: ahora } });
  await db.ticketSoporte.update({ where: { id: t.id }, data: { ultimoMensajeAt: ahora } });
}

export async function marcarResueltoColegio(ctx: TenantContext, id: string): Promise<void> {
  exigirSoporte(ctx);
  const t = await ticketVisibleOError(ctx, id);
  if (t.estado === "resuelto" || t.estado === "cerrado") throw new ErrorDeNegocio("La conversación ya está resuelta o cerrada.");
  const ahora = new Date();
  await ctx.db.ticketSoporte.update({ where: { id: t.id }, data: { estado: "resuelto", resueltoAt: ahora } });
  await mensajeSistema(t, `${nombreCompleto(ctx.user)} marcó la conversación como resuelta.`, ahora);
}

export async function reabrirColegio(ctx: TenantContext, id: string): Promise<void> {
  exigirSoporte(ctx);
  const t = await ticketVisibleOError(ctx, id);
  if (t.estado !== "resuelto") throw new ErrorDeNegocio("Solo puedes reabrir una conversación resuelta.");
  await ctx.db.ticketSoporte.update({ where: { id: t.id }, data: { estado: t.primeraRespuestaAt ? "en_progreso" : "abierto", resueltoAt: null } });
  await mensajeSistema(t, `${nombreCompleto(ctx.user)} reabrió la conversación.`);
}

export async function cerrarColegio(ctx: TenantContext, id: string): Promise<void> {
  exigirSoporte(ctx);
  const t = await ticketVisibleOError(ctx, id);
  if (t.estado === "cerrado") throw new ErrorDeNegocio("La conversación ya está cerrada.");
  await ctx.db.ticketSoporte.update({ where: { id: t.id }, data: { estado: "cerrado", ...(t.resueltoAt ? {} : { resueltoAt: new Date() }) } });
  await mensajeSistema(t, `${nombreCompleto(ctx.user)} cerró la conversación.`);
}

export const esquemaValoracion = z.object({
  valoracion: z.coerce.number().int().min(1, "Elige de 1 a 5 estrellas.").max(5, "Elige de 1 a 5 estrellas."),
  comentario: z.string().trim().max(MAX_COMENTARIO_VALORACION, `El comentario admite hasta ${MAX_COMENTARIO_VALORACION} caracteres.`).optional(),
});

/** Valoración 1–5 (y comentario) cuando la conversación está resuelta o cerrada. Se puede cambiar. */
export async function valorarTicket(ctx: TenantContext, id: string, entrada: z.input<typeof esquemaValoracion>): Promise<void> {
  exigirSoporte(ctx);
  const datos = validar(esquemaValoracion, entrada);
  const t = await ticketVisibleOError(ctx, id);
  if (t.estado !== "resuelto" && t.estado !== "cerrado") throw new ErrorDeNegocio("Podrás valorar la atención cuando la conversación esté resuelta.");
  await ctx.db.ticketSoporte.update({ where: { id: t.id }, data: { valoracion: datos.valoracion, comentarioValoracion: datos.comentario || null } });
}

// ───────────── Configuración y cron ─────────────

export const CLAVE_HORARIO_SOPORTE = "soporte:horario";

/** Horario de atención del equipo Khipu (texto libre en ConfigPlataforma «soporte:horario»). */
export async function horarioSoporte(): Promise<string> {
  const fila = await db.configPlataforma.findUnique({ where: { clave: CLAVE_HORARIO_SOPORTE } });
  const v = fila?.valor;
  const texto = typeof v === "string" ? v : v && typeof v === "object" && !Array.isArray(v) && typeof (v as { texto?: unknown }).texto === "string" ? (v as { texto: string }).texto : "";
  return texto.trim() || HORARIO_SOPORTE_POR_DEFECTO;
}

/**
 * Cierra las conversaciones resueltas sin actividad hace más de 7 días (lo llama el cron de avisos).
 * Cada una recibe un mensaje del sistema. Devuelve cuántas cerró.
 */
export async function cerrarResueltosInactivos(ahora = new Date()): Promise<number> {
  const limite = new Date(ahora.getTime() - DIAS_CIERRE_AUTOMATICO * 86_400_000);
  const candidatos = await db.ticketSoporte.findMany({
    where: { estado: "resuelto", ultimoMensajeAt: { lt: limite }, OR: [{ resueltoAt: null }, { resueltoAt: { lt: limite } }] },
    select: { id: true, tenantId: true },
    take: 500,
  });
  let cerrados = 0;
  for (const t of candidatos) {
    const r = await db.ticketSoporte.updateMany({ where: { id: t.id, estado: "resuelto" }, data: { estado: "cerrado", ultimoMensajeAt: ahora } });
    if (r.count === 0) continue;
    await db.mensajeSoporte.create({
      data: { tenantId: t.tenantId, ticketId: t.id, autor: "sistema", cuerpo: `La conversación se cerró automáticamente tras ${DIAS_CIERRE_AUTOMATICO} días sin actividad.`, createdAt: ahora },
    });
    cerrados++;
  }
  return cerrados;
}
