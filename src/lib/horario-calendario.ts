// Vista de calendario de la semana (specs/34): lógica pura para ubicar los bloques en una cuadrícula por horas.
import { lunesDeSemana, momentoEnZona, sumarDias } from "@/lib/fechas";
import { DIAS, diaDeSemana, esDiaHorario, minutos, type DiaHorario, type Intervalo } from "@/lib/horario";

/** La cuadrícula va siempre de 7:00 a 19:00, una fila por hora. */
export const HORA_INICIO = 7 * 60;
export const HORA_FIN = 19 * 60;

/** Horas que muestra la cuadrícula: de 7:00 a 19:00; se amplía a la hora en punto si algo empieza antes o termina después. */
export function horasVisibles(intervalos: readonly Intervalo[]): { inicio: number; fin: number } {
  const inicio = Math.min(HORA_INICIO, ...intervalos.map((i) => minutos(i.horaInicio)));
  const fin = Math.max(HORA_FIN, ...intervalos.map((i) => minutos(i.horaFin)));
  return { inicio: Math.floor(inicio / 60) * 60, fin: Math.ceil(fin / 60) * 60 };
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

// ───────────── Jornada del profesor (de las plantillas de sus salones) ─────────────

export type Jornada = {
  /** La entrada más temprana y la salida más tarde de las plantillas de sus salones. */
  entrada: string;
  salida: string;
  /** Recreos de esas plantillas (sin repetir). */
  recreos: Intervalo[];
};

/** Jornada a partir de las plantillas (con sus horas) de los salones del profesor. null si ninguno tiene plantilla. */
export function jornadaDe(plantillas: readonly { horaEntrada: string; horaSalida: string; periodos: readonly (Intervalo & { tipo: string })[] }[]): Jornada | null {
  if (plantillas.length === 0) return null;
  const entrada = plantillas.reduce((m, p) => (minutos(p.horaEntrada) < minutos(m) ? p.horaEntrada : m), plantillas[0].horaEntrada);
  const salida = plantillas.reduce((m, p) => (minutos(p.horaSalida) > minutos(m) ? p.horaSalida : m), plantillas[0].horaSalida);
  const solo = (tipo: string) => {
    const vistos = new Map<string, Intervalo>();
    for (const p of plantillas) for (const x of p.periodos) if (x.tipo === tipo) vistos.set(`${x.horaInicio}-${x.horaFin}`, { horaInicio: x.horaInicio, horaFin: x.horaFin });
    return [...vistos.values()].sort((a, b) => minutos(a.horaInicio) - minutos(b.horaInicio));
  };
  return { entrada, salida, recreos: solo("recreo") };
}
