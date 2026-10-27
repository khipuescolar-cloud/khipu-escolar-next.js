import "server-only";
import { unzipSync } from "fflate";
import type { Archivo } from "@/generated/prisma/client";
import { MAX_ADJUNTOS, MAX_BYTES_ADJUNTO, TIPOS_ADJUNTO_TEXTO, type AdjuntoVista } from "@/lib/adjuntos";
import { ErrorDeNegocio } from "./contexto-accion";
import { storage } from "./storage";
import { detectarMime } from "./storage/validacion";
import type { TenantContext } from "./tenant";

// Adjuntos de comunicados y tareas (specs/09, specs/12, specs/14). Archivos privados en FileStorage,
// enlazados por `Archivo.comunicadoId` / `Archivo.tareaId`. Quién puede descargarlos: archivos.ts.

export const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type MimeAdjunto = "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | typeof MIME_DOCX | typeof MIME_XLSX;

export type EntradaAdjunto = { nombre: string; buffer: Buffer };
export type DestinoAdjunto = { comunicadoId: string } | { tareaId: string };

/** Detecta el tipo real por la firma. Los DOCX y XLSX son ZIP: se distinguen por sus entradas internas. */
export function detectarMimeAdjunto(buffer: Uint8Array): MimeAdjunto | null {
  const base = detectarMime(buffer);
  if (base) return base;
  const esZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  if (!esZip) return null;
  const nombres = new Set<string>();
  try {
    unzipSync(buffer, { filter: (f) => (nombres.add(f.name), false) });
  } catch {
    return null;
  }
  if (nombres.has("word/document.xml")) return MIME_DOCX;
  if (nombres.has("xl/workbook.xml")) return MIME_XLSX;
  return null;
}

/** Nombre sin rutas ni caracteres de control, máx. 120 caracteres. */
export function limpiarNombre(nombre: string): string {
  const limpio = nombre.replace(/[\\/\u0000-\u001f"]/g, "_").trim().slice(0, 120);
  return limpio || "archivo";
}

export type AdjuntoValidado = EntradaAdjunto & { mimeType: MimeAdjunto };

/** Valida tipo, tamaño y cantidad (incluye los que el elemento ya tiene). Lanza ErrorDeNegocio con un mensaje claro. */
export function validarAdjuntos(entradas: EntradaAdjunto[], yaTiene = 0): AdjuntoValidado[] {
  if (yaTiene + entradas.length > MAX_ADJUNTOS) {
    throw new ErrorDeNegocio(`Puedes adjuntar hasta ${MAX_ADJUNTOS} archivos.`);
  }
  return entradas.map((e) => {
    const nombre = limpiarNombre(e.nombre);
    if (e.buffer.length === 0) throw new ErrorDeNegocio(`«${nombre}» está vacío.`);
    if (e.buffer.length > MAX_BYTES_ADJUNTO) throw new ErrorDeNegocio(`«${nombre}» pesa más de 10 MB.`);
    const mimeType = detectarMimeAdjunto(e.buffer);
    if (!mimeType) throw new ErrorDeNegocio(`«${nombre}» no se puede adjuntar. Solo aceptamos ${TIPOS_ADJUNTO_TEXTO}.`);
    return { nombre, buffer: e.buffer, mimeType };
  });
}

/** Archivos de un `FormData` (campo `adjuntos`), sin los vacíos que envía el navegador cuando no se eligió nada. */
export async function adjuntosDeFormData(formData: FormData, campo = "adjuntos"): Promise<EntradaAdjunto[]> {
  const salida: EntradaAdjunto[] = [];
  for (const v of formData.getAll(campo)) {
    if (typeof v === "string" || v.size === 0) continue;
    salida.push({ nombre: v.name, buffer: Buffer.from(await v.arrayBuffer()) });
  }
  return salida;
}

/** Ids marcados para quitar al editar (campo `quitarAdjuntos`). */
export function idsParaQuitar(formData: FormData, campo = "quitarAdjuntos"): string[] {
  return formData.getAll(campo).filter((v): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v));
}

export const adjuntoVista = (a: Pick<Archivo, "id" | "nombre" | "mimeType" | "bytes">): AdjuntoVista => ({
  id: a.id, nombre: a.nombre ?? "archivo", mimeType: a.mimeType, bytes: a.bytes,
});

/** Sube los archivos ya validados como privados y los registra en el elemento. Si algo falla, deshace lo subido. */
export async function guardarAdjuntos(ctx: TenantContext, destino: DestinoAdjunto, validados: AdjuntoValidado[]): Promise<Archivo[]> {
  const guardados: Archivo[] = [];
  const carpeta = "comunicadoId" in destino ? "comunicados" : "tareas";
  try {
    for (const v of validados) {
      const subido = await storage().subir(v.buffer, { tenantId: ctx.tenant.id, carpeta, privado: true, mimeType: v.mimeType });
      try {
        guardados.push(
          await ctx.db.archivo.create({
            data: {
              tenantId: ctx.tenant.id, proveedor: subido.proveedor, publicId: subido.publicId, url: null,
              mimeType: v.mimeType, bytes: v.buffer.length, privado: true, subidoPorId: ctx.user.id, nombre: v.nombre, ...destino,
            },
          }),
        );
      } catch (e) {
        await storage().borrar({ id: "", tenantId: ctx.tenant.id, publicId: subido.publicId, mimeType: v.mimeType, privado: true, url: null }).catch(() => undefined);
        throw e;
      }
    }
  } catch (e) {
    await borrarArchivos(ctx, guardados);
    throw e;
  }
  return guardados;
}

/** Borra del proveedor y de la BD los archivos dados (mejor esfuerzo en el proveedor). */
export async function borrarArchivos(ctx: TenantContext, archivos: Archivo[]): Promise<void> {
  for (const a of archivos) await storage().borrar(a).catch(() => undefined);
  if (archivos.length > 0) await ctx.db.archivo.deleteMany({ where: { id: { in: archivos.map((a) => a.id) } } });
}

/** Borra los adjuntos de un comunicado o tarea. Llamar antes de borrar el elemento (la BD los borra en cascada). */
export async function borrarAdjuntosDe(ctx: TenantContext, destino: DestinoAdjunto): Promise<void> {
  const archivos = await ctx.db.archivo.findMany({ where: destino });
  await borrarArchivos(ctx, archivos);
}

/** Quita adjuntos concretos de un elemento (ignora ids que no le pertenecen). Devuelve cuántos quitó. */
export async function quitarAdjuntos(ctx: TenantContext, destino: DestinoAdjunto, ids: string[]): Promise<number> {
  const validos = ids.filter((i) => /^[0-9a-f-]{36}$/i.test(i));
  if (validos.length === 0) return 0;
  const archivos = await ctx.db.archivo.findMany({ where: { ...destino, id: { in: validos } } });
  await borrarArchivos(ctx, archivos);
  return archivos.length;
}

/** Cuántos adjuntos le quedarían al elemento si se quitan los ids dados. */
export async function contarRestantes(ctx: TenantContext, destino: DestinoAdjunto, quitar: string[]): Promise<number> {
  const existentes = await ctx.db.archivo.findMany({ where: destino, select: { id: true } });
  return existentes.filter((a) => !quitar.includes(a.id)).length;
}
