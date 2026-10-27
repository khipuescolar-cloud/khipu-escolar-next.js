import "server-only";
import type { Archivo, PrismaClient } from "@/generated/prisma/client";
import type { FileStorage } from "./storage/tipos";
import { storageDe } from "./storage";

// Mantenimiento de archivos (specs/14): limpieza de huérfanos y migración entre proveedores.
// Lo usan scripts/limpiar-archivos.ts y scripts/migrar-archivos.ts (equipo Khipu, nunca desde la web).

/** Un archivo subido que nadie referencia solo se considera huérfano pasadas estas horas (da margen a subidas en curso). */
export const HORAS_GRACIA_HUERFANOS = 24;

/**
 * Archivos sin referencia: no son logo de un colegio, ni foto de alumno, ni adjunto de justificación, comunicado,
 * tarea o exportación, y tienen más de 24 h.
 */
export async function encontrarArchivosHuerfanos(prisma: PrismaClient, ahora = new Date()): Promise<Archivo[]> {
  const limite = new Date(ahora.getTime() - HORAS_GRACIA_HUERFANOS * 3_600_000);
  const [logos, fotos] = await Promise.all([
    prisma.tenant.findMany({ where: { logoArchivoId: { not: null } }, select: { logoArchivoId: true } }),
    prisma.alumno.findMany({ where: { fotoArchivoId: { not: null } }, select: { fotoArchivoId: true } }),
  ]);
  const referenciados = [...logos.map((l) => l.logoArchivoId), ...fotos.map((f) => f.fotoArchivoId)].filter((x): x is string => !!x);
  return prisma.archivo.findMany({
    where: {
      createdAt: { lt: limite },
      id: { notIn: referenciados },
      comunicadoId: null,
      tareaId: null,
      justificaciones: { none: {} },
      exportaciones: { none: {} },
    },
    orderBy: { createdAt: "asc" },
  });
}

export type ResultadoLimpieza = { encontrados: number; borrados: number; fallidos: { id: string; error: string }[] };

/** Borra los huérfanos del almacenamiento y de la BD. Con `confirmar: false` solo los cuenta (simulacro). */
export async function limpiarArchivosHuerfanos(
  prisma: PrismaClient,
  { confirmar, ahora, borrarDelProveedor = (a: Archivo) => storageDe(a.proveedor).borrar(a) }: { confirmar: boolean; ahora?: Date; borrarDelProveedor?: (a: Archivo) => Promise<void> },
): Promise<ResultadoLimpieza> {
  const huerfanos = await encontrarArchivosHuerfanos(prisma, ahora);
  const resultado: ResultadoLimpieza = { encontrados: huerfanos.length, borrados: 0, fallidos: [] };
  if (!confirmar) return resultado;
  for (const a of huerfanos) {
    try {
      await borrarDelProveedor(a);
      await prisma.archivo.delete({ where: { id: a.id } });
      resultado.borrados++;
    } catch (error) {
      resultado.fallidos.push({ id: a.id, error: error instanceof Error ? error.message : "error" });
    }
  }
  return resultado;
}

export type ResultadoMigracion = { encontrados: number; migrados: number; fallidos: { id: string; error: string }[] };

type Proveedor = Archivo["proveedor"];

/**
 * Copia los archivos de un proveedor a otro y actualiza `Archivo.proveedor/publicId/url`. Después borra el original
 * (si eso falla queda un sobrante en el origen y se avisa, pero el archivo ya apunta al destino). Con `simulacro` no toca nada.
 * `leer` y `destino` se inyectan en los tests.
 */
export async function migrarArchivos(
  prisma: PrismaClient,
  { de, a, simulacro, leer, destino }: { de: Proveedor; a: Proveedor; simulacro: boolean; leer?: (archivo: Archivo) => Promise<Buffer>; destino?: FileStorage },
): Promise<ResultadoMigracion> {
  if (de === a) throw new Error("El origen y el destino son el mismo proveedor");
  const archivos = await prisma.archivo.findMany({ where: { proveedor: de }, orderBy: { createdAt: "asc" } });
  const resultado: ResultadoMigracion = { encontrados: archivos.length, migrados: 0, fallidos: [] };
  if (simulacro) return resultado;
  const origen = storageDe(de);
  const nuevo = destino ?? storageDe(a);
  const lector = leer ?? (async (archivo: Archivo) => {
    if (de === "local") return (await import("./storage/local")).leerArchivoLocal(archivo.publicId);
    const res = await fetch(await origen.urlTemporal(archivo, 300));
    if (!res.ok) throw new Error(`El proveedor respondió ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  });
  for (const archivo of archivos) {
    try {
      const subido = await nuevo.subir(await lector(archivo), { tenantId: archivo.tenantId, carpeta: "migrados", privado: archivo.privado, mimeType: archivo.mimeType });
      await prisma.archivo.update({ where: { id: archivo.id }, data: { proveedor: subido.proveedor, publicId: subido.publicId, url: subido.url } });
      resultado.migrados++;
      await origen.borrar(archivo).catch((error) => console.warn(`No se pudo borrar el original ${de}:${archivo.publicId}`, error));
    } catch (error) {
      resultado.fallidos.push({ id: archivo.id, error: error instanceof Error ? error.message : "error" });
    }
  }
  return resultado;
}
