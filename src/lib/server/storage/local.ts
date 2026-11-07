import "server-only";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile, stat, open } from "node:fs/promises";
import path from "node:path";
import { firmar, firmaValida } from "../tokens";
import { EXTENSION, type MimePermitido } from "./validacion";
import type { ArchivoSubido, FileStorage, OpcionesSubida, ReferenciaArchivo, SubidaPrefirmada } from "./tipos";

// Almacenamiento en disco para desarrollo: carpeta .uploads/ (ignorada por git).
// Se sirve con /archivos/<id> dentro del colegio: exige sesión y una firma con vencimiento.

export const RAIZ_LOCAL = path.resolve(process.cwd(), ".uploads");
const RAIZ = RAIZ_LOCAL;

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

  async prepararSubida({ tenantId, carpeta, bytes, extension, mimeType }: OpcionesSubida & { bytes: number; extension: string }): Promise<SubidaPrefirmada> {
    const publicId = path.posix.join(tenantId, carpeta, `${randomUUID()}.${extension}`);
    const expiraAt = new Date(Date.now() + 600_000);
    const token = Buffer.from(JSON.stringify({ publicId, bytes, mimeType, exp: expiraAt.getTime() })).toString("base64url");
    return { publicId, url: `/api/almacenamiento/local/${token}.${firmar(token)}`, metodo: "PUT", headers: { "Content-Type": mimeType, "Content-Length": String(bytes) }, expiraAt };
  }

  async inspeccionar(publicId: string) {
    try { const info = await stat(rutaSegura(publicId)); return { bytes: info.size, contentType: null }; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  }

  async leerRango(publicId: string, desde: number, hasta: number): Promise<Buffer> {
    const archivo = await open(rutaSegura(publicId), "r");
    try { const buffer = Buffer.alloc(Math.max(0, hasta - desde + 1)); const { bytesRead } = await archivo.read(buffer, 0, buffer.length, desde); return buffer.subarray(0, bytesRead); }
    finally { await archivo.close(); }
  }

  async subir(buffer: Buffer, { tenantId, carpeta, mimeType }: OpcionesSubida): Promise<ArchivoSubido> {
    const ext = EXTENSION[mimeType as MimePermitido] ?? "bin";
    const publicId = path.posix.join(tenantId, carpeta, `${randomUUID()}.${ext}`);
    const ruta = rutaSegura(publicId);
    await mkdir(path.dirname(ruta), { recursive: true });
    await writeFile(ruta, buffer);
    return { proveedor: "local", publicId, url: null };
  }

  async subirDesdeRuta(origen: string, { tenantId, carpeta, mimeType }: OpcionesSubida): Promise<ArchivoSubido> {
    const ext = EXTENSION[mimeType as MimePermitido] ?? "bin";
    const publicId = path.posix.join(tenantId, carpeta, `${randomUUID()}.${ext}`);
    const ruta = rutaSegura(publicId);
    await mkdir(path.dirname(ruta), { recursive: true });
    await copyFile(origen, ruta);
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
