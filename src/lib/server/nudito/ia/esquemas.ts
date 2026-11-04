import "server-only";
import type { z } from "zod";
import type { ConsumoIA, SalidaIA } from "@/lib/nudito/contratos";

// Validación de TODA salida estructurada de la IA (specs/41): `safeParse` del esquema del contrato → 1 reintento →
// respaldo determinista (texto revisado o `incierto`). Nunca lanza por una salida mala: la práctica sigue.

export { esquemaCandidatosTema, esquemaEvaluacionRubrica, esquemaExplicacion, esquemaLecturaImagen, esquemaPista } from "@/lib/nudito/contratos";

export type ResultadoValidado<T> = { datos: T; consumo: ConsumoIA; respaldo: boolean; error?: string };

/** Extrae el primer objeto JSON de un texto (los modelos a veces lo envuelven en ```json). */
export function extraerJson(texto: string): unknown {
  const limpio = texto.replace(/```(?:json)?/gi, "").trim();
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio < 0 || fin <= inicio) throw new Error("La salida no trae JSON");
  return JSON.parse(limpio.slice(inicio, fin + 1));
}

export const CONSUMO_VACIO = (proveedor: string, simulado: boolean): ConsumoIA => ({
  proveedor, modelo: null, tokensEntrada: 0, tokensSalida: 0, latenciaMs: 0, cache: false, simulado,
});

/**
 * Llama a la operación, valida con el esquema y reintenta una vez. Si las dos fallan (excepción o esquema), devuelve
 * el respaldo con `respaldo: true`. Los tokens de los intentos fallidos se suman al consumo (se pagaron igual).
 */
export async function conValidacion<T>(
  esquema: z.ZodType<T>,
  llamada: () => Promise<SalidaIA<unknown>>,
  respaldo: () => T,
  proveedor: { nombre: string; simulado: boolean },
): Promise<ResultadoValidado<T>> {
  const acumulado = CONSUMO_VACIO(proveedor.nombre, proveedor.simulado);
  let error = "";
  for (let intento = 0; intento < 2; intento++) {
    try {
      const salida = await llamada();
      acumulado.modelo = salida.consumo.modelo;
      acumulado.tokensEntrada += salida.consumo.tokensEntrada;
      acumulado.tokensSalida += salida.consumo.tokensSalida;
      acumulado.latenciaMs += salida.consumo.latenciaMs;
      acumulado.cache = salida.consumo.cache;
      const r = esquema.safeParse(salida.datos);
      if (r.success) return { datos: r.data, consumo: acumulado, respaldo: false };
      error = `salida inválida: ${r.error.issues[0]?.message ?? "esquema"}`;
    } catch (e) {
      error = e instanceof Error ? e.message.slice(0, 200) : "error del proveedor";
    }
  }
  return { datos: respaldo(), consumo: acumulado, respaldo: true, error };
}
