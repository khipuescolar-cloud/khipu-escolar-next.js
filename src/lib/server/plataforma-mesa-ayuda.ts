import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { CategoriaTicket, EstadoTicket, PrioridadTicket } from "@/generated/prisma/enums";
import { nombreCompleto } from "@/lib/mensajes";
import { nombreRol } from "@/lib/roles";
import {
  ESTADOS_ACTIVOS, ESTADOS_PENDIENTES_KHIPU, ESTADOS_TICKET, etiquetaSla, nombreEstado, NOMBRE_PRIORIDAD, ORDEN_PRIORIDAD,
  PRIORIDADES_TICKET, promedioMinutos, type NivelSla,
} from "@/lib/soporte";
import { db } from "./db";
import { nombresDePlanes } from "./modulos";
import { avisarRespuestaKhipu } from "./notificaciones/avisos-soporte";
import type { AdminContext } from "./plataforma";
import { registrarAuditoriaPlataforma } from "./plataforma-auditoria";
import { responsablesAnteKhipu } from "./plataforma-responsables";
import { armarVista, esquemaCuerpo, mensajeSistema, nombresDePerfiles, type TicketVista } from "./soporte";
import { ErrorDeNegocio } from "./contexto-accion";

// Mesa de ayuda, lado del equipo Khipu (specs/23). Sin TenantContext: cliente global `db` tras `requireAdminPlataforma()`.
// Cada cambio queda en `auditoria_plataforma` (acciones `mesa_*`, sin el texto de los mensajes).

const uuid = z.uuid();

function validar<T extends z.ZodType>(esquema: T, entrada: unknown): z.output<T> {
  const r = esquema.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos.");
  return r.data;
}

async function ticketOError(id: string) {
  if (!uuid.safeParse(id).success) notFound();
  const t = await db.ticketSoporte.findUnique({ where: { id } });
  if (!t) notFound();
  return t;
}

// ───────────── Resumen y bandeja ─────────────

export type ResumenMesa = {
  abiertasSinRespuesta: number;
  enProgreso: number;
  esperandoColegio: number;
  /** Minutos promedio hasta la primera respuesta (conversaciones creadas en los últimos 7 días). */
  primeraRespuestaMin: number | null;
  /** Valoración media (1–5, todas las valoradas) y cuántas hay. */
  valoracionMedia: number | null;
  valoraciones: number;
};

export async function resumenMesaAyuda(_admin: AdminContext, ahora = new Date()): Promise<ResumenMesa> {
  const hace7 = new Date(ahora.getTime() - 7 * 86_400_000);
  const [porEstado, sinRespuesta, recientes, valor] = await Promise.all([
    db.ticketSoporte.groupBy({ by: ["estado"], where: { estado: { in: ESTADOS_ACTIVOS } }, _count: { _all: true } }),
    db.ticketSoporte.count({ where: { estado: "abierto", primeraRespuestaAt: null } }),
    db.ticketSoporte.findMany({ where: { createdAt: { gte: hace7 }, primeraRespuestaAt: { not: null } }, select: { createdAt: true, primeraRespuestaAt: true } }),
    db.ticketSoporte.aggregate({ where: { valoracion: { not: null } }, _avg: { valoracion: true }, _count: { valoracion: true } }),
  ]);
  const de = (e: EstadoTicket) => porEstado.find((x) => x.estado === e)?._count._all ?? 0;
  return {
    abiertasSinRespuesta: sinRespuesta,
    enProgreso: de("en_progreso"),
    esperandoColegio: de("esperando_colegio"),
    primeraRespuestaMin: promedioMinutos(recientes),
    valoracionMedia: valor._avg.valoracion === null ? null : Math.round(valor._avg.valoracion * 10) / 10,
    valoraciones: valor._count.valoracion,
  };
}

/** Pendientes del equipo: abiertas o en progreso (contador de la bandeja y del título). */
export async function pendientesMesaAyuda(admin: AdminContext): Promise<number> {
  void admin; // solo lo produce requireAdminPlataforma()
  return db.ticketSoporte.count({ where: { estado: { in: ESTADOS_PENDIENTES_KHIPU } } });
}

