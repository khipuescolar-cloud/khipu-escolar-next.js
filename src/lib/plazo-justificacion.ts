// Plazo del reglamento para justificar una falta (specs/07). Lógica pura.

export const PLAZO_JUSTIFICACION_DEFECTO_HORAS = 48;
export const PLAZO_JUSTIFICACION_MIN_HORAS = 24;
export const PLAZO_JUSTIFICACION_MAX_HORAS = 168;

export const MENSAJE_PLAZO_VENCIDO = "El plazo para justificar venció. Escribe a la tutora.";

/** Horas válidas (entero entre 24 y 168); si no, el valor por defecto. */
export function normalizarPlazoHoras(horas: number | null | undefined): number {
  if (typeof horas !== "number" || !Number.isInteger(horas)) return PLAZO_JUSTIFICACION_DEFECTO_HORAS;
  if (horas < PLAZO_JUSTIFICACION_MIN_HORAS || horas > PLAZO_JUSTIFICACION_MAX_HORAS) return PLAZO_JUSTIFICACION_DEFECTO_HORAS;
  return horas;
}

/** Momento en que vence el enlace de justificar creado en `ahora`. */
export function expiracionJustificacion(ahora: Date, horas: number | null | undefined): Date {
  return new Date(ahora.getTime() + normalizarPlazoHoras(horas) * 3_600_000);
}
