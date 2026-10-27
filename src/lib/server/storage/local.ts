import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { firmar, firmaValida } from "../tokens";
import { EXTENSION, type MimePermitido } from "./validacion";
import type { ArchivoSubido, FileStorage, OpcionesSubida, ReferenciaArchivo } from "./tipos";

// Almacenamiento en disco para desarrollo: carpeta .uploads/ (ignorada por git).
// Se sirve con /archivos/<id> dentro del colegio: exige sesión y una firma con vencimiento.

const RAIZ = path.resolve(process.cwd(), ".uploads");

function rutaSegura(publicId: string): string {
  const ruta = path.resolve(RAIZ, publicId);
  if (!ruta.startsWith(RAIZ + path.sep)) throw new Error("Ruta de archivo no válida");
  return ruta;
}

export function firmaArchivoLocal(id: string, expira: number): string {
  return firmar(`archivo:${id}:${expira}`);
}

export function verificarFirmaArchivoLocal(id: string, expira: number, firma: string, ahora = Date.now()): boolean {
  return Number.isFinite(expira) && expira * 1000 > ahora && firmaValida(`archivo:${id}:${expira}`, firma);
}

export async function leerArchivoLocal(publicId: string): Promise<Buffer> {
  return readFile(rutaSegura(publicId));
}

export class LocalStorage implements FileStorage {
  readonly proveedor = "local" as const;

  async subir(buffer: Buffer, { tenantId, carpeta, mimeType }: OpcionesSubida): Promise<ArchivoSubido> {
    const ext = EXTENSION[mimeType as MimePermitido] ?? "bin";
    const publicId = path.posix.join(tenantId, carpeta, `${randomUUID()}.${ext}`);
    const ruta = rutaSegura(publicId);
    await mkdir(path.dirname(ruta), { recursive: true });
    await writeFile(ruta, buffer);
    return { proveedor: "local", publicId, url: null };
  }

  async urlTemporal(archivo: ReferenciaArchivo, segundos: number): Promise<string> {
    const expira = Math.floor(Date.now() / 1000) + segundos;
    // Ruta relativa al subdominio del colegio (el route handler vuelve a validar sesión y alcance).
    return `/archivos/${archivo.id}?exp=${expira}&sig=${firmaArchivoLocal(archivo.id, expira)}`;
  }

  async borrar(archivo: ReferenciaArchivo): Promise<void> {
    await rm(rutaSegura(archivo.publicId), { force: true });
  }
}