export const esquemaFiltroBandeja = z.object({
  /** «activas» (por defecto), «todas» o un estado. */
  estado: z.union([z.enum(["activas", "todas"]), z.enum(ESTADOS_TICKET as [EstadoTicket, ...EstadoTicket[]])]).catch("activas").default("activas"),
  prioridad: z.enum(PRIORIDADES_TICKET as [PrioridadTicket, ...PrioridadTicket[]]).optional().catch(undefined),
  colegio: z.uuid().optional().catch(undefined),
  /** «mi»: asignadas a mí; «sin»: sin asignar. */
  asignado: z.enum(["mi", "sin"]).optional().catch(undefined),
});
export type FiltroBandeja = z.input<typeof esquemaFiltroBandeja>;

export type FilaBandeja = {
  id: string;
  asunto: string;
  colegio: string;
  categoria: CategoriaTicket;
  prioridad: PrioridadTicket;
  estado: EstadoTicket;
  asignado: string | null;
  ultimoMensajeAt: Date;
  createdAt: Date;
  noLeidos: number;
  /** Solo si espera respuesta de Khipu. */
  sla: { nivel: NivelSla; texto: string } | null;
};

/**
 * Bandeja: filtra por estado, prioridad, colegio y asignación; ordena por prioridad (urgente primero) y antigüedad
 * (la más antigua primero). Marca no leídos (mensajes del colegio después de `leidoKhipuHasta`) y el SLA.
 */
export async function listarBandeja(admin: AdminContext, filtroCrudo: FiltroBandeja = {}, ahora = new Date()): Promise<FilaBandeja[]> {
  const f = esquemaFiltroBandeja.parse(filtroCrudo);
  const where: Prisma.TicketSoporteWhereInput = {
    ...(f.estado === "activas" ? { estado: { in: ESTADOS_ACTIVOS } } : f.estado === "todas" ? {} : { estado: f.estado }),
    ...(f.prioridad ? { prioridad: f.prioridad } : {}),
    ...(f.colegio ? { tenantId: f.colegio } : {}),
    ...(f.asignado === "mi" ? { asignadoAId: admin.user.id } : f.asignado === "sin" ? { asignadoAId: null } : {}),
  };
  const tickets = await db.ticketSoporte.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: 300,
    include: { tenant: { select: { nombre: true } } },
  });
  const ids = tickets.map((t) => t.id);
  const mensajes = ids.length
    ? await db.mensajeSoporte.findMany({
        where: { ticketId: { in: ids }, interno: false, autor: { in: ["colegio", "khipu"] } },
        orderBy: { createdAt: "asc" },
        select: { ticketId: true, autor: true, createdAt: true },
      })
    : [];
  const porTicket = new Map<string, { autor: string; createdAt: Date }[]>();
  for (const m of mensajes) porTicket.set(m.ticketId, [...(porTicket.get(m.ticketId) ?? []), m]);
  const nombres = await nombresDePerfiles(tickets.map((t) => t.asignadoAId));

  const filas = tickets.map((t): FilaBandeja => {
    const lista = porTicket.get(t.id) ?? [];
    const noLeidos = lista.filter((m) => m.autor === "colegio" && (!t.leidoKhipuHasta || m.createdAt > t.leidoKhipuHasta)).length;
    const asignado = t.asignadoAId ? nombres.get(t.asignadoAId) : undefined;
    return {
      id: t.id,
      asunto: t.asunto,
      colegio: t.tenant.nombre,
      categoria: t.categoria,
      prioridad: t.prioridad,
      estado: t.estado,
      asignado: asignado ? nombreCompleto(asignado) : null,
      ultimoMensajeAt: t.ultimoMensajeAt,
      createdAt: t.createdAt,
      noLeidos,
      sla: ESTADOS_PENDIENTES_KHIPU.includes(t.estado) ? slaDe(lista, t.createdAt, ahora) : null,
    };
  });
  return filas.sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] || a.createdAt.getTime() - b.createdAt.getTime());
}

/** Espera de Khipu desde el primer mensaje del colegio posterior a la última respuesta pública de Khipu. */
export function slaDe(mensajes: { autor: string; createdAt: Date }[], creado: Date, ahora: Date) {
  let desde: Date | null = null;
  for (const m of mensajes) {
    if (m.autor === "khipu") desde = null;
    else if (m.autor === "colegio" && !desde) desde = m.createdAt;
  }
  if (!desde && mensajes.length === 0) desde = creado;
  return desde ? etiquetaSla(desde, ahora) : null;
}

