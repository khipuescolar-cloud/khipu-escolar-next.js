import "server-only";
import { open, mkdtemp, readFile, rm, stat, type FileHandle } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { strToU8, Zip, ZipDeflate, ZipPassThrough } from "fflate";
import { forbidden } from "next/navigation";
import { Prisma, type Archivo, type ExportacionColegio, type Membership } from "@/generated/prisma/client";
import { auditar } from "./auditoria";
import { db, dbTenant, MODELOS_GLOBALES } from "./db";
import { borrarArchivoDelProveedor, leerArchivo, storage, subirArchivoDesdeRuta } from "./storage";
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
  const perfiles = await db.profile.findMany({ where: { id: { in: userIds } }, select: CAMPOS_PERFIL });
  return { perfiles, ...tablas };
}

const CAMPOS_PERFIL = { id: true, email: true, nombres: true, apellidos: true, telefono: true } as const;

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
  const tablas = await recolectar(ctx);
  await auditarExportacion(ctx);
  return { ...cabecera(ctx), ...tablas } as ReturnType<typeof cabecera> & { perfiles: unknown[] } & Record<string, unknown[]>;
}

/** Nombre sin caracteres raros para guardar un archivo dentro del ZIP. */
const extension = (mime: string) => ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" })[mime] ?? "bin";

/** Filas por consulta al exportar: acota la memoria pico sin importar el tamaño del colegio. */
export const LOTE_FILAS_EXPORTACION = 500;

/** Recorre una tabla del colegio por lotes (cursor por `id`; todos los modelos lo tienen). */
export async function* filasPorLotes(ctx: TenantContext, nombre: string, tamano = LOTE_FILAS_EXPORTACION): AsyncGenerator<unknown[]> {
  type Delegado = { findMany: (args: object) => Promise<{ id: unknown }[]> };
  const delegadoDb = (ctx.db as unknown as Record<string, Delegado>)[nombre];
  let cursor: unknown;
  for (;;) {
    const lote = await delegadoDb.findMany({
      take: tamano,
      orderBy: { id: "asc" },
      ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
    });
    if (lote.length === 0) return;
    yield lote;
    if (lote.length < tamano) return;
    cursor = lote[lote.length - 1].id;
  }
}

/** Escribe un arreglo JSON con el mismo formato que `aJson(filas)` (sangría de 2), fila por fila. */
async function* jsonArreglo(lotes: AsyncIterable<unknown[]>): AsyncGenerator<string> {
  let primero = true;
  for await (const lote of lotes) {
    for (const fila of lote) {
      yield (primero ? "[\n" : ",\n") + "  " + aJson(fila).replace(/\n/g, "\n  ");
      primero = false;
    }
  }
  yield primero ? "[]" : "\n]";
}

/** ZIP en flujo hacia un archivo en disco: cada entrada se comprime y se escribe sin acumular el ZIP en memoria. */
class EscritorZip {
  private cola: Promise<void> = Promise.resolve();
  private error: unknown;
  private readonly zip: Zip;

  constructor(private readonly destino: FileHandle) {
    this.zip = new Zip((err, chunk) => {
      if (err) {
        this.error ??= err;
        return;
      }
      this.cola = this.cola.then(() => this.destino.write(chunk)).then(() => undefined, (e) => { this.error ??= e; });
    });
  }

  /** Espera a que lo producido hasta ahora esté en disco (da contrapresión). */
  async vaciar(): Promise<void> {
    await this.cola;
    if (this.error) throw this.error;
  }

  async json(nombre: string, trozos: AsyncIterable<string>): Promise<void> {
    const f = new ZipDeflate(nombre, { level: 6 });
    this.zip.add(f);
    for await (const t of trozos) {
      f.push(strToU8(t));
      await this.vaciar();
    }
    f.push(new Uint8Array(0), true);
    await this.vaciar();
  }

  async texto(nombre: string, contenido: string): Promise<void> {
    await this.json(nombre, (async function* () { yield contenido; })());
  }

  /** Sin compresión (fotos y PDF ya vienen comprimidos). */
  async binario(nombre: string, datos: Uint8Array): Promise<void> {
    const f = new ZipPassThrough(nombre);
    this.zip.add(f);
    f.push(datos, true);
    await this.vaciar();
  }

  async terminar(): Promise<void> {
    this.zip.end();
    await this.vaciar();
  }
}

type ResultadoZip = { ruta: string; bytes: number; incluidos: number; faltantes: number; tablas: number; limpiar: () => Promise<void> };

