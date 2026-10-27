import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { etiquetaApoderado, etiquetaProfesor, MAX_MENSAJE, nombreCompleto } from "@/lib/mensajes";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { avisarMensajeNuevo } from "./notificaciones/avisos-mensajes";
import { salonIdsVisibles, type TenantContext } from "./tenant";

// Chat familia ↔ profesor (specs/08-chat-familia-profesor.md).
// Conversación = (alumno, profesor, apoderado). Nunca se expone teléfono ni correo de la otra parte.

const SELECT_NOMBRE = { select: { user: { select: { nombres: true, apellidos: true } } } } as const;
const SELECT_SALON = { select: { nombre: true, tutorId: true, cursos: { select: { nombre: true, profesorId: true } } } } as const;

export type Interlocutor = { alumnoId: string; profesorId: string; apoderadoId: string; etiqueta: string };

/** A quién puede escribir el usuario (apoderado → tutor y profesores de sus hijos; profesor → apoderados de sus alumnos). */
export async function destinatariosPosibles(ctx: TenantContext): Promise<Interlocutor[]> {
  if (ctx.rol === "apoderado") {
    const vinculos = await ctx.db.apoderadoAlumno.findMany({
      where: { apoderadoId: ctx.membership.id, alumno: { estado: "activo" } },
      select: {
        alumnoId: true,
        alumno: { select: { nombres: true, apellidos: true, salon: { select: { ...SELECT_SALON.select, tutor: { select: { estado: true, user: SELECT_NOMBRE.select.user } }, cursos: { select: { nombre: true, profesorId: true, profesor: { select: { estado: true, user: SELECT_NOMBRE.select.user } } } } } } } },
      },
    });
    const salida: Interlocutor[] = [];
    for (const v of vinculos) {
      const salon = v.alumno.salon;
      const profesores = new Map<string, { nombre: string }>();
      if (salon.tutorId && salon.tutor?.estado === "activa") profesores.set(salon.tutorId, { nombre: nombreCompleto(salon.tutor.user) });
      for (const c of salon.cursos) {
        if (c.profesorId && c.profesor?.estado === "activa") profesores.set(c.profesorId, { nombre: nombreCompleto(c.profesor.user) });
      }
      for (const [profesorId, { nombre }] of profesores) {
        salida.push({ alumnoId: v.alumnoId, profesorId, apoderadoId: ctx.membership.id, etiqueta: `${etiquetaProfesor(nombre, profesorId, salon)} — sobre ${v.alumno.nombres}` });
      }
    }
    return salida;
  }
  if (ctx.rol === "profesor") {
    const salonIds = await salonIdsVisibles(ctx);
    const vinculos = await ctx.db.apoderadoAlumno.findMany({
      where: { alumno: { salonId: { in: salonIds }, estado: "activo" }, apoderado: { estado: "activa" } },
      select: { alumnoId: true, apoderadoId: true, parentesco: true, alumno: { select: { nombres: true, apellidos: true } }, apoderado: SELECT_NOMBRE },
    });
    return vinculos.map((v) => ({
      alumnoId: v.alumnoId,
      profesorId: ctx.membership.id,
      apoderadoId: v.apoderadoId,
      etiqueta: etiquetaApoderado(nombreCompleto(v.apoderado.user), v.parentesco, nombreCompleto(v.alumno)),
    }));
  }
  return [];
}

const esquemaApertura = z.object({ alumnoId: z.uuid(), contraparteId: z.uuid() });

