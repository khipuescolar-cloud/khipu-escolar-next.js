import "server-only";
/* eslint-disable @typescript-eslint/no-unused-vars -- Las firmas provisionales conservan argumentos para W1. */
import type { Archivo } from "@/generated/prisma/client";
import { borrarArchivos, guardarAdjuntos, validarAdjuntos } from "../adjuntos";
import type { TenantContext } from "../tenant";

/** Temporal hasta que W1 agregue el enum al esquema Prisma. */
export type CategoriaArchivo =
  | "documento" | "material_clase" | "material_tarea" | "entrega" | "solicitud" | "borrador"
  | "comunicado" | "soporte" | "justificacion" | "reunion" | "foto" | "logo" | "nudito" | "exportacion" | "otro";
/** Temporal hasta que W1 extienda FileStorage. */
export type SubidaPrefirmada = {
  publicId: string; url: string; metodo: "PUT"; headers: Record<string, string>; expiraAt: Date;
};
export type EntradaSubida = {
  categoria: CategoriaArchivo; nombre: string; bytes: number; mimeDeclarado: string;
  contexto?: Record<string, string>;
};
export type SubidaIniciada = SubidaPrefirmada & { subidaId: string; directa: boolean };
export type EntradaArchivo = { nombre: string; buffer: Buffer } | { subidaId: string };
/** Tipos provisionales; W1 los sustituye por los derivados del medidor. */
export type LimitesAlmacenamiento = {
  limiteBytes: bigint | null; maxBytesDocumento: number; maxBytesEntrega: number;
  maxArchivosEntrega: number; cuotaBorradorBytes: bigint;
};
export type ResumenAlmacenamiento = {
  limiteBytes: bigint | null; usadoBytes: bigint; reservadoBytes: bigint;
  categorias: { categoria: CategoriaArchivo; bytes: bigint; archivos: number }[];
};

const pendiente = (): never => { throw new Error("Almacenamiento directo no implementado (W1)."); };

export async function limitesDe(_ctx: TenantContext): Promise<LimitesAlmacenamiento> { return pendiente(); }
export async function iniciarSubida(_ctx: TenantContext, _e: EntradaSubida): Promise<SubidaIniciada> { return pendiente(); }
export async function confirmarSubida(_ctx: TenantContext, _subidaId: string): Promise<{ archivo: Archivo; contexto: Record<string, string> | null }> { return pendiente(); }
export async function cancelarSubida(_ctx: TenantContext, _subidaId: string): Promise<void> { return pendiente(); }

/** Camino provisional por servidor; W1 añadirá reserva, cuota y categoría. */
export async function guardarArchivoCentral(ctx: TenantContext, buf: Buffer, e: Omit<EntradaSubida, "bytes" | "mimeDeclarado">): Promise<Archivo> {
  const [validado] = validarAdjuntos([{ nombre: e.nombre, buffer: buf }]);
  const [archivo] = await guardarAdjuntos(ctx, null, [validado]);
  return archivo;
}

/** Crea filas sin dueño con el camino actual; la subida directa queda pendiente de W1. */
export async function materializarArchivos(
  ctx: TenantContext, categoria: CategoriaArchivo, entradas: EntradaArchivo[],
  opciones: { critica?: boolean; maxArchivos?: number } = {},
): Promise<Archivo[]> {
  if (entradas.some((entrada) => "subidaId" in entrada)) return pendiente();
  const buffers = entradas.filter((entrada): entrada is { nombre: string; buffer: Buffer } => "buffer" in entrada);
  const validados = validarAdjuntos(buffers, 0, { maxArchivos: opciones.maxArchivos });
  const archivos: Archivo[] = [];
  try {
    for (const entrada of validados) archivos.push(await guardarArchivoCentral(ctx, entrada.buffer, { categoria, nombre: entrada.nombre }));
    return archivos;
  } catch (error) {
    for (const archivo of archivos) await liberarArchivo(ctx, archivo.id);
    throw error;
  }
}

export async function liberarArchivo(ctx: TenantContext, archivoId: string): Promise<void> {
  const archivo = await ctx.db.archivo.findFirst({ where: { id: archivoId } });
  if (!archivo) return;
  if (archivo.comunicadoId || archivo.tareaId || archivo.mensajeSoporteId || archivo.documentoId ||
      archivo.entregaId || archivo.reunionId || archivo.nuditoSesionId) {
    throw new Error("No se puede liberar un archivo enlazado.");
  }
  await borrarArchivos(ctx, [archivo]);
}
export async function recategorizarArchivo(_ctx: TenantContext, _archivoId: string, _nueva: CategoriaArchivo): Promise<void> { return pendiente(); }
export async function barrerSubidasVencidas(_ahora?: Date): Promise<{ expiradas: number; liberadosBytes: bigint }> { return pendiente(); }
export async function reconciliarCuotas(_tenantId?: string): Promise<{ tenantId: string; diferenciaBytes: bigint }[]> { return pendiente(); }
export function segundosUrl(_categoria: CategoriaArchivo): number { return pendiente(); }
export async function resumenAlmacenamiento(_ctx: TenantContext): Promise<ResumenAlmacenamiento> { return pendiente(); }
