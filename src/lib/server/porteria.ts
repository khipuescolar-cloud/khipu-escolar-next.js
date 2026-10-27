import "server-only";
import { forbidden, notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { z } from "zod";
import type { EstadoAsistencia } from "@/generated/prisma/enums";
import { urlColegio, urlRaiz } from "@/lib/dominio";
import { esHoraIgualOPosterior, fechaDb, hora12 } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import { instanteDeRegistro } from "@/lib/registro-offline";
import { tokenDesdeQr } from "@/lib/token-qr";
import { hoyDelColegio, AMBITO_DIA } from "./asistencia";
import { auditar } from "./auditoria";
import { encolarAvisosAsistencia } from "./notificaciones/encolar";
import { requireFeature } from "./plan";
import { urlArchivo } from "./storage";
import type { TenantContext } from "./tenant";
import { hashToken, tokenDerivado } from "./tokens";

// Portería con carnet QR (specs/05-porteria-qr.md).
// El QR lleva <raíz>/q/<token>. El token = HMAC(APP_SECRET, "carnet:<id>") y en carnets_qr solo va su hash:
// así el carnet se puede reimprimir sin guardar el token. Regenerar = nueva fila (nuevo token); revocar = activo=false.

/** Estado de llegada según la hora límite del colegio (por defecto, tarde desde las 08:00). */
export function estadoDeLlegada(hora: string, horaLimiteTardanza: string): "llego" | "tarde" {
  return esHoraIgualOPosterior(hora, horaLimiteTardanza) ? "tarde" : "llego";
}

export { tokenDesdeQr };

export function urlDeCarnet(carnetId: string): string {
  return urlRaiz(`/q/${tokenDerivado("carnet", carnetId)}`);
}

function requireDireccion(ctx: TenantContext) {
  requireFeature(ctx, "porteria");
  if (ctx.rol !== "direccion") forbidden();
}

function requirePorteria(ctx: TenantContext) {
  requireFeature(ctx, "porteria");
  if (ctx.rol !== "porteria" && ctx.rol !== "direccion") forbidden();
}

// ───────────── Carnets (dirección) ─────────────

export async function salonesParaCarnets(ctx: TenantContext) {
  requireDireccion(ctx);
  const salones = await ctx.db.salon.findMany({
    orderBy: { nombre: "asc" },
    select: {
      id: true, nombre: true,
      _count: { select: { alumnos: { where: { estado: "activo" } } } },
      alumnos: { where: { estado: "activo", carnets: { some: { activo: true } } }, select: { id: true } },
    },
  });
  return salones.map((s) => ({ id: s.id, nombre: s.nombre, alumnos: s._count.alumnos, conCarnet: s.alumnos.length }));
}

/** Crea carnet activo a los alumnos del salón que no tienen uno. Devuelve cuántos creó. */
export async function generarCarnetsSalon(ctx: TenantContext, salonId: string): Promise<number> {
  requireDireccion(ctx);
  const id = z.uuid().parse(salonId);
  const alumnos = await ctx.db.alumno.findMany({
    where: { salonId: id, estado: "activo", carnets: { none: { activo: true } } },
    select: { id: true },
  });
  for (const a of alumnos) await crearCarnet(ctx, a.id);
  return alumnos.length;
}

async function crearCarnet(ctx: TenantContext, alumnoId: string) {
  const id = randomUUID();
  await ctx.db.carnetQr.create({
    data: { id, tenantId: ctx.tenant.id, alumnoId, tokenHash: hashToken(tokenDerivado("carnet", id)) },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "carnet_qr", entidadId: id, detalle: { alumnoId } });
  return id;
}

async function alumnoDelColegio(ctx: TenantContext, alumnoId: string) {
  const alumno = await ctx.db.alumno.findUnique({ where: { id: z.uuid().parse(alumnoId) }, select: { id: true } });
  if (!alumno) notFound();
  return alumno;
}

/** Revoca los carnets activos del alumno (carnet perdido). */
export async function revocarCarnet(ctx: TenantContext, alumnoId: string): Promise<void> {
  requireDireccion(ctx);
  const alumno = await alumnoDelColegio(ctx, alumnoId);
  await ctx.db.carnetQr.updateMany({ where: { alumnoId: alumno.id, activo: true }, data: { activo: false, revocadoAt: new Date() } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "carnet_qr", detalle: { alumnoId: alumno.id, revocado: true } });
}

/** Revoca el carnet actual y crea uno nuevo (nuevo QR). */
export async function regenerarCarnet(ctx: TenantContext, alumnoId: string): Promise<void> {
  await revocarCarnet(ctx, alumnoId);
  await crearCarnet(ctx, alumnoId);
}

/** Carnets activos de un salón con su QR (data URL) para imprimir. */
export async function carnetsParaImprimir(ctx: TenantContext, salonId: string) {
  requireDireccion(ctx);
  const salon = await ctx.db.salon.findUnique({ where: { id: z.uuid().parse(salonId) }, select: { id: true, nombre: true } });
  if (!salon) notFound();
  const alumnos = await ctx.db.alumno.findMany({
    where: { salonId: salon.id, estado: "activo" },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    select: {
      id: true, nombres: true, apellidos: true, codigo: true,
      carnets: { where: { activo: true }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, createdAt: true } },
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "carnet_qr", detalle: { salonId: salon.id } });
  const carnets = await Promise.all(
    alumnos.map(async (a) => {
      const carnet = a.carnets[0];
      return {
        alumnoId: a.id,
        nombres: a.nombres,
        apellidos: a.apellidos,
        codigo: a.codigo,
        carnetId: carnet?.id ?? null,
        emitido: carnet?.createdAt ?? null,
        qr: carnet ? await QRCode.toDataURL(urlDeCarnet(carnet.id), { errorCorrectionLevel: "M", margin: 1, width: 220 }) : null,
      };
    }),
  );
  return { salon, carnets };
}

// ───────────── Registro en la puerta (portería o dirección) ─────────────

export type ResultadoPorteria =
  | {
      ok: true;
      tipo: "registrado" | "ya-registrado";
      alumno: { id: string; nombre: string; salon: string; fotoUrl: string | null };
      estado: EstadoAsistencia;
      hora: string;
      mensaje: string;
    }
  | { ok: false; mensaje: string };

export const MENSAJE_CARNET_INVALIDO = "Carnet no válido para este colegio";

/** Lee el QR: valida hash activo y mismo colegio; registra la llegada del día sin duplicar. */
export async function registrarLlegadaPorQr(
  ctx: TenantContext, textoLeido: string, ahora = new Date(), leidoAt?: string | null,
): Promise<ResultadoPorteria> {
  requirePorteria(ctx);
  // Lectura hecha sin conexión: se respeta la hora real del escaneo solo si es razonable (specs/05).
  ahora = instanteDeRegistro(leidoAt, ahora);
  const token = tokenDesdeQr(z.string().max(500).parse(textoLeido));
  if (!token) return { ok: false, mensaje: MENSAJE_CARNET_INVALIDO };
  // ctx.db filtra por el colegio del contexto: un carnet de otro colegio no se encuentra.
  const carnet = await ctx.db.carnetQr.findUnique({ where: { tokenHash: hashToken(token) }, select: { alumnoId: true, activo: true } });
  if (!carnet || !carnet.activo) {
    await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "carnet_qr", detalle: { rechazado: true } });
    return { ok: false, mensaje: MENSAJE_CARNET_INVALIDO };
  }
  return registrarLlegada(ctx, carnet.alumnoId, ahora);
}

