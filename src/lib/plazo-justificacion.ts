// Plazo para justificar una falta (specs/07, specs/37). Lógica pura.
// Decisión del colegio piloto (2026-11-03): días CALENDARIO desde el día de la falta. La falta es el día 0, el día
// siguiente el día 1 y el día N (15 por defecto) es el último para presentar la solicitud: vence a las 23:59:59.999 de
// ese día en la zona del colegio (America/Lima por defecto). Se cuenta con fechas locales, no restando horas UTC.

import { finDelDia } from "./dias-habiles";
import { sumarDias } from "./fechas";

export const PLAZO_JUSTIFICACION_DEFECTO_DIAS = 15;
export const PLAZO_JUSTIFICACION_MIN_DIAS = 1;
export const PLAZO_JUSTIFICACION_MAX_DIAS = 30;

/** Días calendario válidos (entero entre 1 y 30); si no, el valor por defecto (15). */
export function normalizarPlazoDias(dias: number | null | undefined): number {
  if (typeof dias !== "number" || !Number.isInteger(dias)) return PLAZO_JUSTIFICACION_DEFECTO_DIAS;
  if (dias < PLAZO_JUSTIFICACION_MIN_DIAS || dias > PLAZO_JUSTIFICACION_MAX_DIAS) return PLAZO_JUSTIFICACION_DEFECTO_DIAS;
  return dias;
}

/** «El plazo para justificar venció (15 días calendario). Escribe a la tutora.» */
export function mensajePlazoVencido(dias?: number | null): string {
  const n = normalizarPlazoDias(dias);
  return `El plazo para justificar venció (${n} ${n === 1 ? "día calendario" : "días calendario"}). Escribe a la tutora.`;
}

/** Último día (AAAA-MM-DD) en que se puede justificar la falta del día `fechaFaltaIso`. */
export function ultimoDiaJustificacion(fechaFaltaIso: string, dias: number | null | undefined): string {
  return sumarDias(fechaFaltaIso, normalizarPlazoDias(dias));
}

/** Momento en que vence la justificación: fin del último día en la zona del colegio. */
export function expiracionJustificacion(fechaFaltaIso: string, dias: number | null | undefined, zona = "America/Lima"): Date {
  return finDelDia(ultimoDiaJustificacion(fechaFaltaIso, dias), zona);
}

/** ¿`momento` está dentro del plazo para justificar la falta del día `fechaFaltaIso`? (el límite es inclusivo) */
export function dentroDelPlazo(fechaFaltaIso: string, dias: number | null | undefined, momento: Date, zona = "America/Lima"): boolean {
  return momento.getTime() <= expiracionJustificacion(fechaFaltaIso, dias, zona).getTime();
}

/** «Puedes justificar hasta el vie 14 nov» */
export function textoPlazoJustificacion(fechaFaltaIso: string, dias: number | null | undefined): string {
  return textoUltimoDiaJustificacion(ultimoDiaJustificacion(fechaFaltaIso, dias));
}

/** «Puedes justificar hasta el vie 14 nov» a partir del último día ya calculado. */
export function textoUltimoDiaJustificacion(ultimo: string): string {
  const texto = new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${ultimo}T12:00:00Z`))
    .replace(/\./g, "")
    .replace(",", "");
  return `Puedes justificar hasta el ${texto}`;
}
