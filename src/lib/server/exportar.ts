import "server-only";
import { strToU8, zipSync } from "fflate";
import { Prisma, type Archivo, type ExportacionColegio, type Membership } from "@/generated/prisma/client";
import { auditar } from "./auditoria";
import { db, dbTenant, MODELOS_GLOBALES } from "./db";
import { borrarArchivoDelProveedor, leerArchivo, storage } from "./storage";
import { requireRol, type TenantContext } from "./tenant";

// Garantía de salida del piloto (specs/15-privacidad-auditoria-exportacion.md): todos los datos del colegio en un ZIP (JSON por tabla + archivos).

/** Convierte BigInt (auditoría) a texto para poder serializar. */
export function aJson(valor: unknown): string {
  return JSON.stringify(valor, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

/** Modelos que no se exportan: guardan solo hashes de secretos (tokens de justificación y carnets QR). */
export const TABLAS_OMITIDAS = ["JustificacionToken", "CarnetQr"] as const;

/** Delegado de Prisma (`alumno`) de un modelo (`Alumno`). */
const delegado = (modelo: string) => modelo.charAt(0).toLowerCase() + modelo.slice(1);

/**
 * Tablas del colegio que se exportan, derivadas de `Prisma.ModelName`: todo modelo que no sea global
 * ni esté en `TABLAS_OMITIDAS`. Un modelo nuevo con `tenantId` entra solo (lo verifica un test).
 */
export function tablasExportadas(): string[] {
  const omitidas = new Set<string>([...MODELOS_GLOBALES, ...TABLAS_OMITIDAS]);
  return Object.values(Prisma.ModelName).filter((m) => !omitidas.has(m)).map(delegado);
}

async function recolectar(ctx: TenantContext) {
  const nombres = tablasExportadas();
  const filas = await Promise.all(
    nombres.map((n) => (ctx.db as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[n].findMany()),
  );
  const tablas = Object.fromEntries(nombres.map((n, i) => [n, filas[i]])) as Record<string, unknown[]>;
  const userIds = [...new Set((tablas.membership as { userId: string }[]).map((m) => m.userId))];
  const perfiles = await db.profile.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, nombres: true, apellidos: true, telefono: true },
  });
  // Los ZIP de exportaciones anteriores no se vuelven a meter dentro del nuevo.
  const zipsAnteriores = new Set((tablas.exportacionColegio as ExportacionColegio[]).map((e) => e.archivoId).filter(Boolean));
  const archivos = (tablas.archivo as Archivo[]).filter((a) => !zipsAnteriores.has(a.id));
  return { tablas: { perfiles, ...tablas }, archivos };
}

function cabecera(ctx: TenantContext) {
  return { exportadoAt: new Date().toISOString(), colegio: { id: ctx.tenant.id, slug: ctx.tenant.slug, nombre: ctx.tenant.nombre, plan: ctx.tenant.plan } };
}

const auditarExportacion = (ctx: TenantContext, detalle?: Prisma.InputJsonValue) =>
  auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "exportar", entidad: "colegio", entidadId: ctx.tenant.id, detalle });

/**
 * Datos completos del colegio como objeto (una clave por tabla). Solo dirección; queda auditado.
 * No incluye secretos: se omiten los hashes de tokens de justificación y de carnets QR.
 */
export async function exportarColegio(ctx: TenantContext) {
  requireRol(ctx, ["direccion"]);
  const { tablas } = await recolectar(ctx);
  await auditarExportacion(ctx);
  return { ...cabecera(ctx), ...tablas } as ReturnType<typeof cabecera> & { perfiles: unknown[] } & Record<string, unknown[]>;
}

/** Nombre sin caracteres raros para guardar un archivo dentro del ZIP. */
const extension = (mime: string) => ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" })[mime] ?? "bin";

/** Arma el ZIP en memoria (JSON por tabla, README y los archivos que el proveedor entregue). Sin control de rol ni auditoría. */
async function armarZip(ctx: TenantContext): Promise<{ zip: Uint8Array; incluidos: number; faltantes: number; tablas: number }> {
  const { tablas, archivos } = await recolectar(ctx);
  const cab = cabecera(ctx);
  const entradas: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {};
  entradas["colegio.json"] = strToU8(aJson(cab));
  for (const [nombre, filas] of Object.entries(tablas)) entradas[`tablas/${nombre}.json`] = strToU8(aJson(filas));

  const faltantes: string[] = [];
  let incluidos = 0;
  for (const a of archivos) {
    try {
      entradas[`archivos/${a.id}.${extension(a.mimeType)}`] = [new Uint8Array(await leerArchivo(a)), { level: 0 }];
      incluidos++;
    } catch {
      faltantes.push(a.id);
    }
  }
  entradas["README.txt"] = strToU8(readme(ctx, cab.exportadoAt, Object.keys(tablas), incluidos, faltantes));
  return { zip: zipSync(entradas), incluidos, faltantes: faltantes.length, tablas: Object.keys(tablas).length };
}