/** Respaldo manual (sin carnet): mismo registro que el QR. */
export async function registrarLlegadaManual(ctx: TenantContext, alumnoId: string, ahora = new Date()): Promise<ResultadoPorteria> {
  requirePorteria(ctx);
  const alumno = await alumnoDelColegio(ctx, alumnoId);
  return registrarLlegada(ctx, alumno.id, ahora);
}

async function registrarLlegada(ctx: TenantContext, alumnoId: string, ahora: Date): Promise<ResultadoPorteria> {
  const hoy = hoyDelColegio(ctx, ahora);
  const fecha = fechaDb(hoy.isoFecha);
  const alumno = await ctx.db.alumno.findUnique({
    where: { id: alumnoId },
    select: { id: true, nombres: true, apellidos: true, estado: true, fotoArchivoId: true, salon: { select: { nombre: true } } },
  });
  if (!alumno || alumno.estado !== "activo") return { ok: false, mensaje: MENSAJE_CARNET_INVALIDO };
  const foto = alumno.fotoArchivoId ? await ctx.db.archivo.findUnique({ where: { id: alumno.fotoArchivoId } }) : null;
  const datosAlumno = {
    id: alumno.id,
    nombre: `${alumno.nombres} ${alumno.apellidos}`,
    salon: alumno.salon.nombre,
    fotoUrl: foto ? await urlArchivo(foto) : null,
  };

  const anterior = await ctx.db.asistencia.findUnique({
    where: { alumnoId_fecha_ambito: { alumnoId, fecha, ambito: AMBITO_DIA } },
    select: { id: true, estado: true, hora: true },
  });
  // Ya tenía la llegada (o un problema) registrada hoy: no se duplica. Si figuraba «falta», se corrige.
  if (anterior && anterior.estado !== "falta") {
    return { ok: true, tipo: "ya-registrado", alumno: datosAlumno, estado: anterior.estado, hora: anterior.hora, mensaje: `Ya registrado ${hora12(anterior.hora)}` };
  }

  const estado = estadoDeLlegada(hoy.hora, ctx.tenant.horaLimiteTardanza);
  const asistencia = await ctx.db.asistencia.upsert({
    where: { alumnoId_fecha_ambito: { alumnoId, fecha, ambito: AMBITO_DIA } },
    create: {
      tenantId: ctx.tenant.id, alumnoId, cursoId: null, ambito: AMBITO_DIA, fecha, hora: hoy.hora, estado,
      origen: "porteria", registradoPorId: ctx.membership.id,
    },
    update: { estado, hora: hoy.hora, origen: "porteria", registradoPorId: ctx.membership.id, nota: null },
    select: { id: true, alumnoId: true, estado: true, hora: true, nota: true },
  });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: anterior ? "editar" : "crear", entidad: "asistencia", entidadId: asistencia.id,
    detalle: { alumnoId, ambito: AMBITO_DIA, origen: "porteria", antes: anterior?.estado ?? null, ahora: estado },
  });
  await encolarAvisosAsistencia(ctx.db, {
    tenant: ctx.tenant,
    asistencia,
    alumnoNombre: primerNombre(alumno.nombres),
    momento: "a la 1.ª hora",
    urlMensajes: urlColegio(ctx.tenant.slug, "/mensajes"),
  });
  return {
    ok: true, tipo: "registrado", alumno: datosAlumno, estado, hora: hoy.hora,
    mensaje: estado === "tarde" ? `Tarde · ${hora12(hoy.hora)}` : `Llegó · ${hora12(hoy.hora)}`,
  };
}

/** Búsqueda manual por nombre, apellido o código. */
export async function buscarAlumnosPorteria(ctx: TenantContext, texto: string) {
  requirePorteria(ctx);
  const q = z.string().trim().min(2).max(60).safeParse(texto);
  if (!q.success) return [];
  const alumnos = await ctx.db.alumno.findMany({
    where: {
      estado: "activo",
      OR: [
        { nombres: { contains: q.data, mode: "insensitive" } },
        { apellidos: { contains: q.data, mode: "insensitive" } },
        { codigo: { contains: q.data, mode: "insensitive" } },
      ],
    },
    orderBy: [{ apellidos: "asc" }],
    take: 10,
    select: { id: true, nombres: true, apellidos: true, codigo: true, salon: { select: { nombre: true } } },
  });
  return alumnos.map((a) => ({ id: a.id, nombre: `${a.nombres} ${a.apellidos}`, codigo: a.codigo, salon: a.salon.nombre }));
}
