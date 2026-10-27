// Registros hechos sin conexión (specs/04, specs/05). Funciones puras, usadas por el servidor y el navegador.
//
// El dispositivo guarda la hora real en que se pasó lista o se leyó el carnet. El servidor solo la respeta si es
// razonable: no futura (más allá de unos minutos de desfase de reloj) y no más vieja que la ventana permitida.
// Fuera de ese rango se usa la hora del servidor, así un reloj mal puesto no permite registrar en otro día.

export const VENTANA_OFFLINE_HORAS = 48;
export const TOLERANCIA_RELOJ_MINUTOS = 5;

/** Instante con el que se registra: el enviado por el dispositivo si es razonable; si no, `ahora`. */
export function instanteDeRegistro(registradoAt: string | null | undefined, ahora: Date = new Date()): Date {
  if (!registradoAt) return ahora;
  const t = Date.parse(registradoAt);
  if (Number.isNaN(t)) return ahora;
  if (t > ahora.getTime() + TOLERANCIA_RELOJ_MINUTOS * 60_000) return ahora;
  if (t < ahora.getTime() - VENTANA_OFFLINE_HORAS * 3_600_000) return ahora;
  return new Date(t);
}

/** Texto del contador: «1 lista pendiente de enviar», «3 listas pendientes de enviar». */
export function textoPendientes(cantidad: number, singular: string, plural: string, cola = "pendiente"): string {
  return cantidad === 1 ? `1 ${singular} ${cola} de enviar` : `${cantidad} ${plural} ${cola}s de enviar`;
}

export type ResultadoEnvio = "enviado" | "descartar" | "reintentar";

/**
 * Envía los pendientes en orden. «enviado» y «descartar» (el servidor los rechazó, reenviarlos no sirve) salen de la cola;
 * «reintentar» (seguimos sin conexión o falló el servidor) detiene el proceso y conserva el resto.
 */
export async function vaciarCola<T>(
  items: T[],
  enviar: (item: T) => Promise<ResultadoEnvio>,
  quitar: (item: T) => Promise<void>,
): Promise<{ enviados: number; descartados: number; pendientes: number }> {
  let enviados = 0;
  let descartados = 0;
  for (let i = 0; i < items.length; i++) {
    const r = await enviar(items[i]);
    if (r === "reintentar") return { enviados, descartados, pendientes: items.length - i };
    await quitar(items[i]);
    if (r === "enviado") enviados++;
    else descartados++;
  }
  return { enviados, descartados, pendientes: 0 };
}

/** Un fallo de red del navegador (sin conexión, servidor inalcanzable) al llamar a una acción del servidor. */
export function esErrorDeRed(error: unknown, enLinea: boolean): boolean {
  return !enLinea || error instanceof TypeError;
}