/**
 * ZIP con un JSON por tabla, un README.txt y los archivos subidos (los que el proveedor entregue), en una sola petición.
 * Solo dirección; queda auditado una vez. La vía normal es la asíncrona (`solicitarExportacion`); esta queda para pruebas y scripts.
 */
export async function exportarColegioZip(ctx: TenantContext): Promise<Uint8Array> {
  requireRol(ctx, ["direccion"]);
  const { zip, incluidos, faltantes, tablas } = await armarZip(ctx);
  await auditarExportacion(ctx, { tablas, archivos: incluidos, archivosFaltantes: faltantes });
  return zip;
}

// ───────────── Exportación asíncrona (cola `exportaciones_colegio`) ─────────────

/** El ZIP listo se puede descargar este número de días; luego el cron lo borra. */
export const EXPORTACION_VENCE_DIAS = 7;
export const MAX_INTENTOS_EXPORTACION = 3;
/** Una exportación en `procesando` más de este tiempo se considera colgada (el worker se cayó). */
export const PROCESANDO_MAX_MINUTOS = 15;
/** Cuántas exportaciones toma cada corrida del cron. */
const LOTE_EXPORTACIONES = 3;

/**
 * Pide la exportación de un colegio. Si ya hay una `pendiente` o `procesando` devuelve esa (sin duplicar).
 * El control de rol lo hace quien llama (dirección del colegio o super administrador de plataforma).
 */
export async function solicitarExportacion(tenantId: string, solicitadoPorId: string): Promise<ExportacionColegio> {
  const existente = await db.exportacionColegio.findFirst({
    where: { tenantId, estado: { in: ["pendiente", "procesando"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existente) return existente;
  return db.exportacionColegio.create({ data: { tenantId, solicitadoPorId } });
}

/** Solicitud desde el colegio: solo dirección. */
export async function solicitarExportacionDireccion(ctx: TenantContext): Promise<ExportacionColegio> {
  requireRol(ctx, ["direccion"]);
  return solicitarExportacion(ctx.tenant.id, ctx.user.id);
}

export type VistaExportacion = {
  id: string;
  createdAt: Date;
  terminadoAt: Date | null;
  /** `vencida` = estaba `lista` pero el cron ya borró el archivo (a los 7 días). */
  estado: "pendiente" | "procesando" | "lista" | "vencida" | "error";
  descargable: boolean;
  bytes: number | null;
  venceAt: Date | null;
  error: string | null;
};

/** Últimas exportaciones del colegio, más recientes primero. */
export async function listarExportaciones(tenantId: string, limite = 20): Promise<VistaExportacion[]> {
  const filas = await db.exportacionColegio.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: limite,
    include: { archivo: { select: { bytes: true } } },
  });
  return filas.map((f) => {
    const descargable = f.estado === "lista" && !!f.archivoId;
    return {
      id: f.id,
      createdAt: f.createdAt,
      terminadoAt: f.terminadoAt,
      estado: f.estado === "lista" && !f.archivoId ? "vencida" : f.estado,
      descargable,
      bytes: f.archivo?.bytes ?? null,
      venceAt: descargable && f.terminadoAt ? new Date(f.terminadoAt.getTime() + EXPORTACION_VENCE_DIAS * 86_400_000) : null,
      error: f.estado === "error" ? f.error : null,
    };
  });
}

/** Exportación lista y con archivo del colegio, o `null`. Los ids del cliente siempre se vuelven a consultar con el tenant. */
export async function exportacionDescargable(tenantId: string, id: string): Promise<{ exportacion: ExportacionColegio; archivo: Archivo } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const exportacion = await db.exportacionColegio.findFirst({ where: { id, tenantId, estado: "lista", archivoId: { not: null } }, include: { archivo: true } });
  if (!exportacion?.archivo) return null;
  const { archivo, ...resto } = exportacion;
  return { exportacion: resto, archivo };
}

/** Respuesta HTTP de descarga: local se sirve desde el servidor; S3/Cloudinary redirigen a una URL firmada que vence en minutos. */
export async function respuestaDescarga(archivo: Archivo, nombre: string): Promise<Response> {
  if (archivo.proveedor !== "local") {
    return Response.redirect(await storage().urlTemporal(archivo, 5 * 60), 302);
  }
  const contenido = await leerArchivo(archivo);
  return new Response(new Uint8Array(contenido), {
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${nombre}"`, "cache-control": "no-store" },
  });
}

export const nombreZip = (slug: string, fecha: Date) => `${slug}-datos-${fecha.toISOString().slice(0, 10)}.zip`;

/** Auditoría de una descarga hecha por dirección. */
export const auditarDescargaExportacion = (ctx: TenantContext, exportacionId: string) =>
  auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "exportar", entidad: "exportacion", entidadId: exportacionId, detalle: { descarga: true } });

