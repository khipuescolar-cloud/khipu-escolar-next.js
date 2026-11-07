import "server-only";
import { createHash } from "node:crypto";
import type { Archivo, CategoriaArchivo } from "@/generated/prisma/client";
import { CATEGORIAS_CRITICAS, segundosUrl, tiposDe } from "@/lib/almacenamiento";
import { detectarMimeAdjunto, limpiarNombre } from "../adjuntos";
import { db } from "../db";
import { requireFeature } from "../plan";
import { storage, storageDe } from "../storage";
import type { SubidaPrefirmada } from "../storage/tipos";
import type { TenantContext } from "../tenant";
import { confirmarUso, descontar, liberarReserva, recategorizarUso, reservar, asegurarMedidor } from "./cuotas";
import { registrarMetrica } from "./metricas";

export type { CategoriaArchivo, SubidaPrefirmada };
export type EntradaSubida = { categoria: CategoriaArchivo; nombre: string; bytes: number; mimeDeclarado: string; contexto?: Record<string, string> };
export type SubidaIniciada = SubidaPrefirmada & { subidaId: string; directa: boolean };
export type EntradaArchivo = { nombre: string; buffer: Buffer } | { subidaId: string };
export type LimitesAlmacenamiento = { limiteBytes: bigint | null; maxBytesDocumento: number; maxBytesEntrega: number; maxArchivosEntrega: number; cuotaBorradorBytes: bigint };
export type ResumenAlmacenamiento = { limiteBytes: bigint | null; usadoBytes: bigint; reservadoBytes: bigint; categorias: { categoria: CategoriaArchivo; bytes: bigint; archivos: number }[] };
export { segundosUrl };

