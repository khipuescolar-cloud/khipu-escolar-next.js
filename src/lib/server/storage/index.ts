import "server-only";
import type { Archivo } from "@/generated/prisma/client";
import type { DbTenant } from "../db";
import { CloudinaryStorage } from "./cloudinary";
import { LocalStorage } from "./local";
import type { FileStorage } from "./tipos";
import { MENSAJE_VALIDACION, validarArchivo } from "./validacion";

export type { FileStorage } from "./tipos";

/** URLs firmadas de archivos privados: 5 minutos. */
export const SEGUNDOS_URL_TEMPORAL = 5 * 60;

let instancia: FileStorage | null = null;

/** Proveedor según STORAGE_PROVIDER (local por defecto). */
export function storage(): FileStorage {
  if (instancia) return instancia;
  const proveedor = process.env.STORAGE_PROVIDER || "local";
  if (proveedor === "cloudinary") instancia = new CloudinaryStorage();
  else if (proveedor === "local") instancia = new LocalStorage();
  else throw new Error(`STORAGE_PROVIDER no soportado todavía: ${proveedor}`);
  return instancia;
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