/** Colegios con conversaciones (para el filtro). */
export async function colegiosConTickets(admin: AdminContext) {
  void admin;
  const ids = await db.ticketSoporte.findMany({ distinct: ["tenantId"], select: { tenantId: true } });
  return db.tenant.findMany({ where: { id: { in: ids.map((i) => i.tenantId) } }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });
}

// ───────────── Detalle ─────────────

export type DetalleKhipu = {
  vista: TicketVista;
  asignadoAId: string | null;
  colegio: { id: string; nombre: string; slug: string; plan: string; estado: string };
  responsables: { id: string; nombre: string; cargo: string | null; email: string; principal: boolean }[];
  abiertoPor: { nombre: string; cargo: string; email: string };
  equipo: { userId: string; nombre: string }[];
};

/** Hilo completo (con notas internas) y panel lateral. Marca la conversación como leída por Khipu. */
export async function obtenerTicketKhipu(admin: AdminContext, id: string): Promise<DetalleKhipu> {
  const t = await ticketOError(id);
  const [mensajes, tenant, creador, equipo, responsables, planes] = await Promise.all([
    db.mensajeSoporte.findMany({ where: { ticketId: t.id }, orderBy: { createdAt: "asc" }, include: { adjuntos: true } }),
    db.tenant.findUniqueOrThrow({ where: { id: t.tenantId }, select: { id: true, nombre: true, slug: true, plan: true, estado: true } }),
    db.membership.findUnique({ where: { id: t.creadoPorId }, select: { rol: true, cargo: true, user: { select: { nombres: true, apellidos: true, email: true, genero: true } } } }),
    db.adminPlataforma.findMany({ where: { activo: true }, select: { userId: true, user: { select: { nombres: true, apellidos: true } } }, orderBy: { createdAt: "asc" } }),
    responsablesAnteKhipu(t.tenantId),
    nombresDePlanes(),
  ]);
  const ultimo = mensajes.at(-1)?.createdAt;
  if (ultimo && (!t.leidoKhipuHasta || ultimo > t.leidoKhipuHasta)) {
    await db.ticketSoporte.update({ where: { id: t.id }, data: { leidoKhipuHasta: new Date() } });
  }
  return {
    vista: armarVista(t, mensajes, await nombresDePerfiles(mensajes.map((m) => m.autorId)), { tipo: "khipu", userId: admin.user.id }),
    asignadoAId: t.asignadoAId,
    colegio: { id: tenant.id, nombre: tenant.nombre, slug: tenant.slug, plan: planes[tenant.plan], estado: tenant.estado },
    responsables: responsables.map((r) => ({ id: r.id, nombre: `${r.nombres} ${r.apellidos}`.trim(), cargo: r.cargo, email: r.email, principal: r.principal })),
    abiertoPor: creador
      ? { nombre: nombreCompleto(creador.user), cargo: creador.cargo ?? nombreRol(creador.rol, creador.user.genero), email: creador.user.email }
      : { nombre: "Cuenta eliminada", cargo: "", email: "" },
    // Un miembro cuyo perfil se borra entre consultas llega sin `user` (include no es atómico): se omite.
    equipo: equipo.flatMap((e) => (e.user ? [{ userId: e.userId, nombre: nombreCompleto(e.user) }] : [])),
  };
}

/** Solo el hilo (sondeo cada ~5 s). */
export async function hiloKhipu(admin: AdminContext, id: string): Promise<TicketVista> {
  return (await obtenerTicketKhipu(admin, id)).vista;
}

// ───────────── Escritura (Khipu) ─────────────

/**
 * Responde (público) o agrega una nota interna. La primera respuesta pública fija `primeraRespuestaAt`; una respuesta
 * pública en «Abierta» o «En progreso» pasa a «Esperando al colegio». Las notas no cambian estado ni avisan.
 */
