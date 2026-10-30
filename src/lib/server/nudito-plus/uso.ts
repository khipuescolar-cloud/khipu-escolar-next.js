import "server-only";
import { fechaLima, inicioDiaLima } from "@/lib/fechas";
import type { DbTenant } from "../db";
import type { LimitesNudito } from "./licencias";
import type { ConfigProveedor } from "./proveedor";

// Uso y topes mensuales de Nudito+ por alumno (specs/29): `UsoNudito` por (alumno, mes «AAAA-MM» de Lima).

/** Mes calendario en hora de Lima, «AAAA-MM». */
export function mesLima(ahora: Date = new Date()): string {
  return fechaLima(ahora).slice(0, 7);
}

/** Instante en que empezó el mes (hora de Lima). */
export function inicioMesLima(ahora: Date = new Date()): Date {
  return inicioDiaLima(`${mesLima(ahora)}-01`);
}

/** Costo estimado en USD con los precios por millón de tokens del proveedor (4 decimales). */
export function costoEstimadoUsd(tokensEntrada: number, tokensSalida: number, precios: Pick<ConfigProveedor, "costoEntradaUsdPorMillon" | "costoSalidaUsdPorMillon">): number {
  const costo = (tokensEntrada * precios.costoEntradaUsdPorMillon + tokensSalida * precios.costoSalidaUsdPorMillon) / 1_000_000;
  return Math.round(costo * 10_000) / 10_000;
}

export type UsoMes = { mensajes: number; tokensEntrada: number; tokensSalida: number; costoEstimadoUsd: number };

export const USO_VACIO: UsoMes = { mensajes: 0, tokensEntrada: 0, tokensSalida: 0, costoEstimadoUsd: 0 };

/** Puro: el uso del mes ya llegó a algún tope (mensajes, tokens de entrada + salida o costo). */
export function topeAlcanzado(uso: UsoMes, limites: LimitesNudito): boolean {
  return (
    uso.mensajes >= limites.mensajesPorMes ||
    uso.tokensEntrada + uso.tokensSalida >= limites.tokensPorMes ||
    uso.costoEstimadoUsd >= limites.costoMaxUsdPorMes
  );
}

export const MENSAJE_TOPE =
  "¡Qué bien que practicaste tanto este mes! Ya usaste todos tus mensajes de Nudito+.\n" +
  "El próximo mes seguimos. Mientras tanto, repasa tus cuadernos o pregúntale a tu profesor.";

export const DETALLE_ALERTA_USO = (nombre: string) =>
  `${nombre} usó todos los mensajes de Nudito+ de este mes. Se reactiva solo el próximo mes.`;

/** Uso del mes del alumno (vacío si aún no escribe). */
export async function usoDelMes(cliente: DbTenant, alumnoId: string, ahora: Date = new Date()): Promise<UsoMes> {
  const fila = await cliente.usoNudito.findUnique({ where: { alumnoId_mes: { alumnoId, mes: mesLima(ahora) } } });
  if (!fila) return { ...USO_VACIO };
  return { mensajes: fila.mensajes, tokensEntrada: fila.tokensEntrada, tokensSalida: fila.tokensSalida, costoEstimadoUsd: Number(fila.costoEstimadoUsd) };
}

/**
 * Revisa el tope del mes. Si se alcanzó, crea UNA AlertaNudito «uso» por mes (no repite) y devuelve `alcanzado`.
 */
export async function verificarTope(
  cliente: DbTenant,
  tenantId: string,
  alumno: { id: string; nombres: string },
  limites: LimitesNudito,
  ahora: Date = new Date(),
): Promise<{ alcanzado: boolean; uso: UsoMes }> {
  const uso = await usoDelMes(cliente, alumno.id, ahora);
  if (!topeAlcanzado(uso, limites)) return { alcanzado: false, uso };
  const yaAvisado = await cliente.alertaNudito.findFirst({
    where: { alumnoId: alumno.id, tipo: "uso", creadaAt: { gte: inicioMesLima(ahora) } },
    select: { id: true },
  });
  if (!yaAvisado) {
    await cliente.alertaNudito.create({ data: { tenantId, alumnoId: alumno.id, tipo: "uso", detalle: DETALLE_ALERTA_USO(alumno.nombres.split(" ")[0] ?? alumno.nombres) } });
  }
  return { alcanzado: true, uso };
}

/** Suma un mensaje respondido y sus tokens al uso del mes (upsert con incremento, seguro ante concurrencia). */
export async function registrarUso(
  cliente: DbTenant,
  tenantId: string,
  alumnoId: string,
  tokens: { tokensEntrada: number; tokensSalida: number },
  precios: Pick<ConfigProveedor, "costoEntradaUsdPorMillon" | "costoSalidaUsdPorMillon">,
  ahora: Date = new Date(),
): Promise<void> {
  const costo = costoEstimadoUsd(tokens.tokensEntrada, tokens.tokensSalida, precios);
  const mes = mesLima(ahora);
  await cliente.usoNudito.upsert({
    where: { alumnoId_mes: { alumnoId, mes } },
    create: { tenantId, alumnoId, mes, mensajes: 1, tokensEntrada: tokens.tokensEntrada, tokensSalida: tokens.tokensSalida, costoEstimadoUsd: costo },
    update: {
      mensajes: { increment: 1 },
      tokensEntrada: { increment: tokens.tokensEntrada },
      tokensSalida: { increment: tokens.tokensSalida },
      costoEstimadoUsd: { increment: costo },
    },
  });
}
