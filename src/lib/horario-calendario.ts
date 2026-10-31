// Vista de calendario de la semana (specs/34): lógica pura para ubicar los bloques en una cuadrícula por horas.
import { lunesDeSemana, momentoEnZona, sumarDias } from "@/lib/fechas";
import { DIAS, diaDeSemana, esDiaHorario, minutos, type DiaHorario, type Intervalo } from "@/lib/horario";

/** Horas que muestra la cuadrícula: de la hora en punto antes de la primera clase a la hora en punto después de la última. */
export function horasVisibles(bloques: readonly Intervalo[]): { inicio: number; fin: number } {
  if (bloques.length === 0) return { inicio: 8 * 60, fin: 13 * 60 };
  const inicio = Math.min(...bloques.map((b) => minutos(b.horaInicio)));
  const fin = Math.max(...bloques.map((b) => minutos(b.horaFin)));
  return { inicio: Math.floor(inicio / 60) * 60, fin: Math.max(Math.ceil(fin / 60) * 60, Math.floor(inicio / 60) * 60 + 60) };
}

export type Tramo = { desde: number; hasta: number; libre: boolean };

/** Alto (px) de una franja libre comprimida. */
export const ALTO_LIBRE = 32;

/**
 * Escala vertical de la cuadrícula: las horas con algo (en cualquier día) se dibujan a escala; dos o más horas seguidas
 * sin nada se comprimen en una franja «libre» de ALTO_LIBRE px (así una reunión a las 18:00 no estira la mañana).
 * `y(min)` da la posición en px y `alto` el total.
 */
export function escalaHoras(intervalos: readonly Intervalo[], pxMin: number) {
  const { inicio, fin } = horasVisibles(intervalos);
  const ocupada = (h: number) => intervalos.some((i) => minutos(i.horaInicio) < (h + 1) * 60 && minutos(i.horaFin) > h * 60);
  const tramos: Tramo[] = [];
  for (let h = inicio / 60; h < fin / 60; ) {
    let k = h;
    while (k < fin / 60 && !ocupada(k)) k++;
    if (k - h >= 2) {
      tramos.push({ desde: h * 60, hasta: k * 60, libre: true });
      h = k;
    } else {
      const ultimo = tramos.at(-1);
      if (ultimo && !ultimo.libre) ultimo.hasta = (h + 1) * 60;
      else tramos.push({ desde: h * 60, hasta: (h + 1) * 60, libre: false });
      h++;
    }
  }
  const largo = (t: Tramo) => (t.libre ? ALTO_LIBRE : (t.hasta - t.desde) * pxMin);
  const y = (min: number) => {
    let acc = 0;
    for (const t of tramos) {
      if (min <= t.hasta) return acc + (Math.max(min, t.desde) - t.desde) / (t.hasta - t.desde) * largo(t);
      acc += largo(t);
    }
    return acc;
  };
  return { inicio, fin, tramos, y, alto: tramos.reduce((s, t) => s + largo(t), 0) };
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

// ───────────── Reuniones y eventos de la agenda en la semana ─────────────

export type TipoEventoSemana = "evento" | "reunion" | "examen" | "feriado" | "actividad";

export type EventoSemana = {
  id: string;
  tipo: TipoEventoSemana;
  titulo: string;
  descripcion: string | null;
  /** Salón, «Todo el colegio» o «Reunión individual». */
  ambito: string;
  lugar: string | null;
  dia: DiaHorario;
  horaInicio: string;
  horaFin: string;
  /** Feriados y eventos sin hora (empiezan a las 00:00): van en la fila «Todo el día». */
  todoElDia: boolean;
  /** Ruta con el detalle (reuniones). */
  href?: string;
};

/** Duración que se asume cuando una reunión o evento no tiene hora de fin. */
export const DURACION_SIN_FIN = 60;

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * Ubica una reunión o un evento de la agenda en la semana del calendario, en la hora del colegio. null si cae sábado o
 * domingo (el horario es de lunes a viernes). Sin fin: dura DURACION_SIN_FIN; si el fin cae otro día, llega hasta las 23:59.
 */
export function eventoDeSemana(
  item: { id: string; tipo: TipoEventoSemana; titulo: string; descripcion: string | null; ambito: string; lugar?: string | null; inicio: Date; fin: Date | null; href?: string },
  zonaHoraria: string,
): EventoSemana | null {
  const inicio = momentoEnZona(item.inicio, zonaHoraria);
  const dia = diaDeSemana(inicio.isoFecha);
  if (!esDiaHorario(dia)) return null;
  const fin = item.fin ? momentoEnZona(item.fin, zonaHoraria) : null;
  const minInicio = minutos(inicio.hora);
  const minFin = fin ? (fin.isoFecha === inicio.isoFecha ? minutos(fin.hora) : 24 * 60 - 1) : minInicio + DURACION_SIN_FIN;
  return {
    id: item.id, tipo: item.tipo, titulo: item.titulo, descripcion: item.descripcion, ambito: item.ambito, lugar: item.lugar ?? null, dia,
    horaInicio: inicio.hora,
    horaFin: hhmm(Math.min(Math.max(minFin, minInicio + 15), 24 * 60 - 1)),
    todoElDia: item.tipo === "feriado" || inicio.hora === "00:00",
    href: item.href,
  };
}
