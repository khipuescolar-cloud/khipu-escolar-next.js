import "server-only";
import { readFile } from "node:fs/promises";
import type { Archivo } from "@/generated/prisma/client";
import type { DbTenant } from "../db";
import { CloudinaryStorage } from "./cloudinary";
import { leerArchivoLocal, LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { ArchivoSubido, FileStorage, OpcionesSubida } from "./tipos";
import { MENSAJE_VALIDACION, validarArchivo } from "./validacion";
import { reservarPorTenant, liberarReservaPorTenant, confirmarUsoPorTenant } from "../almacenamiento/cuotas";
import { registrarMetrica } from "../almacenamiento/metricas";
import type { CategoriaArchivo } from "@/generated/prisma/client";

export type { FileStorage } from "./tipos";

/** URLs firmadas de archivos privados: 5 minutos. */
export const SEGUNDOS_URL_TEMPORAL = 5 * 60;

const instancias = new Map<string, FileStorage>();

/** Proveedor concreto (para leer o migrar archivos que viven en otro proveedor que el activo). */
export function storageDe(proveedor: string): FileStorage {
  const existente = instancias.get(proveedor);
  if (existente) return existente;
  let nuevo: FileStorage;
  if (proveedor === "cloudinary") nuevo = new CloudinaryStorage();
  else if (proveedor === "local") nuevo = new LocalStorage();
  else if (proveedor === "s3") nuevo = new S3Storage();
  else throw new Error(`STORAGE_PROVIDER no soportado: ${proveedor}`);
  instancias.set(proveedor, nuevo);
  return nuevo;
}

/** Proveedor según STORAGE_PROVIDER (local por defecto). */
export function storage(): FileStorage {
  return storageDe(process.env.STORAGE_PROVIDER || "local");
}

export type ResultadoGuardar = { ok: true; archivo: Archivo } | { ok: false; error: string };

/**
 * Valida (5 MB, magic bytes), sube y registra el archivo en `archivos`.
 * `tdb` debe ser un cliente con aislamiento del colegio (dbTenant).
 */
export async function guardarArchivo(
  tdb: DbTenant,
  buffer: Buffer,
  opciones: { tenantId: string; carpeta: string; privado?: boolean; subidoPorId?: string | null },
): Promise<ResultadoGuardar> {
  const validacion = validarArchivo(buffer);
  if (!validacion.ok) return { ok: false, error: MENSAJE_VALIDACION[validacion.error] };
  const privado = opciones.privado ?? true;
  const categoria: CategoriaArchivo = opciones.carpeta === "logo" ? "logo" : opciones.carpeta === "fotos" ? "foto" : opciones.carpeta === "justificaciones" ? "justificacion" : "otro";
  if (!(await reservarPorTenant(opciones.tenantId, buffer.length))) return { ok: false, error: "El colegio alcanzó su espacio. Avisa a dirección." };
  const proveedor = storage();
  let subido: ArchivoSubido | undefined;
  let reservaVigente = true;
  try {
  subido = await proveedor.subir(buffer, {
    tenantId: opciones.tenantId,
    carpeta: opciones.carpeta,
    privado,
    mimeType: validacion.mimeType,
  });
  const archivo = await tdb.archivo.create({
    data: {
      tenantId: opciones.tenantId,
      proveedor: subido.proveedor,
      publicId: subido.publicId,
      url: subido.url,
      mimeType: validacion.mimeType,
      bytes: buffer.length,
      privado,
      subidoPorId: opciones.subidoPorId ?? null,
      categoria,
    },
  });
  await confirmarUsoPorTenant(opciones.tenantId, categoria, BigInt(buffer.length), BigInt(buffer.length));
  reservaVigente = false;
  await registrarMetrica(opciones.tenantId, categoria, "subidas", buffer.length);
  return { ok: true, archivo };
  } catch (error) {
    if (reservaVigente) await liberarReservaPorTenant(opciones.tenantId, BigInt(buffer.length));
    if (subido) await proveedor.borrar({ id: "", tenantId: opciones.tenantId, publicId: subido.publicId, mimeType: validacion.mimeType, privado, url: subido.url });
    throw error;
  }
}

/** Sube un archivo en disco: en flujo si el proveedor lo permite; si no, lo lee entero y usa `subir`. */
export async function subirArchivoDesdeRuta(ruta: string, opciones: OpcionesSubida): Promise<ArchivoSubido> {
  const proveedor = storage();
  if (proveedor.subirDesdeRuta) return proveedor.subirDesdeRuta(ruta, opciones);
  return proveedor.subir(await readFile(ruta), opciones);
}

/** URL temporal (5 min) de un archivo registrado. */
export async function urlArchivo(archivo: Archivo): Promise<string> {
  return storage().urlTemporal(archivo, SEGUNDOS_URL_TEMPORAL);
}

/** Contenido de un archivo registrado (para exportar o migrar). Lanza si el proveedor no lo entrega. */
export async function leerArchivo(archivo: Archivo): Promise<Buffer> {
  if (archivo.proveedor === "local") return leerArchivoLocal(archivo.publicId);
  const res = await fetch(await storageDe(archivo.proveedor).urlTemporal(archivo, SEGUNDOS_URL_TEMPORAL));
  if (!res.ok) throw new Error(`El proveedor respondió ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Borra el archivo del proveedor (no toca la fila en `archivos`). */
export async function borrarArchivoDelProveedor(archivo: Archivo): Promise<void> {
  return storageDe(archivo.proveedor).borrar(archivo);
}
