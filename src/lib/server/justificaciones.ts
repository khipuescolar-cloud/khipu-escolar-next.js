import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import type { EstadoJustificacion } from "@/generated/prisma/enums";
import { urlColegio } from "@/lib/dominio";
import { esFechaReal, fechaDb, isoDeFechaDb } from "@/lib/fechas";
import { expiracionJustificacion, mensajePlazoVencido, normalizarPlazoDias, textoPlazoJustificacion } from "@/lib/plazo-justificacion";
import { primerNombre } from "@/lib/nombres";
import { auditar } from "./auditoria";
import { db, dbTenant, type DbTenant } from "./db";
import { alAprobarJustificacion, aplicarVencimientos } from "./nsp";
import { destinatariosDeAlumno, encolarAviso, encolarParaDestinatario } from "./notificaciones/encolar";
import { requireFeature } from "./plan";
import { guardarArchivo, urlArchivo } from "./storage";
import { MENSAJE_VALIDACION, validarArchivo } from "./storage/validacion";
import { requireAlumnoVisible, type TenantContext } from "./tenant";
import { formatoTokenValido, hashToken } from "./tokens";

// Justificaciones de faltas (specs/07-justificaciones.md).

export const MENSAJE_TOKEN_INVALIDO = "Este enlace ya se usó o no es válido. Escríbele a la tutora desde Khipu.";
export { mensajePlazoVencido };

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
  | { ok: false; motivo: "invalido" }
  /** `plazoDias`: días calendario del plazo del colegio, para el mensaje. */
  | { ok: false; motivo: "vencido"; plazoDias: number };

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
      tenant: { select: { id: true, nombre: true, slug: true, estado: true, plazoJustificacionDias: true } },
      asistencia: { select: { fecha: true, estado: true, alumno: { select: { nombres: true } } } },
    },
  });
  const ahora = opciones.ahora ?? new Date();
  if (!fila || fila.usadoAt) return { ok: false, motivo: "invalido" };
  if (opciones.tenantId && fila.tenantId !== opciones.tenantId) return { ok: false, motivo: "invalido" };
  if (fila.tenant.estado === "suspendido" || fila.asistencia.estado !== "falta") return { ok: false, motivo: "invalido" };
  if (fila.expiraAt <= ahora) return { ok: false, motivo: "vencido", plazoDias: normalizarPlazoDias(fila.tenant.plazoJustificacionDias) };
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
  // Una sola solicitud por fecha (specs/37): si otra falta del mismo día ya tiene una justificación pendiente o
  // aceptada, esa cubre también esta (falta del día y faltas a clase de varios cursos).
  const falta = await tdb.asistencia.findFirst({ where: { id: datos.asistenciaId }, select: { alumnoId: true, fecha: true } });
  if (!falta) return { ok: false, error: "No encontramos esa falta." };
  const vigente = await tdb.justificacion.count({
    where: { estado: { in: ["pendiente", "aceptada"] }, asistencia: { alumnoId: falta.alumnoId, fecha: falta.fecha } },
  });
  if (vigente > 0) return { ok: false, error: "Esta fecha ya tiene una justificación." };
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
  if (!consulta.ok) return { ok: false, error: consulta.motivo === "vencido" ? mensajePlazoVencido(consulta.plazoDias) : MENSAJE_TOKEN_INVALIDO };
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

/**
 * Falta del hijo que el apoderado con sesión puede justificar, o 404/403. `disponible`: es falta sin justificación
 * vigente para esa fecha; `plazoVencido`: pasaron los días calendario del plazo desde la falta (specs/07, specs/37).
 */
