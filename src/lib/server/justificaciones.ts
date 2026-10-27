import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import type { EstadoJustificacion } from "@/generated/prisma/enums";
import { urlColegio } from "@/lib/dominio";
import { isoDeFechaDb } from "@/lib/fechas";
import { MENSAJE_PLAZO_VENCIDO } from "@/lib/plazo-justificacion";
import { primerNombre } from "@/lib/nombres";
import { auditar } from "./auditoria";
import { db, dbTenant, type DbTenant } from "./db";
import { destinatariosDeAlumno, encolarAviso, encolarParaDestinatario } from "./notificaciones/encolar";
import { requireFeature } from "./plan";
import { guardarArchivo, urlArchivo } from "./storage";
import { MENSAJE_VALIDACION, validarArchivo } from "./storage/validacion";
import { requireAlumnoVisible, type TenantContext } from "./tenant";
import { formatoTokenValido, hashToken } from "./tokens";

// Justificaciones de faltas (specs/07-justificaciones.md).

export const MENSAJE_TOKEN_INVALIDO = "Este enlace ya se usó o no es válido. Escríbele a la tutora desde Khipu.";
export { MENSAJE_PLAZO_VENCIDO };

export const esquemaMotivo = z
  .string()
  .trim()
  .min(1, "Escribe el motivo de la falta.")
  .max(500, "El motivo puede tener hasta 500 caracteres.");

export type DatosTokenJustificar = {
  tokenId: string;
  tenant: { id: string; nombre: string; slug: string };
  alumno: string;
  fecha: string;
  asistenciaId: string;
  apoderadoId: string;
};

export type ConsultaToken =
  | { ok: true; datos: DatosTokenJustificar }
  | { ok: false; motivo: "invalido" | "vencido" };

/** Como `buscarTokenJustificacion`, pero distingue un enlace vencido (plazo del reglamento) de uno inválido o usado. */
export async function consultarTokenJustificacion(
  token: string,
  opciones: { tenantId?: string; ahora?: Date } = {},
): Promise<ConsultaToken> {
  if (!formatoTokenValido(token)) return { ok: false, motivo: "invalido" };
  const fila = await db.justificacionToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true, tenantId: true, asistenciaId: true, apoderadoId: true, expiraAt: true, usadoAt: true,
      tenant: { select: { id: true, nombre: true, slug: true, estado: true } },
      asistencia: { select: { fecha: true, estado: true, alumno: { select: { nombres: true } } } },
    },
  });
  const ahora = opciones.ahora ?? new Date();
  if (!fila || fila.usadoAt) return { ok: false, motivo: "invalido" };
  if (opciones.tenantId && fila.tenantId !== opciones.tenantId) return { ok: false, motivo: "invalido" };
  if (fila.tenant.estado === "suspendido" || fila.asistencia.estado !== "falta") return { ok: false, motivo: "invalido" };
  if (fila.expiraAt <= ahora) return { ok: false, motivo: "vencido" };
  return {
    ok: true,
    datos: {
      tokenId: fila.id,
      tenant: { id: fila.tenant.id, nombre: fila.tenant.nombre, slug: fila.tenant.slug },
      alumno: primerNombre(fila.asistencia.alumno.nombres),
      fecha: isoDeFechaDb(fila.asistencia.fecha),
      asistenciaId: fila.asistenciaId,
      apoderadoId: fila.apoderadoId,
    },
  };
}

/** Token válido (existe, sin usar, sin vencer, falta vigente) o null. Sin sesión: el token autoriza. */
export async function buscarTokenJustificacion(
  token: string,
  opciones: { tenantId?: string; ahora?: Date } = {},
): Promise<DatosTokenJustificar | null> {
  const r = await consultarTokenJustificacion(token, opciones);
  return r.ok ? r.datos : null;
}

export type ResultadoJustificar = { ok: true; tenantId?: string } | { ok: false; error: string };

