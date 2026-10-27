import "server-only";
import type { Archivo } from "@/generated/prisma/client";
import type { DbTenant } from "../db";
import { CloudinaryStorage } from "./cloudinary";
import { leerArchivoLocal, LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { FileStorage } from "./tipos";
import { MENSAJE_VALIDACION, validarArchivo } from "./validacion";

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
  const proveedor = storage();
  const subido = await proveedor.subir(buffer, {
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
    },
  });
  return { ok: true, archivo };
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
