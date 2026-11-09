import "server-only";
import type { ConsumoIA, Explicacion, OperacionIa } from "@/lib/nudito/contratos";
import type { DbTenant } from "../../db";
import { configProveedor } from "../../nudito-plus/proveedor";
import { costoEstimadoUsd, inicioMesLima, registrarUso } from "../../nudito-plus/uso";

// Consumo de IA del tutor (specs/41): cada llamada queda en `nudito_consumos_ia` (con `simulado`) y suma al `UsoNudito`
// mensual del alumno (los topes por alumno de Nudito+ siguen valiendo). Los topes por colegio, minuto, día y sesión
// los aplica `verificarLimites` (seguridad.ts) con estas consultas.

export const LIMITE_IA_POR_MINUTO = 20;
export const LIMITE_IA_POR_DIA = 200;
export const LIMITE_IA_POR_SESION = 60;

export type DatosConsumo = { tenantId: string; alumnoId: string | null; leccionId?: string | null; sesionId: string | null; operacion: OperacionIa; consumo: ConsumoIA; ok: boolean; error?: string };

/** Registra una llamada y suma el total del mes (un acierto de caché se registra pero no suma uso). */
export async function registrarConsumo(db: DbTenant, datos: DatosConsumo, ahora: Date = new Date()): Promise<void> {
  const precios = await configProveedor();
  const { consumo } = datos;
  const costo = consumo.simulado ? 0 : costoEstimadoUsd(consumo.tokensEntrada, consumo.tokensSalida, precios);
  await db.nuditoConsumoIa.create({
    data: {
      tenantId: datos.tenantId,
      alumnoId: datos.alumnoId,
      leccionId: datos.leccionId ?? null,
      sesionId: datos.sesionId,
      operacion: datos.operacion,
      proveedor: consumo.proveedor,
      modelo: consumo.modelo,
      tokensEntrada: consumo.tokensEntrada,
      tokensSalida: consumo.tokensSalida,
      costoEstimadoUsd: costo,
      latenciaMs: consumo.latenciaMs,
      cache: consumo.cache,
      simulado: consumo.simulado,
      ok: datos.ok,
      error: datos.error?.slice(0, 300) ?? null,
      createdAt: ahora,
    },
  });
  if (datos.alumnoId && !consumo.cache && (consumo.tokensEntrada > 0 || consumo.tokensSalida > 0)) {
    await registrarUso(db, datos.tenantId, datos.alumnoId, consumo, consumo.simulado ? { costoEntradaUsdPorMillon: 0, costoSalidaUsdPorMillon: 0 } : precios, ahora);
  }
}

/** Costo estimado del colegio en el mes (suma de `usos_nudito`). */
export async function costoColegioMes(db: DbTenant, ahora: Date = new Date()): Promise<number> {
  const inicio = inicioMesLima(ahora);
  const fin = new Date(inicio); fin.setUTCMonth(fin.getUTCMonth() + 1);
  const r = await db.nuditoConsumoIa.aggregate({ where: { createdAt: { gte: inicio, lt: fin } }, _sum: { costoEstimadoUsd: true } });
  return Number(r._sum.costoEstimadoUsd ?? 0);
}

export async function contarConsumos(db: DbTenant, filtro: { alumnoId: string; desde?: Date; sesionId?: string }): Promise<number> {
  return db.nuditoConsumoIa.count({ where: { alumnoId: filtro.alumnoId, ...(filtro.desde ? { createdAt: { gte: filtro.desde } } : {}), ...(filtro.sesionId ? { sesionId: filtro.sesionId } : {}) } });
}

// ───────────── Caché de explicaciones (sin datos personales) ─────────────

const CACHE_MAX = 500;
const cache = new Map<string, Explicacion>();

/** Clave: (temaClave, grado, versión del tema). Nunca incluye al alumno ni su texto. */
export const claveCache = (temaClave: string, grado: number, version: number) => `${temaClave}|${grado}|v${version}`;

export function leerCache(clave: string): Explicacion | undefined {
  const v = cache.get(clave);
  if (v) {
    cache.delete(clave);
    cache.set(clave, v);
  }
  return v;
}

export function guardarCache(clave: string, valor: Explicacion): void {
  cache.set(clave, valor);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}

export function limpiarCache(): void {
  cache.clear();
}