export type ResumenExportaciones = { recuperadas: number; procesadas: number; listas: number; conError: number; caducadas: number };

/** `procesando` colgadas: vuelven a `pendiente` (cuenta el intento) o pasan a `error` si ya no quedan reintentos. */
async function recuperarColgadas(ahora: Date, tenantId?: string): Promise<number> {
  const limite = new Date(ahora.getTime() - PROCESANDO_MAX_MINUTOS * 60_000);
  // Mientras está en `procesando`, `terminadoAt` guarda la hora de reserva.
  const where = { estado: "procesando" as const, terminadoAt: { lt: limite }, ...(tenantId ? { tenantId } : {}) };
  const error = "El proceso se interrumpió antes de terminar";
  const agotadas = await db.exportacionColegio.updateMany({ where: { ...where, intentos: { gte: MAX_INTENTOS_EXPORTACION } }, data: { estado: "error", error, terminadoAt: ahora } });
  const devueltas = await db.exportacionColegio.updateMany({ where, data: { estado: "pendiente", error, terminadoAt: null } });
  return agotadas.count + devueltas.count;
}

/** Reserva atómica: solo un worker gana la fila (`pendiente` → `procesando`). */
async function reservar(id: string, ahora: Date): Promise<ExportacionColegio | null> {
  const r = await db.exportacionColegio.updateMany({
    where: { id, estado: "pendiente" },
    data: { estado: "procesando", intentos: { increment: 1 }, terminadoAt: ahora, error: null },
  });
  return r.count === 1 ? db.exportacionColegio.findUnique({ where: { id } }) : null;
}

async function contextoDeExportacion(tenantId: string, userId: string): Promise<TenantContext> {
  const [tenant, user] = await Promise.all([db.tenant.findUnique({ where: { id: tenantId } }), db.profile.findUnique({ where: { id: userId } })]);
  if (!tenant) throw new Error("El colegio ya no existe");
  if (!user) throw new Error("Quien pidió la exportación ya no existe");
  const membership: Membership = {
    id: "00000000-0000-0000-0000-000000000000",
    tenantId,
    userId,
    rol: "direccion",
    estado: "activa",
    cargo: "Exportación",
    createdAt: new Date(),
  };
  return { tenant, user, membership, rol: "direccion", roles: ["direccion"], db: dbTenant(tenantId) };
}

async function procesarUna(exp: ExportacionColegio): Promise<boolean> {
  let subido: { proveedor: "local" | "cloudinary" | "s3"; publicId: string; url: string | null } | null = null;
  try {
    const ctx = await contextoDeExportacion(exp.tenantId, exp.solicitadoPorId);
    const { zip, incluidos, faltantes, tablas } = await armarZip(ctx);
    subido = await storage().subir(Buffer.from(zip), { tenantId: exp.tenantId, carpeta: "exportaciones", privado: true, mimeType: "application/zip" });
    const archivo = await db.archivo.create({
      data: { tenantId: exp.tenantId, proveedor: subido.proveedor, publicId: subido.publicId, url: null, mimeType: "application/zip", bytes: zip.length, privado: true, subidoPorId: exp.solicitadoPorId, nombre: nombreZip(ctx.tenant.slug, new Date()) },
    });
    await db.exportacionColegio.update({ where: { id: exp.id }, data: { estado: "lista", archivoId: archivo.id, terminadoAt: new Date(), error: null } });
    await auditarExportacion(ctx, { tablas, archivos: incluidos, archivosFaltantes: faltantes, exportacionId: exp.id });
    return true;
  } catch (e) {
    if (subido) await storage().borrar({ id: "", tenantId: exp.tenantId, publicId: subido.publicId, mimeType: "application/zip", privado: true, url: null }).catch(() => undefined);
    const mensaje = (e instanceof Error ? e.message : "Error desconocido").slice(0, 500);
    const sinReintentos = exp.intentos >= MAX_INTENTOS_EXPORTACION;
    await db.exportacionColegio.update({
      where: { id: exp.id },
      data: { estado: sinReintentos ? "error" : "pendiente", error: mensaje, terminadoAt: sinReintentos ? new Date() : null },
    });
    console.error("[exportaciones] falló", exp.id, mensaje);
    return false;
  }
}