export async function faltaParaJustificar(ctx: TenantContext, asistenciaId: string, ahora = new Date()) {
  requireFeature(ctx, "justificaciones");
  if (ctx.rol !== "apoderado") forbidden();
  const asistencia = await ctx.db.asistencia.findUnique({
    where: { id: asistenciaId },
    select: {
      id: true, alumnoId: true, fecha: true, estado: true, alumno: { select: { nombres: true } },
    },
  });
  if (!asistencia) notFound();
  await requireAlumnoVisible(ctx, asistencia.alumnoId);
  // La justificación vale por fecha: cualquier falta del mismo día con una pendiente o aceptada la cubre (specs/37).
  const vigente = await ctx.db.justificacion.count({
    where: { estado: { in: ["pendiente", "aceptada"] }, asistencia: { alumnoId: asistencia.alumnoId, fecha: asistencia.fecha } },
  });
  const disponible = asistencia.estado === "falta" && vigente === 0;
  const fecha = isoDeFechaDb(asistencia.fecha);
  const dias = ctx.tenant.plazoJustificacionDias;
  const vence = expiracionJustificacion(fecha, dias, ctx.tenant.zonaHoraria);
  return {
    id: asistencia.id, alumno: primerNombre(asistencia.alumno.nombres), fecha, disponible,
    plazoVencido: vence <= ahora,
    venceAt: vence,
    /** «Puedes justificar hasta el vie 14 nov» */
    textoPlazo: textoPlazoJustificacion(fecha, dias),
    mensajeVencido: mensajePlazoVencido(dias),
  };
}

/** Justificación desde /asistencia con sesión. Invalida los enlaces pendientes de esa falta. */
export async function justificarConSesion(
  ctx: TenantContext,
  asistenciaId: string,
  entrada: { motivo: unknown; archivo: Buffer | null },
  ahora = new Date(),
): Promise<ResultadoJustificar> {
  const falta = await faltaParaJustificar(ctx, asistenciaId, ahora);
  if (!falta.disponible) return { ok: false, error: "Esta falta ya tiene una justificación." };
  if (falta.plazoVencido) return { ok: false, error: falta.mensajeVencido };
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
  revisadoAt: Date | null;
  /** Comentario de quien revisó (visible para la familia). */
  comentarioRevision: string | null;
};

const SELECT_VISTA = {
  id: true, motivo: true, estado: true, createdAt: true, adjunto: true, comentarioRevision: true, revisadoAt: true,
  apoderado: { select: { user: { select: { nombres: true, apellidos: true } } } },
  revisadoPor: { select: { user: { select: { nombres: true, apellidos: true } } } },
  asistencia: { select: { fecha: true, alumno: { select: { nombres: true, apellidos: true, salon: { select: { nombre: true } } } } } },
} as const;

type FilaVista = Awaited<ReturnType<typeof filasVista>>[number];
const filasVista = (ctx: TenantContext, args: { where: object; orderBy: object[]; take: number; skip?: number }) =>
  ctx.db.justificacion.findMany({ ...args, select: SELECT_VISTA });

async function aVista(f: FilaVista): Promise<JustificacionVista> {
  return {
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
    revisadoAt: f.revisadoAt,
    comentarioRevision: f.comentarioRevision,
  };
}

/** Dirección: todas; tutor: las de su salón; apoderado: las suyas. */
export async function listarJustificaciones(ctx: TenantContext): Promise<JustificacionVista[]> {
  requireFeature(ctx, "justificaciones");
  const filas = await filasVista(ctx, { where: filtroPorRol(ctx), orderBy: [{ estado: "asc" }, { createdAt: "desc" }], take: 200 });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "justificacion", detalle: { cantidad: filas.length } });
  return Promise.all(filas.map(aVista));
}

function requireRevisor(ctx: TenantContext) {
  requireFeature(ctx, "justificaciones");
  if (ctx.rol !== "direccion" && ctx.rol !== "profesor") forbidden();
}

/** Vista «Por revisar» (tutor/dirección): solo pendientes, la más antigua primero (orden de llegada). */
export async function pendientesPorRevisar(ctx: TenantContext): Promise<JustificacionVista[]> {
  requireRevisor(ctx);
  const filas = await filasVista(ctx, { where: { ...filtroPorRol(ctx), estado: "pendiente" }, orderBy: [{ createdAt: "asc" }], take: 200 });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "justificacion", detalle: { vista: "por_revisar", cantidad: filas.length } });
  return Promise.all(filas.map(aVista));
}

