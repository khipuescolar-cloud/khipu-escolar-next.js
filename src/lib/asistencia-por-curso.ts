// Asistencia por curso configurable por nivel (specs/04). Lógica pura: la usan servidor, Configuración y pruebas.
import type { EstadoAsistencia, Nivel } from "@/generated/prisma/enums";

export const NIVELES: Nivel[] = ["inicial", "primaria", "secundaria", "academia"];

export const NOMBRE_NIVEL: Record<Nivel, string> = {
  inicial: "Inicial",
  primaria: "Primaria",
  secundaria: "Secundaria",
  academia: "Academia",
};

/** true si en los salones de ese nivel se pasa lista por curso. */
export function asistenciaPorCursoActiva(niveles: readonly Nivel[], nivel: Nivel): boolean {
  return niveles.includes(nivel);
}

/** Mensaje cuando un profesor (o dirección) intenta pasar o corregir una lista de curso de un nivel apagado. */
export function mensajeCursoDesactivado(nivel: Nivel): string {
  return `La asistencia por curso está desactivada para ${NOMBRE_NIVEL[nivel].toLowerCase()}. Dirección puede activarla en Configuración.`;
}

/** Niveles que se ofrecen en Configuración: inicial, primaria y secundaria siempre; academia solo si el colegio tiene salones de academia. */
export function nivelesConfigurables(tieneAcademia: boolean): Nivel[] {
  return NIVELES.filter((n) => n !== "academia" || tieneAcademia);
}

/** El alumno ingresó al colegio ese día (portería o lista del día con «Llegó» o «Tarde»). */
export function ingresoAlColegio(registroDia: { estado: EstadoAsistencia } | null | undefined): boolean {
  return registroDia?.estado === "llego" || registroDia?.estado === "tarde";
}

/**
 * ¿Se avisa a la familia este cambio de una lista? (specs/04, regla de avisos)
 * - Asistencia del día (portería / tutor): todo, pero la llegada una sola vez (no si ya estaba «Tarde» en esta lista).
 * - Lista de un curso: nunca la llegada; la tardanza y el problema siempre; la falta a clase solo si el alumno
 *   ingresó al colegio ese día (si no ingresó, la familia ya recibe «no llegó» de la asistencia del día: no se duplica).
 */
export function seAvisaCambio(datos: {
  esCurso: boolean;
  estado: EstadoAsistencia;
  anterior: EstadoAsistencia | null;
  /** Solo listas de curso: registro del ingreso al colegio de ese día. */
  ingreso?: { estado: EstadoAsistencia } | null;
}): boolean {
  if (datos.anterior === datos.estado) return false;
  if (!datos.esCurso) return !(datos.estado === "llego" && datos.anterior === "tarde");
  if (datos.estado === "llego") return false;
  if (datos.estado === "falta") return ingresoAlColegio(datos.ingreso);
  return true;
}
