// Calificación del periodo (specs/47): reglas puras de disponibilidad y de completitud. Sin promedios ni fórmulas:
// la calificación de cada competencia la decide el docente.
import { requiereConclusion, type Literal } from "./calificaciones";

/** «AAAA-MM-DD» de un instante en la zona del colegio. */
export function hoyEnZona(zona: string, ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

/** El periodo terminó cuando su último día es hoy o ya pasó (en la zona del colegio). */
export function periodoTerminado(finIso: string, hoyIso: string): boolean {
  return finIso.slice(0, 10) <= hoyIso;
}

/** «dd/mm» de una fecha ISO. */
export function ddmm(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

export type CeldaPeriodo = { valor: string; conclusion: string };
export type Faltante = { alumnoId: string; alumno: string; competenciaId: string; competencia: string; falta: "calificacion" | "conclusion" };

/** Qué falta para poder enviar: calificación en todas las competencias activas y conclusión en B y C. */
export function faltantesDelPeriodo(
  alumnos: { id: string; nombre: string }[],
  competencias: { id: string; nombre: string }[],
  celdas: Record<string, CeldaPeriodo | undefined>,
  escala: "literal" | "vigesimal",
): Faltante[] {
  const faltan: Faltante[] = [];
  for (const a of alumnos) {
    for (const c of competencias) {
      const celda = celdas[`${a.id}:${c.id}`];
      const base = { alumnoId: a.id, alumno: a.nombre, competenciaId: c.id, competencia: c.nombre };
      if (!celda || celda.valor.trim() === "") faltan.push({ ...base, falta: "calificacion" });
      else if (escala === "literal" && requiereConclusion(celda.valor.trim().toUpperCase() as Literal) && celda.conclusion.trim() === "") faltan.push({ ...base, falta: "conclusion" });
    }
  }
  return faltan;
}

export const TEXTO_FALTA: Record<Faltante["falta"], string> = { calificacion: "calificación", conclusion: "conclusión (obligatoria en B y C)" };