/** Cuántas pendientes ve el rol (contador de la pestaña «Por revisar»). */
export async function contarPendientes(ctx: TenantContext): Promise<number> {
  requireRevisor(ctx);
  return ctx.db.justificacion.count({ where: { ...filtroPorRol(ctx), estado: "pendiente" } });
}

/** Salones para el filtro del historial: dirección, todos; el tutor, los suyos. */
export async function salonesDeJustificaciones(ctx: TenantContext): Promise<{ id: string; nombre: string }[]> {
  requireRevisor(ctx);
  return ctx.db.salon.findMany({
    where: ctx.rol === "direccion" ? {} : { tutorId: ctx.membership.id },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
}

export const POR_PAGINA_HISTORIAL = 25;

const fechaFiltro = z.string().refine((v) => esFechaReal(v), "Fecha no válida.");
export const filtrosHistorialSchema = z
  .object({
    estado: z.enum(["pendiente", "aceptada", "rechazada"]).optional(),
    salonId: z.uuid().optional(),
    q: z.string().trim().max(80).optional(),
    desde: fechaFiltro.optional(),
    hasta: fechaFiltro.optional(),
    pagina: z.coerce.number().int().min(1).max(10_000).default(1),
  })
  .refine((f) => !f.desde || !f.hasta || f.desde <= f.hasta, { message: "La fecha «desde» no puede ser posterior a «hasta».", path: ["hasta"] });
export type FiltrosHistorial = z.infer<typeof filtrosHistorialSchema>;

export type HistorialJustificaciones = { filas: JustificacionVista[]; total: number; pagina: number; paginas: number };

/**
 * Historial (tutor/dirección): todas las justificaciones de su alcance con filtros por estado, salón, alumno (nombre
 * o apellido) y fecha de la falta; las pendientes primero y luego las más recientes, de 25 en 25.
 */
export async function historialJustificaciones(ctx: TenantContext, entrada: unknown): Promise<HistorialJustificaciones> {
  requireRevisor(ctx);
  const f = filtrosHistorialSchema.parse(entrada);
  const palabras = (f.q ?? "").split(/\s+/).filter(Boolean).slice(0, 4);
  const alumno = {
    ...(f.salonId ? { salonId: f.salonId } : {}),
    ...(palabras.length
      ? { AND: palabras.map((p) => ({ OR: [{ nombres: { contains: p, mode: "insensitive" as const } }, { apellidos: { contains: p, mode: "insensitive" as const } }] })) }
      : {}),
  };
  const fecha = f.desde || f.hasta ? { ...(f.desde ? { gte: fechaDb(f.desde) } : {}), ...(f.hasta ? { lte: fechaDb(f.hasta) } : {}) } : undefined;
  const where = {
    AND: [
      filtroPorRol(ctx),
      { ...(f.estado ? { estado: f.estado } : {}), asistencia: { ...(fecha ? { fecha } : {}), alumno } },
    ],
  };
  const total = await ctx.db.justificacion.count({ where });
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA_HISTORIAL));
  const pagina = Math.min(f.pagina, paginas);
  const filas = await filasVista(ctx, {
    where, orderBy: [{ estado: "asc" }, { createdAt: "desc" }, { id: "asc" }], take: POR_PAGINA_HISTORIAL, skip: (pagina - 1) * POR_PAGINA_HISTORIAL,
  });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "justificacion",
    detalle: { vista: "historial", cantidad: filas.length, ...(f.estado ? { estado: f.estado } : {}), ...(f.salonId ? { salonId: f.salonId } : {}) },
  });
  return { filas: await Promise.all(filas.map(aVista)), total, pagina, paginas };
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
  // Aprobada: vincula los NSP de esa fecha y avisa a los profesores de esas actividades (no cambia notas).
  // Rechazada: si el plazo ya venció, se aplica de inmediato la consecuencia configurada (specs/37).
  if (datos.decision === "aceptada") await alAprobarJustificacion(ctx.db, ctx.tenant, j.id);
  else await aplicarVencimientos(ctx.db, ctx.tenant, { alumnoId: j.asistencia.alumnoId });
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
