import "server-only";
import { strToU8, zipSync } from "fflate";
import { Prisma, type Archivo } from "@/generated/prisma/client";
import { auditar } from "./auditoria";
import { db, MODELOS_GLOBALES } from "./db";
import { leerArchivo } from "./storage";
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
  return { tablas: { perfiles, ...tablas }, archivos: tablas.archivo as Archivo[] };
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

/**
 * ZIP con un JSON por tabla, un README.txt y los archivos subidos (los que el proveedor entregue).
 * Solo dirección; queda auditado una vez.
 */
export async function exportarColegioZip(ctx: TenantContext): Promise<Uint8Array> {
  requireRol(ctx, ["direccion"]);
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
  await auditarExportacion(ctx, { tablas: Object.keys(tablas).length, archivos: incluidos, archivosFaltantes: faltantes.length });
  return zipSync(entradas);
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
