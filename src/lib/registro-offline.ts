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

/**
 * - `enviado`: el servidor lo aceptó.
 * - `descartar`: el servidor lo rechazó con una respuesta clara; reenviarlo no sirve.
 * - `reintentar`: no hay conexión (error de red); se detiene el proceso y NO cuenta como intento.
 * - `fallo`: el servidor respondió con un error que no es de red (500, etc.); cuenta un intento y se sigue con el resto.
 */
export type ResultadoEnvio = "enviado" | "descartar" | "reintentar" | "fallo";

/** Tras tantos fallos que no son de red, el registro queda como «No se pudo enviar» hasta que el profesor lo descarte. */
export const MAX_INTENTOS_COLA = 5;

export type ConIntentos = { intentos?: number };

/** Los items de la cola pueden traer `intentos`; los que no, cuentan 0. */
export const intentosDe = (item: unknown) => (item as ConIntentos).intentos ?? 0;
export const estaAgotado = (item: unknown, max = MAX_INTENTOS_COLA) => intentosDe(item) >= max;

export type ResumenVaciado = {
  enviados: number;
  descartados: number;
  /** Quedan en la cola esperando un nuevo intento (sin conexión o con fallos aún por debajo del tope). */
  pendientes: number;
  /** Alcanzaron el tope en esta pasada: ahora figuran como «No se pudo enviar». */
  agotados: number;
};

/**
 * Envía los pendientes en orden. «enviado» y «descartar» salen de la cola; «reintentar» (sin conexión) detiene el proceso y
 * conserva el resto sin contar intento; «fallo» suma un intento (`marcarFallo`) y sigue con el siguiente. Los ya agotados
 * (`estaAgotado`) no se reenvían: esperan a que el profesor los descarte.
 */
export async function vaciarCola<T>(
  items: T[],
  enviar: (item: T) => Promise<ResultadoEnvio>,
  quitar: (item: T) => Promise<void>,
  marcarFallo: (item: T, intentos: number) => Promise<void> = async () => {},
  max = MAX_INTENTOS_COLA,
): Promise<ResumenVaciado> {
  let enviados = 0;
  let descartados = 0;
  let agotados = 0;
  let conservados = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (estaAgotado(item, max)) continue;
    const r = await enviar(item);
    if (r === "reintentar") {
      const restantes = items.slice(i).filter((x) => !estaAgotado(x, max)).length;
      return { enviados, descartados, pendientes: conservados + restantes, agotados };
    }
    if (r === "fallo") {
      const intentos = intentosDe(item) + 1;
      await marcarFallo(item, intentos);
      if (intentos >= max) agotados++;
      else conservados++;
      continue;
    }
    await quitar(item);
    if (r === "enviado") enviados++;
    else descartados++;
  }
  return { enviados, descartados, pendientes: conservados, agotados };
}

/** Un fallo de red del navegador (sin conexión, servidor inalcanzable) al llamar a una acción del servidor. */
export function esErrorDeRed(error: unknown, enLinea: boolean): boolean {
  return !enLinea || error instanceof TypeError;
}
