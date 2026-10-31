// Vista de calendario de la semana (specs/34): lógica pura para ubicar los bloques en una cuadrícula por horas.
import { lunesDeSemana, sumarDias } from "@/lib/fechas";
import { DIAS, minutos, type DiaHorario, type Intervalo } from "@/lib/horario";

/** Horas que muestra la cuadrícula: de la hora en punto antes de la primera clase a la hora en punto después de la última. */
export function horasVisibles(bloques: readonly Intervalo[]): { inicio: number; fin: number } {
  if (bloques.length === 0) return { inicio: 8 * 60, fin: 13 * 60 };
  const inicio = Math.min(...bloques.map((b) => minutos(b.horaInicio)));
  const fin = Math.max(...bloques.map((b) => minutos(b.horaFin)));
  return { inicio: Math.floor(inicio / 60) * 60, fin: Math.max(Math.ceil(fin / 60) * 60, Math.floor(inicio / 60) * 60 + 60) };
}

/**
 * Carril de cada bloque de un mismo día: los que se cruzan se reparten el ancho de la columna (como en Google Calendar);
 * los que no se cruzan con nadie ocupan todo el ancho. Devuelve { carril, carriles } por id.
 */
export function carriles<T extends Intervalo & { id: string }>(bloques: readonly T[]): Map<string, { carril: number; carriles: number }> {
  const orden = [...bloques].sort((a, b) => minutos(a.horaInicio) - minutos(b.horaInicio) || minutos(b.horaFin) - minutos(a.horaFin));
  const res = new Map<string, { carril: number; carriles: number }>();
  let grupo: { id: string; carril: number }[] = [];
  let finCarriles: number[] = [];
  const cerrar = () => {
    for (const g of grupo) res.set(g.id, { carril: g.carril, carriles: finCarriles.length });
    grupo = [];
    finCarriles = [];
  };
  for (const b of orden) {
    const inicio = minutos(b.horaInicio);
    if (finCarriles.length > 0 && finCarriles.every((f) => f <= inicio)) cerrar();
    let carril = finCarriles.findIndex((f) => f <= inicio);
    if (carril === -1) carril = finCarriles.push(0) - 1;
    finCarriles[carril] = minutos(b.horaFin);
    grupo.push({ id: b.id, carril });
  }
  cerrar();
  return res;
}

/** Colores de curso, en orden fijo; el mismo curso lleva el mismo color en todos los salones. */
export const COLORES_CURSO = ["turquesa", "indigo-cielo", "cochinilla", "maiz", "indigo"] as const;
export type ColorCurso = (typeof COLORES_CURSO)[number];

/** Asigna colores por nombre de curso en orden alfabético (estable entre semanas y salones). Sin curso («Tutoría»): null. */
export function coloresPorCurso(bloques: readonly { titulo: string; cursoId: string | null }[]): Map<string, ColorCurso> {
  const titulos = [...new Set(bloques.filter((b) => b.cursoId).map((b) => b.titulo))].sort((a, b) => a.localeCompare(b, "es"));
  return new Map(titulos.map((t, i) => [t, COLORES_CURSO[i % COLORES_CURSO.length]]));
}

/** Fechas de lunes a viernes de la semana que se muestra: la actual, o la siguiente si hoy es sábado o domingo. */
export function fechasDeLaSemana(hoyIso: string): Record<DiaHorario, string> {
  const dow = new Date(`${hoyIso}T00:00:00Z`).getUTCDay();
  const lunes = dow === 0 || dow === 6 ? sumarDias(lunesDeSemana(hoyIso), 7) : lunesDeSemana(hoyIso);
  return Object.fromEntries(DIAS.map((d) => [d, sumarDias(lunes, d - 1)])) as Record<DiaHorario, string>;
}