/** Crea la justificación (con adjunto opcional) y avisa al tutor del salón. */
async function crearJustificacion(
  tdb: DbTenant,
  datos: { tenant: { id: string; nombre: string; slug: string }; asistenciaId: string; apoderadoId: string; actorId: string | null; motivo: string; archivo: Buffer | null },
): Promise<ResultadoJustificar> {
  let adjuntoArchivoId: string | null = null;
  if (datos.archivo) {
    const subido = await guardarArchivo(tdb, datos.archivo, { tenantId: datos.tenant.id, carpeta: "justificaciones", privado: true, subidoPorId: datos.actorId });
    if (!subido.ok) return subido;
    adjuntoArchivoId = subido.archivo.id;
  }
  const justificacion = await tdb.justificacion.create({
    data: { tenantId: datos.tenant.id, asistenciaId: datos.asistenciaId, apoderadoId: datos.apoderadoId, motivo: datos.motivo, adjuntoArchivoId },
    select: { id: true, asistencia: { select: { fecha: true, alumno: { select: { nombres: true, salon: { select: { tutor: { select: { estado: true, user: { select: { email: true } } } } } } } } } } },
  });
  await auditar({
    tenantId: datos.tenant.id, actorId: datos.actorId, accion: "crear", entidad: "justificacion", entidadId: justificacion.id,
    detalle: { asistenciaId: datos.asistenciaId, adjunto: !!adjuntoArchivoId },
  });
  const tutor = justificacion.asistencia.alumno.salon.tutor;
  if (tutor && tutor.estado === "activa") {
    await encolarAviso(tdb, {
      tenantId: datos.tenant.id,
      tipo: "justificacion",
      canal: "correo",
      destinatario: tutor.user.email,
      plantilla: "justificacion_recibida",
      asistenciaId: datos.asistenciaId,
      referenciaId: justificacion.id,
      payload: {
        colegio: datos.tenant.nombre,
        alumno: primerNombre(justificacion.asistencia.alumno.nombres),
        fecha: isoDeFechaDb(justificacion.asistencia.fecha),
        url: urlColegio(datos.tenant.slug, "/justificaciones"),
      },
    });
  }
  return { ok: true };
}

/** Justificación desde el enlace del correo (sin sesión). El token se marca usado de forma atómica. */
export async function justificarConToken(
  token: string,
  entrada: { motivo: unknown; archivo: Buffer | null },
  opciones: { tenantId?: string; ahora?: Date } = {},
): Promise<ResultadoJustificar> {
  const motivo = esquemaMotivo.safeParse(entrada.motivo);
  if (!motivo.success) return { ok: false, error: motivo.error.issues[0].message };
  if (entrada.archivo) {
    const v = validarArchivo(entrada.archivo);
    if (!v.ok) return { ok: false, error: MENSAJE_VALIDACION[v.error] };
  }
  const consulta = await consultarTokenJustificacion(token, opciones);
  if (!consulta.ok) return { ok: false, error: consulta.motivo === "vencido" ? MENSAJE_PLAZO_VENCIDO : MENSAJE_TOKEN_INVALIDO };
  const datos = consulta.datos;

  const ahora = opciones.ahora ?? new Date();
  const reservado = await db.justificacionToken.updateMany({
    where: { id: datos.tokenId, usadoAt: null, expiraAt: { gt: ahora } },
    data: { usadoAt: ahora },
  });
  if (reservado.count !== 1) return { ok: false, error: MENSAJE_TOKEN_INVALIDO };

  const membresia = await db.membership.findUnique({ where: { id: datos.apoderadoId }, select: { userId: true } });
  try {
    const r = await crearJustificacion(dbTenant(datos.tenant.id), {
      tenant: datos.tenant, asistenciaId: datos.asistenciaId, apoderadoId: datos.apoderadoId,
      actorId: membresia?.userId ?? null, motivo: motivo.data, archivo: entrada.archivo,
    });
    if (!r.ok) {
      await db.justificacionToken.update({ where: { id: datos.tokenId }, data: { usadoAt: null } });
      return r;
    }
    return { ok: true, tenantId: datos.tenant.id };
  } catch (error) {
    await db.justificacionToken.update({ where: { id: datos.tokenId }, data: { usadoAt: null } });
    throw error;
  }
}

/** Falta del hijo que el apoderado con sesión puede justificar, o 404/403. */
export async function faltaParaJustificar(ctx: TenantContext, asistenciaId: string) {
  requireFeature(ctx, "justificaciones");
  if (ctx.rol !== "apoderado") forbidden();
  const asistencia = await ctx.db.asistencia.findUnique({
    where: { id: asistenciaId },
    select: {
      id: true, alumnoId: true, fecha: true, estado: true, alumno: { select: { nombres: true } },
      justificaciones: { orderBy: { createdAt: "desc" }, take: 1, select: { estado: true } },
    },
  });
  if (!asistencia) notFound();
  await requireAlumnoVisible(ctx, asistencia.alumnoId);
  const ultima = asistencia.justificaciones[0]?.estado;
  const disponible = asistencia.estado === "falta" && (!ultima || ultima === "rechazada");
  return { id: asistencia.id, alumno: primerNombre(asistencia.alumno.nombres), fecha: isoDeFechaDb(asistencia.fecha), disponible };
}

/** Justificación desde /asistencia con sesión. Invalida los enlaces pendientes de esa falta. */
export async function justificarConSesion(
  ctx: TenantContext,
  asistenciaId: string,
  entrada: { motivo: unknown; archivo: Buffer | null },
): Promise<ResultadoJustificar> {
  const falta = await faltaParaJustificar(ctx, asistenciaId);
  if (!falta.disponible) return { ok: false, error: "Esta falta ya tiene una justificación." };
  const motivo = esquemaMotivo.safeParse(entrada.motivo);
  if (!motivo.success) return { ok: false, error: motivo.error.issues[0].message };
  await ctx.db.justificacionToken.updateMany({
    where: { asistenciaId, apoderadoId: ctx.membership.id, usadoAt: null },
    data: { usadoAt: new Date() },
  });
  return crearJustificacion(ctx.db, {
    tenant: ctx.tenant, asistenciaId, apoderadoId: ctx.membership.id, actorId: ctx.user.id, motivo: motivo.data, archivo: entrada.archivo,
  });
}