/** Abre (o reutiliza) la conversación con otra persona sobre un alumno. `contraparteId` = profesor (si escribe la familia) o apoderado (si escribe el profesor). */
export async function abrirConversacion(ctx: TenantContext, entrada: { alumnoId: string; contraparteId: string }): Promise<string> {
  const { alumnoId, contraparteId } = esquemaApertura.parse(entrada);
  if (ctx.rol !== "apoderado" && ctx.rol !== "profesor") forbidden();
  const posibles = await destinatariosPosibles(ctx);
  const par = posibles.find((p) => p.alumnoId === alumnoId && (ctx.rol === "apoderado" ? p.profesorId : p.apoderadoId) === contraparteId);
  if (!par) forbidden();

  const existente = await ctx.db.conversacion.findFirst({
    where: { alumnoId, profesorId: par.profesorId, apoderadoId: par.apoderadoId },
    select: { id: true },
  });
  if (existente) return existente.id;
  const creada = await ctx.db.conversacion.create({
    data: { tenantId: ctx.tenant.id, alumnoId, profesorId: par.profesorId, apoderadoId: par.apoderadoId },
  });
  return creada.id;
}

/** Filtro de conversaciones que el usuario puede ver. Dirección ve todas (solo lectura, auditada). */
function filtroConversaciones(ctx: TenantContext) {
  if (ctx.rol === "direccion") return {};
  if (ctx.rol === "profesor") return { profesorId: ctx.membership.id };
  if (ctx.rol === "apoderado") return { apoderadoId: ctx.membership.id };
  forbidden();
}

const INCLUDE_CONVERSACION = {
  alumno: { select: { nombres: true, apellidos: true } },
  profesor: { select: { id: true, user: SELECT_NOMBRE.select.user } },
  apoderado: { select: { id: true, user: SELECT_NOMBRE.select.user } },
} as const;

type ConversacionCargada = {
  alumno: { nombres: string; apellidos: string };
  profesor: { id: string; user: { nombres: string; apellidos: string } };
  apoderado: { id: string; user: { nombres: string; apellidos: string } };
  alumnoId: string;
  apoderadoId: string;
  profesorId: string;
};

/** Texto de «con quién hablas» según el rol de quien mira, sin teléfonos ni correos. */
async function etiquetaDe(ctx: TenantContext, c: ConversacionCargada): Promise<string> {
  const alumno = nombreCompleto(c.alumno);
  if (ctx.rol === "profesor") {
    const v = await ctx.db.apoderadoAlumno.findFirst({ where: { alumnoId: c.alumnoId, apoderadoId: c.apoderadoId }, select: { parentesco: true } });
    return etiquetaApoderado(nombreCompleto(c.apoderado.user), v?.parentesco ?? "apoderado", alumno);
  }
  const salon = await ctx.db.salon.findFirst({ where: { alumnos: { some: { id: c.alumnoId } } }, ...SELECT_SALON });
  const prof = salon ? etiquetaProfesor(nombreCompleto(c.profesor.user), c.profesorId, salon) : nombreCompleto(c.profesor.user);
  if (ctx.rol === "direccion") {
    return `${prof} ⇄ ${nombreCompleto(c.apoderado.user)} (sobre ${alumno})`;
  }
  return `${prof} — sobre ${c.alumno.nombres}`;
}

export type ResumenConversacion = {
  id: string;
  etiqueta: string;
  ultimoMensaje: { cuerpo: string; createdAt: Date; propio: boolean } | null;
  noLeidos: number;
};

