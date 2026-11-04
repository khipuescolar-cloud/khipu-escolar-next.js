import "server-only";
import { db } from "../db";
import { borrarArchivoDelProveedor } from "../storage";

// Responsable: D (specs/44). Purga lo que supera `retencion_dias` de cada colegio: intentos, ejercicios, mensajes de
// sesión y fotos (también en el proveedor de archivos). Conserva nudito_dominios y nudito_dominio_eventos (agregados),
// las sesiones (solo fechas, tema y totales, sin texto) y los consumos de IA. Corre en el cron semanal de Nudito
// (/api/cron/nudito-plus). Usa el cliente global con `tenantId` explícito; trabaja por lotes.

export type ResultadoRetencion = { colegios: number; intentos: number; ejercicios: number; mensajes: number; fotos: number };

/** Retención cuando el colegio no tiene fila de configuración (igual que el valor por defecto de la columna). */
export const RETENCION_DIAS_POR_DEFECTO = 180;
export const LOTE_RETENCION = 500;

const DIA_MS = 86_400_000;

/** Borra por lotes: busca ids con `buscar` y los elimina con `borrar` hasta que no queden. Devuelve el total. */
async function porLotes(buscar: () => Promise<string[]>, borrar: (ids: string[]) => Promise<number>): Promise<number> {
  let total = 0;
  for (;;) {
    const ids = await buscar();
    if (ids.length === 0) return total;
    total += await borrar(ids);
    if (ids.length < LOTE_RETENCION) return total;
  }
}

/** Purga un colegio con un corte dado. Exportada para pruebas. */
export async function purgarColegio(tenantId: string, corte: Date): Promise<Omit<ResultadoRetencion, "colegios">> {
  // 1) Fotos: primero el archivo en el proveedor, luego la fila (los intentos quedan con foto_archivo_id = null).
  const fotos = await porLotes(
    async () => (await db.archivo.findMany({ where: { tenantId, nuditoSesionId: { not: null }, createdAt: { lt: corte } }, select: { id: true }, take: LOTE_RETENCION })).map((a) => a.id),
    async (ids) => {
      const archivos = await db.archivo.findMany({ where: { id: { in: ids }, tenantId } });
      for (const a of archivos) {
        // Si el proveedor ya no lo tiene, se borra igual la fila: el objetivo es que no quede nada.
        await borrarArchivoDelProveedor(a).catch(() => undefined);
      }
      return (await db.archivo.deleteMany({ where: { id: { in: ids }, tenantId } })).count;
    },
  );
  // 2) Intentos vencidos.
  let intentos = await porLotes(
    async () => (await db.nuditoIntento.findMany({ where: { tenantId, createdAt: { lt: corte } }, select: { id: true }, take: LOTE_RETENCION })).map((i) => i.id),
    async (ids) => (await db.nuditoIntento.deleteMany({ where: { id: { in: ids }, tenantId } })).count,
  );
  // 3) Ejercicios vencidos (sus intentos restantes, si los hubiera, caen en cascada y se cuentan).
  const ejercicios = await porLotes(
    async () => (await db.nuditoEjercicio.findMany({ where: { tenantId, presentadoAt: { lt: corte } }, select: { id: true }, take: LOTE_RETENCION })).map((e) => e.id),
    async (ids) => {
      intentos += await db.nuditoIntento.count({ where: { ejercicioId: { in: ids } } });
      return (await db.nuditoEjercicio.deleteMany({ where: { id: { in: ids }, tenantId } })).count;
    },
  );
  // 4) Mensajes escritos dentro de una sesión de tutoría (los del chat antiguo de Nudito+ no se tocan aquí).
  const mensajes = await porLotes(
    async () => (await db.nuditoMensaje.findMany({ where: { tenantId, sesionId: { not: null }, createdAt: { lt: corte } }, select: { id: true }, take: LOTE_RETENCION })).map((m) => m.id),
    async (ids) => (await db.nuditoMensaje.deleteMany({ where: { id: { in: ids }, tenantId } })).count,
  );
  return { intentos, ejercicios, mensajes, fotos };
}

/** Recorre los colegios con actividad de Nudito y purga lo vencido según su `retencionDias`. */
export async function purgarRetencion(ahora: Date = new Date()): Promise<ResultadoRetencion> {
  const [conSesiones, configs] = await Promise.all([
    db.nuditoSesion.groupBy({ by: ["tenantId"] }),
    db.nuditoConfigColegio.findMany({ select: { tenantId: true, retencionDias: true } }),
  ]);
  const dias = new Map(configs.map((c) => [c.tenantId, c.retencionDias]));
  const tenants = new Set([...conSesiones.map((s) => s.tenantId), ...dias.keys()]);
  const total: ResultadoRetencion = { colegios: 0, intentos: 0, ejercicios: 0, mensajes: 0, fotos: 0 };
  for (const tenantId of tenants) {
    const retencion = Math.min(730, Math.max(30, dias.get(tenantId) ?? RETENCION_DIAS_POR_DEFECTO));
    const r = await purgarColegio(tenantId, new Date(ahora.getTime() - retencion * DIA_MS));
    total.colegios++;
    total.intentos += r.intentos;
    total.ejercicios += r.ejercicios;
    total.mensajes += r.mensajes;
    total.fotos += r.fotos;
  }
  return total;
}
