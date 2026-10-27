// Reglas puras de la cola de avisos (tope diario, ritmo y reintentos). Probadas en tests/unit.

/** 1 intento + 3 reintentos; después, `error`. */
export const MAX_INTENTOS = 4;

/** Espera creciente antes de cada reintento (segundos): 1 min, 5 min, 15 min. */
const ESPERAS_REINTENTO_S = [60, 300, 900];

export function esperaReintentoMs(intentosHechos: number): number {
  const i = Math.min(Math.max(intentosHechos - 1, 0), ESPERAS_REINTENTO_S.length - 1);
  return ESPERAS_REINTENTO_S[i] * 1000;
}

/** Correos que aún se pueden enviar en la ventana móvil de 24 h (global, todos los colegios). */
export function cupoDiario(enviadosUltimas24h: number, limiteDiario: number): number {
  return Math.max(0, limiteDiario - enviadosUltimas24h);
}

/** Pausa entre correos según EMAIL_RATE_PER_SECOND. */
export function pausaEntreCorreosMs(porSegundo: number): number {
  return porSegundo > 0 ? Math.ceil(1000 / porSegundo) : 1000;
}

export function leerLimites(entorno: Record<string, string | undefined> = process.env) {
  const limiteDiario = Number(entorno.EMAIL_DAILY_LIMIT ?? 2000);
  const porSegundo = Number(entorno.EMAIL_RATE_PER_SECOND ?? 1);
  return {
    limiteDiario: Number.isFinite(limiteDiario) && limiteDiario >= 0 ? limiteDiario : 2000,
    porSegundo: Number.isFinite(porSegundo) && porSegundo > 0 ? porSegundo : 1,
  };
}

/** Canales de pago (WhatsApp y SMS) tienen su propio tope diario en ventana móvil de 24 h, global. */
export type CanalDePago = "whatsapp" | "sms";
export const CANALES_DE_PAGO: readonly CanalDePago[] = ["whatsapp", "sms"];

const TOPES_POR_DEFECTO: Record<CanalDePago, number> = { whatsapp: 1000, sms: 300 };

/** WHATSAPP_DAILY_LIMIT / SMS_DAILY_LIMIT (mensajes por 24 h). */
export function limiteCanalDePago(canal: CanalDePago, entorno: Record<string, string | undefined> = process.env): number {
  const crudo = entorno[canal === "whatsapp" ? "WHATSAPP_DAILY_LIMIT" : "SMS_DAILY_LIMIT"];
  const n = crudo === undefined || crudo === "" ? NaN : Number(crudo);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : TOPES_POR_DEFECTO[canal];
}