/** Borra el ZIP de las exportaciones listas hace más de `EXPORTACION_VENCE_DIAS` días. La fila queda como `vencida`. */
export async function caducarExportaciones(ahora = new Date(), tenantId?: string): Promise<number> {
  const limite = new Date(ahora.getTime() - EXPORTACION_VENCE_DIAS * 86_400_000);
  const vencidas = await db.exportacionColegio.findMany({
    where: { estado: "lista", archivoId: { not: null }, terminadoAt: { lt: limite }, ...(tenantId ? { tenantId } : {}) },
    include: { archivo: true },
    take: 50,
  });
  let n = 0;
  for (const e of vencidas) {
    if (!e.archivo) continue;
    try {
      await borrarArchivoDelProveedor(e.archivo);
      await db.archivo.delete({ where: { id: e.archivo.id } }); // la FK deja `archivoId` en null
      n++;
    } catch (error) {
      console.error("[exportaciones] no se pudo caducar", e.id, error);
    }
  }
  return n;
}

/**
 * Worker de exportaciones (cron cada pocos minutos): recupera las colgadas, reserva hasta 3 pendientes de forma atómica,
 * arma el ZIP, lo guarda como archivo privado y la marca `lista`. Máximo 3 intentos por exportación. También caduca las viejas.
 */
export async function procesarExportaciones(ahora = new Date(), { tenantId }: { tenantId?: string } = {}): Promise<ResumenExportaciones> {
  const recuperadas = await recuperarColgadas(ahora, tenantId);
  const pendientes = await db.exportacionColegio.findMany({ where: { estado: "pendiente", ...(tenantId ? { tenantId } : {}) }, orderBy: { createdAt: "asc" }, take: LOTE_EXPORTACIONES });
  let listas = 0;
  let conError = 0;
  for (const p of pendientes) {
    const reservada = await reservar(p.id, ahora);
    if (!reservada) continue;
    if (await procesarUna(reservada)) listas++;
    else conError++;
  }
  const caducadas = await caducarExportaciones(ahora, tenantId);
  return { recuperadas, procesadas: listas + conError, listas, conError, caducadas };
}

function readme(ctx: TenantContext, fecha: string, tablas: string[], incluidos: number, faltantes: string[]): string {
  return [
    `Khipu Escolar · Exportación de datos de «${ctx.tenant.nombre}» (${ctx.tenant.slug})`,
    `Generada el ${fecha} por dirección.`,
    "",
    "Contenido",
    "- colegio.json: datos básicos del colegio y fecha de exportación.",
    `- tablas/<nombre>.json: un archivo por tabla (${tablas.length}): ${tablas.join(", ")}.`,
    "  «perfiles» son los datos de contacto de los miembros del colegio. Cada fila trae su propio id y tenantId.",
    `- archivos/<id>.<ext>: archivos subidos (fotos, adjuntos, logo). Incluidos: ${incluidos}. El id coincide con tablas/archivo.json.`,
    faltantes.length ? `  No se pudieron incluir ${faltantes.length}: ${faltantes.join(", ")}.` : "",
    "",
    "Notas",
    "- Fechas en formato ISO 8601 (UTC). Los números grandes (auditoría) van como texto.",
    `- Por seguridad no se exportan los hashes de tokens de justificación ni de carnets QR (${TABLAS_OMITIDAS.join(", ")}).`,
    "- Este paquete contiene datos personales de menores y familias: guárdalo con cuidado (Ley 29733).",
    "",
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\r\n");
}

/** Vista de la bitácora para `/configuracion/auditoria` (más recientes primero). */
export async function listarAuditoria(ctx: TenantContext, filtro: { accion?: string; entidad?: string } = {}) {
  requireRol(ctx, ["direccion"]);
  const filas = await ctx.db.auditoria.findMany({
    where: { ...(filtro.accion ? { accion: filtro.accion } : {}), ...(filtro.entidad ? { entidad: filtro.entidad } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const actores = await db.profile.findMany({
    where: { id: { in: [...new Set(filas.map((f) => f.actorId).filter((x): x is string => !!x))] } },
    select: { id: true, nombres: true, apellidos: true },
  });
  const nombre = new Map(actores.map((a) => [a.id, `${a.nombres} ${a.apellidos}`.trim()]));
  return filas.map((f) => ({ ...f, id: f.id.toString(), actor: f.actorId ? (nombre.get(f.actorId) ?? "Usuario eliminado") : "Sistema" }));
}