export async function responderKhipu(admin: AdminContext, id: string, cuerpo: string, interno: boolean, ahora = new Date()): Promise<{ avisos: number; tenantId: string }> {
  const texto = validar(esquemaCuerpo, cuerpo);
  const t = await ticketOError(id);
  if (!interno && t.estado === "cerrado") throw new ErrorDeNegocio("La conversación está cerrada. Cambia su estado para responder.");
  await db.mensajeSoporte.create({ data: { tenantId: t.tenantId, ticketId: t.id, autor: "khipu", autorId: admin.user.id, cuerpo: texto, interno, createdAt: ahora } });
  if (interno) {
    await db.ticketSoporte.update({ where: { id: t.id }, data: { leidoKhipuHasta: ahora } });
    await registrarAuditoriaPlataforma(admin, "mesa_nota_interna", t.tenantId, { ticketId: t.id });
    return { avisos: 0, tenantId: t.tenantId };
  }
  const estado: EstadoTicket = t.estado === "abierto" || t.estado === "en_progreso" ? "esperando_colegio" : t.estado;
  await db.ticketSoporte.update({
    where: { id: t.id },
    data: {
      estado, ultimoMensajeAt: ahora, leidoKhipuHasta: ahora,
      ...(t.primeraRespuestaAt ? {} : { primeraRespuestaAt: ahora }),
      // Responder sin asignado: se lo queda quien responde.
      ...(t.asignadoAId ? {} : { asignadoAId: admin.user.id }),
    },
  });
  await registrarAuditoriaPlataforma(admin, "mesa_responder", t.tenantId, { ticketId: t.id });
  const avisos = await avisarRespuestaKhipu(t);
  return { avisos, tenantId: t.tenantId };
}

/** Asigna a un miembro activo del equipo (o quita la asignación con null). Deja un mensaje del sistema. */
export async function asignarTicket(admin: AdminContext, id: string, userId: string | null): Promise<void> {
  const t = await ticketOError(id);
  if (userId !== null && !uuid.safeParse(userId).success) throw new ErrorDeNegocio("Elige a alguien del equipo.");
  if (t.asignadoAId === userId) return;
  let texto = "La conversación quedó sin asignar.";
  if (userId) {
    const miembro = await db.adminPlataforma.findFirst({ where: { userId, activo: true }, select: { user: { select: { nombres: true } } } });
    if (!miembro) throw new ErrorDeNegocio("Esa persona no es parte activa del equipo Khipu.");
    texto = `${miembro.user.nombres.trim().split(/\s+/)[0]} del equipo Khipu tomó tu consulta.`;
  }
  await db.ticketSoporte.update({ where: { id: t.id }, data: { asignadoAId: userId } });
  await mensajeSistema(t, texto);
  await registrarAuditoriaPlataforma(admin, "mesa_asignar", t.tenantId, { ticketId: t.id, asignadoA: userId });
}

export async function cambiarEstadoTicket(admin: AdminContext, id: string, estado: string): Promise<void> {
  const nuevo = validar(z.enum(ESTADOS_TICKET as [EstadoTicket, ...EstadoTicket[]], { error: "Elige un estado." }), estado);
  const t = await ticketOError(id);
  if (t.estado === nuevo) return;
  const ahora = new Date();
  await db.ticketSoporte.update({
    where: { id: t.id },
    data: { estado: nuevo, ...(nuevo === "resuelto" ? { resueltoAt: ahora } : nuevo === "cerrado" ? { resueltoAt: t.resueltoAt ?? ahora } : { resueltoAt: null }) },
  });
  await mensajeSistema(t, `El equipo Khipu cambió el estado a «${nombreEstado(nuevo, "colegio")}».`, ahora);
  await registrarAuditoriaPlataforma(admin, "mesa_estado", t.tenantId, { ticketId: t.id, de: t.estado, a: nuevo });
}

export async function cambiarPrioridadTicket(admin: AdminContext, id: string, prioridad: string): Promise<void> {
  const nueva = validar(z.enum(PRIORIDADES_TICKET as [PrioridadTicket, ...PrioridadTicket[]], { error: "Elige una prioridad." }), prioridad);
  const t = await ticketOError(id);
  if (t.prioridad === nueva) return;
  await db.ticketSoporte.update({ where: { id: t.id }, data: { prioridad: nueva } });
  await mensajeSistema(t, `El equipo Khipu cambió la prioridad a «${NOMBRE_PRIORIDAD[nueva]}».`);
  await registrarAuditoriaPlataforma(admin, "mesa_prioridad", t.tenantId, { ticketId: t.id, de: t.prioridad, a: nueva });
}

/** Captura de un mensaje público de la mesa de ayuda (descarga desde el panel). */
export async function adjuntoDeMesa(_admin: AdminContext, archivoId: string) {
  if (!uuid.safeParse(archivoId).success) notFound();
  const archivo = await db.archivo.findUnique({ where: { id: archivoId } });
  if (!archivo?.mensajeSoporteId) notFound();
  return archivo;
}