function filtroPorRol(ctx: TenantContext) {
  if (ctx.rol === "direccion") return {};
  if (ctx.rol === "profesor") return { asistencia: { alumno: { salon: { tutorId: ctx.membership.id } } } };
  if (ctx.rol === "apoderado") return { apoderadoId: ctx.membership.id };
  forbidden();
}

export type JustificacionVista = {
  id: string;
  alumno: string;
  salon: string;
  fecha: string;
  motivo: string;
  estado: EstadoJustificacion;
  creada: Date;
  apoderado: string;
  adjuntoUrl: string | null;
  adjuntoMime: string | null;
  revisadoPor: string | null;
  /** Comentario de quien revisó (visible para la familia). */
  comentarioRevision: string | null;
};

/** Dirección: todas; tutor: las de su salón; apoderado: las suyas. */
export async function listarJustificaciones(ctx: TenantContext): Promise<JustificacionVista[]> {
  requireFeature(ctx, "justificaciones");
  const filas = await ctx.db.justificacion.findMany({
    where: filtroPorRol(ctx),
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true, motivo: true, estado: true, createdAt: true, adjunto: true, comentarioRevision: true,
      apoderado: { select: { user: { select: { nombres: true, apellidos: true } } } },
      revisadoPor: { select: { user: { select: { nombres: true, apellidos: true } } } },
      asistencia: { select: { fecha: true, alumno: { select: { nombres: true, apellidos: true, salon: { select: { nombre: true } } } } } },
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "justificacion", detalle: { cantidad: filas.length } });
  return Promise.all(
    filas.map(async (f) => ({
      id: f.id,
      alumno: `${f.asistencia.alumno.nombres} ${f.asistencia.alumno.apellidos}`,
      salon: f.asistencia.alumno.salon.nombre,
      fecha: isoDeFechaDb(f.asistencia.fecha),
      motivo: f.motivo,
      estado: f.estado,
      creada: f.createdAt,
      apoderado: `${f.apoderado.user.nombres} ${f.apoderado.user.apellidos}`.trim(),
      adjuntoUrl: f.adjunto ? await urlArchivo(f.adjunto) : null,
      adjuntoMime: f.adjunto?.mimeType ?? null,
      revisadoPor: f.revisadoPor ? `${f.revisadoPor.user.nombres} ${f.revisadoPor.user.apellidos}`.trim() : null,
      comentarioRevision: f.comentarioRevision,
    })),
  );
}

export const esquemaRevision = z.object({
  id: z.uuid(),
  decision: z.enum(["aceptada", "rechazada"]),
  comentario: z.string().trim().max(500).optional(),
});

/** Tutor del salón o dirección acepta o rechaza; la familia recibe un aviso neutral. */
export async function revisarJustificacion(ctx: TenantContext, entrada: unknown): Promise<void> {
  requireFeature(ctx, "justificaciones");
  if (ctx.rol !== "direccion" && ctx.rol !== "profesor") forbidden();
  const datos = esquemaRevision.parse(entrada);
  const j = await ctx.db.justificacion.findFirst({
    where: { id: datos.id, ...filtroPorRol(ctx) },
    select: {
      id: true, estado: true, apoderadoId: true, asistenciaId: true,
      asistencia: { select: { fecha: true, alumnoId: true, alumno: { select: { nombres: true } } } },
    },
  });
  if (!j) forbidden();
  if (j.estado !== "pendiente") return;

  const actualizada = await ctx.db.justificacion.updateMany({
    where: { id: j.id, estado: "pendiente" },
    data: { estado: datos.decision, revisadoPorId: ctx.membership.id, revisadoAt: new Date(), comentarioRevision: datos.comentario || null },
  });
  if (actualizada.count === 0) return;
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "justificacion", entidadId: j.id,
    detalle: { estado: datos.decision, comentario: datos.comentario ?? null },
  });

  const destinatario = (await destinatariosDeAlumno(ctx.db, j.asistencia.alumnoId)).find((d) => d.apoderadoId === j.apoderadoId);
  if (destinatario) {
    await encolarParaDestinatario(ctx.db, destinatario, {
      tenantId: ctx.tenant.id,
      tipo: "justificacion",
      plantilla: "justificacion_revisada",
      asistenciaId: j.asistenciaId,
      referenciaId: j.id,
      payload: {
        colegio: ctx.tenant.nombre,
        alumno: primerNombre(j.asistencia.alumno.nombres),
        fecha: isoDeFechaDb(j.asistencia.fecha),
        estado: datos.decision,
        ...(datos.comentario ? { comentario: datos.comentario } : {}),
      },
    });
  }
}
