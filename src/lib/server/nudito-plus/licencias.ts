import "server-only";
import type { ConsentimientoIa, LicenciaNudito, PrismaClient } from "@/generated/prisma/client";
import { fechaDb, fechaLima } from "@/lib/fechas";
import { db as dbGlobal, type DbTenant } from "../db";

// VERSIÓN MÍNIMA para la rama del tutor (specs/29). La versión completa (pagos, activación, panel) la construye
// la rama de licencias (specs/28) con estas MISMAS firmas; al integrar se queda la de specs/28.

/** Cliente global o del colegio: las funciones reciben `tenantId` explícito y filtran por él. */
export type DbNuditoPlus = PrismaClient | DbTenant;

function comoCliente(cliente: DbNuditoPlus): PrismaClient {
  return cliente as unknown as PrismaClient;
}

/** Licencia vigente del alumno: `estado = activa` y `desde <= hoy <= hasta` (hoy en hora de Lima; `hasta` incluido). */
export async function licenciaVigente(cliente: DbNuditoPlus, tenantId: string, alumnoId: string, hoy: Date = new Date()): Promise<LicenciaNudito | null> {
  const dia = fechaDb(fechaLima(hoy));
  return comoCliente(cliente).licenciaNudito.findFirst({
    where: { tenantId, alumnoId, estado: "activa", desde: { lte: dia }, hasta: { gte: dia } },
    orderBy: { hasta: "desc" },
  });
}

/** Consentimiento de IA vigente: el más reciente del alumno, si no está revocado. */
export async function consentimientoVigente(cliente: DbNuditoPlus, tenantId: string, alumnoId: string): Promise<ConsentimientoIa | null> {
  const ultimo = await comoCliente(cliente).consentimientoIa.findFirst({
    where: { tenantId, alumnoId },
    orderBy: { aceptadoAt: "desc" },
  });
  return ultimo && ultimo.revocadoAt === null ? ultimo : null;
}

export type LimitesNudito = { mensajesPorMes: number; tokensPorMes: number; costoMaxUsdPorMes: number };

export const LIMITES_POR_DEFECTO: LimitesNudito = { mensajesPorMes: 300, tokensPorMes: 300_000, costoMaxUsdPorMes: 1.5 };

function numeroPositivo(valor: unknown, respaldo: number): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) && n > 0 ? n : respaldo;
}

/** Topes mensuales por alumno (`ConfigPlataforma` «nudito_plus:limites»; respaldo 300 mensajes / 300 000 tokens / 1,5 USD). */
export async function limitesNudito(): Promise<LimitesNudito> {
  const fila = await dbGlobal.configPlataforma.findUnique({ where: { clave: "nudito_plus:limites" } });
  const v = (fila?.valor ?? {}) as Partial<Record<keyof LimitesNudito, unknown>>;
  return {
    mensajesPorMes: numeroPositivo(v.mensajesPorMes, LIMITES_POR_DEFECTO.mensajesPorMes),
    tokensPorMes: numeroPositivo(v.tokensPorMes, LIMITES_POR_DEFECTO.tokensPorMes),
    costoMaxUsdPorMes: numeroPositivo(v.costoMaxUsdPorMes, LIMITES_POR_DEFECTO.costoMaxUsdPorMes),
  };
}

export type SitioPermitidoActivo = { dominio: string; nombre: string };

/** Sitios activos de la lista blanca (global, specs/29), por dominio. */
export async function sitiosPermitidos(): Promise<SitioPermitidoActivo[]> {
  return dbGlobal.sitioPermitido.findMany({ where: { activo: true }, select: { dominio: true, nombre: true }, orderBy: { dominio: "asc" } });
}
