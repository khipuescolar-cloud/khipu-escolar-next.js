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
export const MIME_PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
export const MIME_ODT = "application/vnd.oasis.opendocument.text";

export type MimeAdjunto = "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | typeof MIME_DOCX | typeof MIME_XLSX | typeof MIME_PPTX | typeof MIME_ODT;

/** Tipos de comunicados y demás adjuntos (los de siempre). PPTX y ODT solo se aceptan en tareas (specs/39). */
export const MIMES_BASICOS: ReadonlySet<MimeAdjunto> = new Set<MimeAdjunto>(["application/pdf", "image/jpeg", "image/png", "image/webp", MIME_DOCX, MIME_XLSX]);

export type EntradaAdjunto = { nombre: string; buffer: Buffer };
/** Comunicado, tarea, mensaje de la mesa de ayuda (specs/23) o documento de la biblioteca (specs/31). */
export type DestinoAdjunto = { comunicadoId: string } | { tareaId: string } | { mensajeSoporteId: string } | { documentoId: string } | { entregaId: string };

/**
 * Detecta el tipo real por la firma. DOCX, XLSX y PPTX son ZIP: se distinguen por sus entradas internas; ODT, por su
 * entrada `mimetype`. Los formatos antiguos de Office (DOC/PPT/XLS) comparten la misma firma OLE y no se aceptan.
 */
export function detectarMimeAdjunto(buffer: Uint8Array): MimeAdjunto | null {
  const base = detectarMime(buffer);
  if (base) return base;
  const esZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  if (!esZip) return null;
  const nombres = new Set<string>();
  let contenido: Record<string, Uint8Array>;
  try {
    contenido = unzipSync(buffer, { filter: (f) => (nombres.add(f.name), f.name === "mimetype" && f.originalSize < 200) });
  } catch {
    return null;
  }
  if (nombres.has("word/document.xml")) return MIME_DOCX;
  if (nombres.has("xl/workbook.xml")) return MIME_XLSX;
  if (nombres.has("ppt/presentation.xml")) return MIME_PPTX;
  if (contenido.mimetype && new TextDecoder().decode(contenido.mimetype).trim() === MIME_ODT && nombres.has("content.xml")) return MIME_ODT;
  return null;
}

/** Nombre sin rutas ni caracteres de control, máx. 120 caracteres. */
export function limpiarNombre(nombre: string): string {
  const limpio = nombre.replace(/[\\/\u0000-\u001f"]/g, "_").trim().slice(0, 120);
  return limpio || "archivo";
}

export type AdjuntoValidado = EntradaAdjunto & { mimeType: MimeAdjunto };

export type OpcionesAdjuntos = {
  maxArchivos?: number;
  maxBytes?: number;
  /** Tipos aceptados (por defecto `MIMES_BASICOS`). */
  tipos?: ReadonlySet<MimeAdjunto>;
  tiposTexto?: string;
  /** Exige que la extensión del nombre corresponda al tipo real (tareas, specs/39). */
  exigirExtension?: (nombre: string, mime: string) => boolean;
};

/** Valida tipo, tamaño y cantidad (incluye los que el elemento ya tiene). Lanza ErrorDeNegocio con un mensaje claro. */
export function validarAdjuntos(entradas: EntradaAdjunto[], yaTiene = 0, opciones: OpcionesAdjuntos = {}): AdjuntoValidado[] {
  const maxArchivos = opciones.maxArchivos ?? MAX_ADJUNTOS;
  const maxBytes = opciones.maxBytes ?? MAX_BYTES_ADJUNTO;
  const tipos = opciones.tipos ?? MIMES_BASICOS;
  const tiposTexto = opciones.tiposTexto ?? TIPOS_ADJUNTO_TEXTO;
  if (yaTiene + entradas.length > maxArchivos) {
    throw new ErrorDeNegocio(`Puedes adjuntar hasta ${maxArchivos} archivos.`);
  }
  return entradas.map((e) => {
    const nombre = limpiarNombre(e.nombre);
    if (e.buffer.length === 0) throw new ErrorDeNegocio(`«${nombre}» está vacío.`);
    if (e.buffer.length > maxBytes) throw new ErrorDeNegocio(`«${nombre}» pesa más de ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    const mimeType = detectarMimeAdjunto(e.buffer);
    if (!mimeType || !tipos.has(mimeType)) throw new ErrorDeNegocio(`«${nombre}» no se puede adjuntar. Solo aceptamos ${tiposTexto}.`);
    if (opciones.exigirExtension && !opciones.exigirExtension(nombre, mimeType)) {
      throw new ErrorDeNegocio(`«${nombre}» no es lo que dice su extensión. Revisa el archivo y vuelve a intentarlo.`);
    }
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
  const carpeta = "comunicadoId" in destino ? "comunicados" : "tareaId" in destino || "entregaId" in destino ? "tareas" : "documentoId" in destino ? "documentos" : "soporte";
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

/**
 * Borra del proveedor los archivos dados. Mejor esfuerzo: si el proveedor falla se registra y se sigue (la fila ya no existe
 * o se borrará en cascada; el sobrante lo detecta `scripts/limpiar-archivos.ts --proveedor` en el almacenamiento local).
 */
export async function borrarDelProveedor(archivos: Archivo[]): Promise<void> {
  for (const a of archivos) {
    await storage().borrar(a).catch((error) => console.error("[archivos] no se pudo borrar del proveedor", a.proveedor, a.publicId, error));
  }
}

/** Borra de la BD y luego del proveedor los archivos dados. */
export async function borrarArchivos(ctx: TenantContext, archivos: Archivo[]): Promise<void> {
  if (archivos.length === 0) return;
  await ctx.db.archivo.deleteMany({ where: { id: { in: archivos.map((a) => a.id) } } });
  await borrarDelProveedor(archivos);
}

/** Adjuntos de un comunicado o tarea. Se recolectan ANTES de borrar el elemento (la BD los borra en cascada) y se pasan a `borrarDelProveedor` DESPUÉS. */
export async function adjuntosDe(ctx: TenantContext, destino: DestinoAdjunto): Promise<Archivo[]> {
  return ctx.db.archivo.findMany({ where: destino });
}

/** Adjuntos de comunicados dirigidos al salón y de tareas de sus cursos: todo lo que se borra en cascada con el salón. */
export async function adjuntosDeSalon(ctx: TenantContext, salonId: string): Promise<Archivo[]> {
  return ctx.db.archivo.findMany({
    where: { OR: [{ comunicado: { salonId } }, { tarea: { curso: { salonId } } }, { entrega: { asignacion: { tarea: { curso: { salonId } } } } }] },
  });
}

/** Adjuntos de las tareas de un curso (se borran en cascada con el curso). */
export async function adjuntosDeCurso(ctx: TenantContext, cursoId: string): Promise<Archivo[]> {
  return ctx.db.archivo.findMany({ where: { OR: [{ tarea: { cursoId } }, { entrega: { asignacion: { tarea: { cursoId } } } }] } });
}

/** Borra los adjuntos de un comunicado o tarea (fila y proveedor). Para borrar el elemento mismo usa `adjuntosDe` + `borrarDelProveedor`. */
export async function borrarAdjuntosDe(ctx: TenantContext, destino: DestinoAdjunto): Promise<void> {
  await borrarArchivos(ctx, await adjuntosDe(ctx, destino));
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
