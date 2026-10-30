// Desde qué grado un alumno puede tener cuenta propia (specs/10). Lógica pura, compartida cliente/servidor.
import type { Nivel } from "@/generated/prisma/enums";

export const GRADO_MINIMO_CUENTA_ALUMNO_DEFECTO = 5;

/**
 * Motivo por el que el alumno NO puede tener cuenta propia, o `null` si puede.
 * Inicial nunca; secundaria (y academia) siempre; primaria desde `gradoMinimo` (1–6).
 * Si el salón de primaria no tiene grado registrado, no se bloquea (no se puede saber).
 */
export function motivoSinCuentaPorGrado(nivel: Nivel, grado: number | null, gradoMinimo: number): string | null {
  if (nivel === "inicial") return "En inicial el alumno no tiene cuenta propia.";
  if (nivel === "primaria" && grado !== null && grado < gradoMinimo) {
    return `Este colegio da cuenta propia desde ${gradoMinimo}.° de primaria.`;
  }
  return null;
}
