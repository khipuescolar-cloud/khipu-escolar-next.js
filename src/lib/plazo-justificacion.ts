// Plazo del reglamento para justificar una falta (specs/07). Lógica pura.
// Se cuenta en días hábiles (lunes a viernes, sin feriados nacionales) desde el día de la falta.

import { sumarDiasHabiles, venceJustificacion } from "./dias-habiles";

export const PLAZO_JUSTIFICACION_DEFECTO_DIAS = 15;
export const PLAZO_JUSTIFICACION_MIN_DIAS = 1;
export const PLAZO_JUSTIFICACION_MAX_DIAS = 30;

/** Días hábiles válidos (entero entre 1 y 30); si no, el valor por defecto (15). */
export function normalizarPlazoDias(dias: number | null | undefined): number {
  if (typeof dias !== "number" || !Number.isInteger(dias)) return PLAZO_JUSTIFICACION_DEFECTO_DIAS;
  if (dias < PLAZO_JUSTIFICACION_MIN_DIAS || dias > PLAZO_JUSTIFICACION_MAX_DIAS) return PLAZO_JUSTIFICACION_DEFECTO_DIAS;
  return dias;
}

/** «El plazo para justificar venció (15 días hábiles). Escribe a la tutora.» */
export function mensajePlazoVencido(dias?: number | null): string {
  const n = normalizarPlazoDias(dias);
  return `El plazo para justificar venció (${n} ${n === 1 ? "día hábil" : "días hábiles"}). Escribe a la tutora.`;
}

/** Momento en que vence la justificación de una falta del día `fechaFaltaIso` (fin del día en Lima). */
export function expiracionJustificacion(fechaFaltaIso: string, dias: number | null | undefined, zona = "America/Lima"): Date {
  return venceJustificacion(fechaFaltaIso, normalizarPlazoDias(dias), zona);
}

/** Último día (AAAA-MM-DD) en que se puede justificar. */
export function ultimoDiaJustificacion(fechaFaltaIso: string, dias: number | null | undefined): string {
  return sumarDiasHabiles(fechaFaltaIso, normalizarPlazoDias(dias));
}

/** «Puedes justificar hasta el vie 14 nov» */
export function textoPlazoJustificacion(fechaFaltaIso: string, dias: number | null | undefined): string {
  const ultimo = ultimoDiaJustificacion(fechaFaltaIso, dias);
  const texto = new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${ultimo}T12:00:00Z`))
    .replace(/\./g, "")
    .replace(",", "");
  return `Puedes justificar hasta el ${texto}`;
}