export async function listarConversaciones(ctx: TenantContext): Promise<ResumenConversacion[]> {
  const conversaciones = await ctx.db.conversacion.findMany({
    where: filtroConversaciones(ctx),
    include: { ...INCLUDE_CONVERSACION, mensajes: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const noLeidos = await ctx.db.mensaje.groupBy({
    by: ["conversacionId"],
    where: { conversacionId: { in: conversaciones.map((c) => c.id) }, leidoAt: null, autorId: { not: ctx.membership.id } },
    _count: { _all: true },
  });
  const cuenta = new Map(noLeidos.map((n) => [n.conversacionId, n._count._all]));
  const resumen = await Promise.all(
    conversaciones.map(async (c) => {
      const ultimo = c.mensajes[0];
      return {
        id: c.id,
        etiqueta: await etiquetaDe(ctx, c),
        ultimoMensaje: ultimo ? { cuerpo: ultimo.cuerpo, createdAt: ultimo.createdAt, propio: ultimo.autorId === ctx.membership.id } : null,
        noLeidos: ctx.rol === "direccion" ? 0 : (cuenta.get(c.id) ?? 0),
      };
    }),
  );
  return resumen.sort((a, b) => (b.ultimoMensaje?.createdAt.getTime() ?? 0) - (a.ultimoMensaje?.createdAt.getTime() ?? 0));
}

/** Mensajes sin leer del usuario (para el contador del mosaico). Dirección no tiene bandeja propia. */
export async function conteoNoLeidos(ctx: TenantContext): Promise<number> {
  if (ctx.rol !== "apoderado" && ctx.rol !== "profesor") return 0;
  return ctx.db.mensaje.count({
    where: { leidoAt: null, autorId: { not: ctx.membership.id }, conversacion: filtroConversaciones(ctx) },
  });
}

export type MensajeVista = { id: string; cuerpo: string; createdAt: string; propio: boolean; autor: string };
export type HiloVista = { id: string; etiqueta: string; puedeEscribir: boolean; mensajes: MensajeVista[] };

/**
 * Abre el hilo (403 si no es de este usuario), marca como leídos los mensajes de la otra parte
 * y devuelve datos serializables. Dirección solo lee y queda auditado.
 */
export async function obtenerHilo(ctx: TenantContext, id: string): Promise<HiloVista> {
  if (!z.uuid().safeParse(id).success) forbidden();
  const c = await ctx.db.conversacion.findFirst({
    where: { id, ...filtroConversaciones(ctx) },
    include: { ...INCLUDE_CONVERSACION, mensajes: { orderBy: { createdAt: "asc" }, include: { autor: SELECT_NOMBRE } } },
  });
  if (!c) forbidden();

  if (ctx.rol === "direccion") {
    await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "conversacion", entidadId: c.id });
  } else {
    await ctx.db.mensaje.updateMany({
      where: { conversacionId: c.id, leidoAt: null, autorId: { not: ctx.membership.id } },
      data: { leidoAt: new Date() },
    });
  }
  return {
    id: c.id,
    etiqueta: await etiquetaDe(ctx, c),
    puedeEscribir: ctx.rol !== "direccion",
    mensajes: c.mensajes.map((m) => ({
      id: m.id,
      cuerpo: m.cuerpo,
      createdAt: m.createdAt.toISOString(),
      propio: m.autorId === ctx.membership.id,
      autor: nombreCompleto(m.autor.user),
    })),
  };
}

const esquemaMensaje = z.object({
  conversacionId: z.uuid(),
  cuerpo: z.string().trim().min(1, "Escribe un mensaje.").max(MAX_MENSAJE, `El mensaje puede tener hasta ${MAX_MENSAJE} caracteres.`),
});

/** Guarda un mensaje. Dirección no puede escribir. Encola el aviso a la otra parte (máx. 1 cada 15 min por conversación). */
export async function enviarMensaje(ctx: TenantContext, entrada: { conversacionId: string; cuerpo: string }): Promise<void> {
  if (ctx.rol !== "apoderado" && ctx.rol !== "profesor") forbidden();
  const datos = esquemaMensaje.safeParse(entrada);
  if (!datos.success) throw new ErrorDeNegocio(datos.error.issues[0].message);
  const c = await ctx.db.conversacion.findFirst({
    where: { id: datos.data.conversacionId, ...filtroConversaciones(ctx) },
    include: { alumno: { select: { nombres: true, apellidos: true } } },
  });
  if (!c) forbidden();

  await ctx.db.mensaje.create({
    data: { tenantId: ctx.tenant.id, conversacionId: c.id, autorId: ctx.membership.id, cuerpo: datos.data.cuerpo },
  });
  await avisarMensajeNuevo(ctx, c);
}