function exigePlan(ctx: TenantContext, categoria: CategoriaArchivo) {
  if (["documento", "material_clase", "solicitud", "borrador"].includes(categoria)) requireFeature(ctx, "documentos");
  if (ctx.soporte || ctx.rol === "porteria") throw new Error("No puedes subir archivos desde este rol.");
  if (["documento", "borrador"].includes(categoria) && !["direccion", "administrativo", "profesor"].includes(ctx.rol)) throw new Error("No puedes subir archivos de esta categoría.");
  if (categoria === "material_clase" && !["direccion", "profesor"].includes(ctx.rol)) throw new Error("No puedes subir materiales.");
  if (categoria === "solicitud" && !["direccion", "profesor", "administrativo"].includes(ctx.rol)) throw new Error("No puedes atender solicitudes.");
  if (categoria === "entrega" && !["alumno", "apoderado"].includes(ctx.rol)) throw new Error("Solo alumnos y familias suben entregas.");
}
function maxBytes(c: CategoriaArchivo, l: LimitesAlmacenamiento): number {
  return c === "entrega" ? l.maxBytesEntrega : ["documento", "material_clase", "material_tarea", "solicitud", "borrador"].includes(c) ? l.maxBytesDocumento : 10 * 1024 * 1024;
}
function extensionPara(nombre: string, mime: string): string {
  const ext = nombre.split(".").pop()?.toLowerCase() ?? "";
  const mapeo: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", odt: "application/vnd.oasis.opendocument.text" };
  if (mapeo[ext] !== mime) throw new Error("La extensión no coincide con el tipo de archivo.");
  return ext;
}
export async function limitesDe(ctx: TenantContext): Promise<LimitesAlmacenamiento> {
  const m = await asegurarMedidor(ctx);
  return { limiteBytes: m.limiteBytes, maxBytesDocumento: m.maxBytesDocumento, maxBytesEntrega: m.maxBytesEntrega, maxArchivosEntrega: m.maxArchivosEntrega, cuotaBorradorBytes: m.cuotaBorradorBytes };
}
export async function iniciarSubida(ctx: TenantContext, e: EntradaSubida): Promise<SubidaIniciada> {
  exigePlan(ctx, e.categoria);
  const l = await limitesDe(ctx);
  if (!Number.isSafeInteger(e.bytes) || e.bytes < 1 || e.bytes > maxBytes(e.categoria, l)) throw new Error("El archivo supera el límite de tamaño.");
  if (!tiposDe(e.categoria).has(e.mimeDeclarado)) throw new Error("Tipo de archivo no permitido.");
  const nombre = limpiarNombre(e.nombre);
  const extension = extensionPara(nombre, e.mimeDeclarado);
  if (e.categoria === "borrador") {
    const usados = await ctx.db.archivo.aggregate({ where: { subidoPorId: ctx.user.id, categoria: "borrador" }, _sum: { bytes: true } });
    const pendientes = await ctx.db.subidaArchivo.aggregate({ where: { membershipId: ctx.membership.id, categoria: "borrador", estado: "pendiente" }, _sum: { bytesDeclarados: true } });
    if (BigInt((usados._sum.bytes ?? 0) + (pendientes._sum.bytesDeclarados ?? 0) + e.bytes) > l.cuotaBorradorBytes) throw new Error("Alcanzaste el espacio de borradores.");
  }
  const critica = CATEGORIAS_CRITICAS.has(e.categoria);
  if (!(await reservar(ctx, e.categoria === "exportacion" ? 0 : e.bytes, critica))) {
    await registrarMetrica(ctx.tenant.id, e.categoria, "rechazosCuota", 0);
    throw new Error("El colegio alcanzó su espacio. Avisa a dirección.");
  }
  try {
    const proveedor = storage();
    if (!proveedor.prepararSubida) throw new Error("Este proveedor no permite carga directa; usa la carga por servidor.");
    const p = await proveedor.prepararSubida({ tenantId: ctx.tenant.id, carpeta: e.categoria, privado: true, mimeType: e.mimeDeclarado, bytes: e.bytes, extension });
    const subida = await ctx.db.subidaArchivo.create({ data: { tenantId: ctx.tenant.id, membershipId: ctx.membership.id, categoria: e.categoria, critica, nombre, mimeDeclarado: e.mimeDeclarado, bytesDeclarados: e.bytes, proveedor: proveedor.proveedor, publicId: p.publicId, reservaBytes: e.categoria === "exportacion" ? BigInt(0) : BigInt(e.bytes), contexto: e.contexto ?? undefined, expiraAt: p.expiraAt } });
    return { ...p, subidaId: subida.id, directa: true };
  } catch (error) { await liberarReserva(ctx, e.categoria === "exportacion" ? BigInt(0) : BigInt(e.bytes)); throw error; }
}
async function validarContenido(proveedor: ReturnType<typeof storage>, publicId: string, bytes: number, categoria: CategoriaArchivo, mime: string, nombre: string) {
  if (!proveedor.inspeccionar || !proveedor.leerRango) throw new Error("El proveedor no permite verificar la subida.");
  const info = await proveedor.inspeccionar(publicId);
  if (!info || info.bytes !== bytes || (info.contentType && info.contentType !== mime)) throw new Error("El tamaño o tipo de la subida no coincide.");
  const muestra = await proveedor.leerRango(publicId, 0, ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(mime) ? 31 : bytes - 1);
  const real = detectarMimeAdjunto(muestra);
  if (real !== mime || !tiposDe(categoria).has(real) || !extensionPara(nombre, real)) throw new Error("El contenido del archivo no coincide con su extensión.");
  return createHash("sha256").update(muestra.length === bytes ? muestra : await proveedor.leerRango(publicId, 0, bytes - 1)).digest("hex");
}
export async function confirmarSubida(ctx: TenantContext, subidaId: string): Promise<{ archivo: Archivo; contexto: Record<string, string> | null }> {
  const s = await ctx.db.subidaArchivo.findFirst({ where: { id: subidaId, membershipId: ctx.membership.id } });
  if (!s) throw new Error("Subida no encontrada.");
  if (s.estado === "confirmada" && s.archivoId) { const archivo = await ctx.db.archivo.findUnique({ where: { id: s.archivoId } }); if (archivo) return { archivo, contexto: s.contexto as Record<string, string> | null }; }
  if (s.estado !== "pendiente" || s.expiraAt <= new Date()) throw new Error("La subida ya no está vigente.");
  const proveedor = storageDe(s.proveedor);
  let sha256: string;
  try { sha256 = await validarContenido(proveedor, s.publicId, s.bytesDeclarados, s.categoria, s.mimeDeclarado, s.nombre); }
  catch (error) { await cancelarSubida(ctx, subidaId, "fallida"); await registrarMetrica(ctx.tenant.id, s.categoria, "subidasFallidas", 0); throw error; }
  const reclamado = await ctx.db.subidaArchivo.updateMany({ where: { id: s.id, estado: "pendiente" }, data: { estado: "confirmada", confirmadaAt: new Date() } });
  if (!reclamado.count) return confirmarSubida(ctx, subidaId);
  try {
    const archivo = await ctx.db.archivo.create({ data: { tenantId: ctx.tenant.id, proveedor: s.proveedor, publicId: s.publicId, url: null, mimeType: s.mimeDeclarado, bytes: s.bytesDeclarados, privado: true, subidoPorId: ctx.user.id, nombre: s.nombre, categoria: s.categoria, sha256 } });
    await ctx.db.subidaArchivo.update({ where: { id: s.id }, data: { archivoId: archivo.id } });
    await confirmarUso(ctx, s.categoria, s.reservaBytes, BigInt(archivo.bytes));
    await registrarMetrica(ctx.tenant.id, s.categoria, "subidas", archivo.bytes);
    return { archivo, contexto: s.contexto as Record<string, string> | null };
  } catch (error) { await ctx.db.subidaArchivo.update({ where: { id: s.id }, data: { estado: "fallida", error: String(error) } }); throw error; }
}
export async function cancelarSubida(ctx: TenantContext, subidaId: string, estado: "cancelada" | "fallida" = "cancelada"): Promise<void> {
  const s = await ctx.db.subidaArchivo.findFirst({ where: { id: subidaId, membershipId: ctx.membership.id, estado: "pendiente" } });
  if (!s) return;
  const n = await ctx.db.subidaArchivo.updateMany({ where: { id: s.id, estado: "pendiente" }, data: { estado } });
  if (!n.count) return;
  await liberarReserva(ctx, s.reservaBytes);
  await storageDe(s.proveedor).borrar({ id: s.id, tenantId: s.tenantId, publicId: s.publicId, mimeType: s.mimeDeclarado, privado: true, url: null });
}
export async function guardarArchivoCentral(ctx: TenantContext, buf: Buffer, e: Omit<EntradaSubida, "bytes" | "mimeDeclarado">): Promise<Archivo> {
  exigePlan(ctx, e.categoria);
  const mime = detectarMimeAdjunto(buf);
  if (!mime || !tiposDe(e.categoria).has(mime)) throw new Error("Tipo de archivo no permitido.");
  const nombre = limpiarNombre(e.nombre);
  extensionPara(nombre, mime);
  const l = await limitesDe(ctx);
  if (buf.length < 1 || buf.length > maxBytes(e.categoria, l)) throw new Error("El archivo supera el límite de tamaño.");
  const reserva = e.categoria === "exportacion" ? 0 : buf.length;
  if (!(await reservar(ctx, reserva, CATEGORIAS_CRITICAS.has(e.categoria)))) throw new Error("El colegio alcanzó su espacio. Avisa a dirección.");
  let subido: Awaited<ReturnType<ReturnType<typeof storage>["subir"]>> | undefined;
  try {
    subido = await storage().subir(buf, { tenantId: ctx.tenant.id, carpeta: e.categoria, privado: true, mimeType: mime });
    const archivo = await ctx.db.archivo.create({ data: { tenantId: ctx.tenant.id, proveedor: subido.proveedor, publicId: subido.publicId, mimeType: mime, bytes: buf.length, privado: true, subidoPorId: ctx.user.id, nombre, categoria: e.categoria, sha256: createHash("sha256").update(buf).digest("hex") } });
    await confirmarUso(ctx, e.categoria, BigInt(reserva), BigInt(buf.length));
    await registrarMetrica(ctx.tenant.id, e.categoria, "subidas", buf.length);
    return archivo;
  } catch (error) { await liberarReserva(ctx, BigInt(reserva)); if (subido) await storageDe(subido.proveedor).borrar({ id: "", tenantId: ctx.tenant.id, publicId: subido.publicId, mimeType: mime, privado: true, url: null }); throw error; }
}
export async function materializarArchivos(ctx: TenantContext, categoria: CategoriaArchivo, entradas: EntradaArchivo[], opciones: { critica?: boolean; maxArchivos?: number } = {}): Promise<Archivo[]> {
  if (entradas.length > (opciones.maxArchivos ?? 10)) throw new Error("Demasiados archivos.");
  const archivos: Archivo[] = [];
  try { for (const e of entradas) archivos.push("subidaId" in e ? (await confirmarSubida(ctx, e.subidaId)).archivo : await guardarArchivoCentral(ctx, e.buffer, { categoria, nombre: e.nombre })); return archivos; }
  catch (error) { for (const a of archivos) await liberarArchivo(ctx, a.id); throw error; }
}
export async function liberarArchivo(ctx: TenantContext, archivoId: string): Promise<void> {
  const a = await ctx.db.archivo.findUnique({ where: { id: archivoId } });
  if (!a) return;
  if (a.comunicadoId || a.tareaId || a.entregaId || a.documentoId || a.mensajeSoporteId || a.reunionId || a.nuditoSesionId || await ctx.db.justificacion.count({ where: { adjuntoArchivoId: a.id } }) || await ctx.db.alumno.count({ where: { fotoArchivoId: a.id } }) || await ctx.db.tenant.count({ where: { logoArchivoId: a.id } })) throw new Error("No se puede liberar un archivo enlazado.");
  await storageDe(a.proveedor).borrar(a);
  await ctx.db.archivo.delete({ where: { id: a.id } });
  await descontar(ctx, a.categoria, BigInt(a.bytes));
  await registrarMetrica(ctx.tenant.id, a.categoria, "borrados", a.bytes);
}
export async function recategorizarArchivo(ctx: TenantContext, archivoId: string, nueva: CategoriaArchivo): Promise<void> {
  const a = await ctx.db.archivo.findUnique({ where: { id: archivoId } });
  if (!a) throw new Error("Archivo no encontrado.");
  await ctx.db.archivo.update({ where: { id: a.id }, data: { categoria: nueva } });
  await recategorizarUso(ctx, a.categoria, nueva, BigInt(a.bytes));
}
export async function barrerSubidasVencidas(ahora = new Date()): Promise<{ expiradas: number; liberadosBytes: bigint }> {
  const vencidas = await db.subidaArchivo.findMany({ where: { estado: "pendiente", expiraAt: { lt: ahora } } });
  let liberadosBytes = BigInt(0);
  for (const s of vencidas) {
    const n = await db.subidaArchivo.updateMany({ where: { id: s.id, estado: "pendiente" }, data: { estado: "expirada" } });
    if (!n.count) continue;
    await db.almacenamientoColegio.update({ where: { tenantId: s.tenantId }, data: { reservadoBytes: { decrement: s.reservaBytes } } });
    await storageDe(s.proveedor).borrar({ id: s.id, tenantId: s.tenantId, publicId: s.publicId, mimeType: s.mimeDeclarado, privado: true, url: null });
    liberadosBytes += s.reservaBytes;
  }
  return { expiradas: vencidas.length, liberadosBytes };
}
export async function reconciliarCuotas(tenantId?: string): Promise<{ tenantId: string; diferenciaBytes: bigint }[]> {
  const medidores = await db.almacenamientoColegio.findMany({ where: tenantId ? { tenantId } : {} });
  const cambios: { tenantId: string; diferenciaBytes: bigint }[] = [];
  for (const m of medidores) {
    const suma = await db.archivo.aggregate({ where: { tenantId: m.tenantId, categoria: { not: "exportacion" } }, _sum: { bytes: true } });
    const real = BigInt(suma._sum.bytes ?? 0);
    if (real !== m.usadoBytes) { await db.almacenamientoColegio.update({ where: { tenantId: m.tenantId }, data: { usadoBytes: real } }); cambios.push({ tenantId: m.tenantId, diferenciaBytes: real - m.usadoBytes }); }
  }
  return cambios;
}
export async function resumenAlmacenamiento(ctx: TenantContext): Promise<ResumenAlmacenamiento> {
  if (ctx.rol !== "direccion" || ctx.soporte) throw new Error("Solo dirección puede ver el uso de almacenamiento.");
  const m = await asegurarMedidor(ctx);
  const categorias = await ctx.db.usoAlmacenamientoCategoria.findMany();
  return { limiteBytes: m.limiteBytes, usadoBytes: m.usadoBytes, reservadoBytes: m.reservadoBytes, categorias: categorias.map(c => ({ categoria: c.categoria, bytes: c.bytes, archivos: c.archivos })) };
}
export async function resumenAlmacenamientoPlataforma() { return db.almacenamientoColegio.findMany({ include: { tenant: { select: { slug: true, nombre: true } } }, orderBy: { usadoBytes: "desc" } }); }