/**
 * Arma el ZIP en flujo en un archivo temporal de `os.tmpdir()` (JSON por tabla leído por lotes, README y los archivos que el
 * proveedor entregue, uno a la vez). Quien llama debe invocar `limpiar()`. Sin control de rol ni auditoría.
 */
async function armarZip(ctx: TenantContext): Promise<ResultadoZip> {
  const dir = await mkdtemp(path.join(tmpdir(), "khipu-export-"));
  const ruta = path.join(dir, "exportacion.zip");
  const limpiar = () => rm(dir, { recursive: true, force: true });
  let destino: FileHandle | undefined;
  try {
    destino = await open(ruta, "w");
    const zip = new EscritorZip(destino);
    const cab = cabecera(ctx);
    const nombres = tablasExportadas();
    await zip.texto("colegio.json", aJson(cab));

    const userIds = new Set<string>();
    const zipsAnteriores = new Set<string>();
    for (const nombre of nombres) {
      const lotes = filasPorLotes(ctx, nombre);
      const observados = (async function* () {
        for await (const lote of lotes) {
          if (nombre === "membership") for (const m of lote as { userId: string }[]) userIds.add(m.userId);
          if (nombre === "exportacionColegio") for (const e of lote as ExportacionColegio[]) if (e.archivoId) zipsAnteriores.add(e.archivoId);
          yield lote;
        }
      })();
      await zip.json(`tablas/${nombre}.json`, jsonArreglo(observados));
    }
    // «perfiles» (tabla global) por lotes de ids.
    const ids = [...userIds];
    await zip.json("tablas/perfiles.json", jsonArreglo((async function* () {
      for (let i = 0; i < ids.length; i += LOTE_FILAS_EXPORTACION) {
        yield await db.profile.findMany({ where: { id: { in: ids.slice(i, i + LOTE_FILAS_EXPORTACION) } }, select: CAMPOS_PERFIL });
      }
    })()));

    // Los ZIP de exportaciones anteriores no se vuelven a meter dentro del nuevo.
    const faltantes: string[] = [];
    let incluidos = 0;
    for await (const lote of filasPorLotes(ctx, "archivo")) {
      for (const a of lote as Archivo[]) {
        if (zipsAnteriores.has(a.id)) continue;
        try {
          await zip.binario(`archivos/${a.id}.${extension(a.mimeType)}`, new Uint8Array(await leerArchivo(a)));
          incluidos++;
        } catch {
          faltantes.push(a.id);
        }
      }
    }
    await zip.texto("README.txt", readme(ctx, cab.exportadoAt, ["perfiles", ...nombres], incluidos, faltantes));
    await zip.terminar();
    await destino.close();
    destino = undefined;
    return { ruta, bytes: (await stat(ruta)).size, incluidos, faltantes: faltantes.length, tablas: nombres.length + 1, limpiar };
  } catch (e) {
    await destino?.close().catch(() => undefined);
    await limpiar();
    throw e;
  }
}

/**
 * ZIP con un JSON por tabla, un README.txt y los archivos subidos (los que el proveedor entregue), en una sola petición.
 * Solo dirección; queda auditado una vez. La vía normal es la asíncrona (`solicitarExportacion`); esta queda para pruebas y scripts
 * (arma en flujo en disco, pero devuelve el ZIP entero en memoria).
 */
export async function exportarColegioZip(ctx: TenantContext): Promise<Uint8Array> {
  requireRol(ctx, ["direccion"]);
  const { ruta, incluidos, faltantes, tablas, limpiar } = await armarZip(ctx);
  try {
    const zip = new Uint8Array(await readFile(ruta));
    await auditarExportacion(ctx, { tablas, archivos: incluidos, archivosFaltantes: faltantes });
    return zip;
  } finally {
    await limpiar();
  }
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
  if (ctx.soporte) forbidden(); // el ZIP incluye chats y notas: nunca en modo soporte (specs/16)
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
  let armado: ResultadoZip | null = null;
  try {
    const ctx = await contextoDeExportacion(exp.tenantId, exp.solicitadoPorId);
    armado = await armarZip(ctx);
    const { ruta, bytes, incluidos, faltantes, tablas } = armado;
    subido = await subirArchivoDesdeRuta(ruta, { tenantId: exp.tenantId, carpeta: "exportaciones", privado: true, mimeType: "application/zip" });
    const archivo = await db.archivo.create({
      data: { tenantId: exp.tenantId, proveedor: subido.proveedor, publicId: subido.publicId, url: null, mimeType: "application/zip", bytes, privado: true, subidoPorId: exp.solicitadoPorId, nombre: nombreZip(ctx.tenant.slug, new Date()) },
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
  } finally {
    await armado?.limpiar();
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
