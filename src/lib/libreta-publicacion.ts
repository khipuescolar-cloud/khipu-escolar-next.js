// Quién ve una libreta (specs/11). Puro: se usa en servidor y en tests.

/**
 * Fecha (AAAA-MM-DD) desde la que existe «Publicar libreta». Los periodos que terminaron antes y ya
 * estaban cerrados se consideran entregados: las familias siguen viéndolos sin que dirección los publique.
 */
export const CORTE_LIBRETA_PUBLICADA = "2026-10-27";

type PeriodoLibreta = { cerrado: boolean; libretaPublicadaAt: Date | null; fin: Date | string };

const isoDia = (f: Date | string) => (typeof f === "string" ? f.slice(0, 10) : f.toISOString().slice(0, 10));

/** Las familias ven la libreta de un periodo publicado, o de uno antiguo que ya estaba cerrado antes de esta función. */
export function libretaVisibleParaFamilia(p: PeriodoLibreta): boolean {
  if (p.libretaPublicadaAt) return true;
  return p.cerrado && isoDia(p.fin) < CORTE_LIBRETA_PUBLICADA;
}

/**
 * Se puede publicar la libreta si el periodo está cerrado o si todos los cursos tienen su cierre
 * (y hay al menos un curso).
 */
export function puedePublicarLibreta(periodoCerrado: boolean, totalCursos: number, cursosCerrados: number): boolean {
  if (periodoCerrado) return true;
  return totalCursos > 0 && cursosCerrados >= totalCursos;
}
