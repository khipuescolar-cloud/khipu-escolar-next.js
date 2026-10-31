// Horario semanal por salón (specs/34). Archivo compartido cliente/servidor: solo datos y funciones puras
// (bloque actual y siguiente, cruces de profesores, validación de las horas del día y horas sugeridas por nivel).
import type { Nivel, TipoHoraHorario } from "@/generated/prisma/enums";

/** Días del horario: 1 = lunes … 5 = viernes. */
export const DIAS = [1, 2, 3, 4, 5] as const;
export type DiaHorario = (typeof DIAS)[number];

export const NOMBRE_DIA: Record<DiaHorario, string> = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes" };
export const NOMBRE_DIA_CORTO: Record<DiaHorario, string> = { 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie" };

export function esDiaHorario(n: number): n is DiaHorario {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

/** Día de la semana de una fecha AAAA-MM-DD: 1 = lunes … 7 = domingo. */
export function diaDeSemana(isoFecha: string): number {
  const dow = new Date(`${isoFecha}T00:00:00Z`).getUTCDay();
  return dow === 0 ? 7 : dow;
}

/** Día que se muestra por defecto: hoy si es de lunes a viernes; el fin de semana, el lunes. */
export function diaPorDefecto(isoFecha: string): DiaHorario {
  const d = diaDeSemana(isoFecha);
  return esDiaHorario(d) ? d : 1;
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
export function esHora(s: string): boolean {
  return HORA.test(s);
}

/** Minutos desde la medianoche de «HH:mm». */
export function minutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export type Intervalo = { horaInicio: string; horaFin: string };

/** Dos intervalos [inicio, fin) se cruzan (tocarse en el borde no es cruce: 08:45–09:30 y 09:30–10:15 no chocan). */
export function seSolapan(a: Intervalo, b: Intervalo): boolean {
  return minutos(a.horaInicio) < minutos(b.horaFin) && minutos(b.horaInicio) < minutos(a.horaFin);
}

/** Etiqueta «08:00–08:45». */
export function rango(p: Intervalo): string {
  return `${p.horaInicio}–${p.horaFin}`;
}

// ───────────── Horas del día por nivel ─────────────

export type PeriodoEntrada = { nombre: string; horaInicio: string; horaFin: string; tipo: TipoHoraHorario };

type Tramo = [string, string, TipoHoraHorario];

function armar(tramos: Tramo[]): PeriodoEntrada[] {
  let n = 0;
  return tramos.map(([horaInicio, horaFin, tipo]) => ({ nombre: tipo === "recreo" ? "Recreo" : `${++n}.ª hora`, horaInicio, horaFin, tipo }));
}

const SECUNDARIA: Tramo[] = [
  ["08:00", "08:45", "clase"], ["08:45", "09:30", "clase"], ["09:30", "10:15", "clase"], ["10:15", "10:35", "recreo"],
  ["10:35", "11:20", "clase"], ["11:20", "12:05", "clase"], ["12:05", "12:50", "clase"], ["12:50", "13:35", "clase"],
];

/**
 * Horas sugeridas por nivel (la dirección las ajusta en «Horas del día»): inicial con jornada corta y periodos de 40
 * minutos; primaria y secundaria con periodos de 45 minutos y recreo a media mañana.
 */
export const PERIODOS_SUGERIDOS: Record<Nivel, PeriodoEntrada[]> = {
  inicial: armar([
    ["08:00", "08:40", "clase"], ["08:40", "09:20", "clase"], ["09:20", "09:50", "recreo"], ["09:50", "10:30", "clase"], ["10:30", "11:10", "clase"],
    ["11:10", "11:50", "clase"],
  ]),
  primaria: armar([
    ["08:00", "08:45", "clase"], ["08:45", "09:30", "clase"], ["09:30", "10:15", "clase"], ["10:15", "10:45", "recreo"],
    ["10:45", "11:30", "clase"], ["11:30", "12:15", "clase"], ["12:15", "13:00", "clase"],
  ]),
  secundaria: armar(SECUNDARIA),
  academia: armar(SECUNDARIA),
};

/** Valida las horas del día de un nivel: horas válidas, inicio antes del fin, nombre, sin cruces. Devuelve el error o null. */
export function validarPeriodos(periodos: PeriodoEntrada[]): string | null {
  if (periodos.length === 0) return "Agrega al menos una hora.";
  if (periodos.length > 16) return "Como máximo 16 horas por día.";
  for (const p of periodos) {
    if (!p.nombre.trim()) return "Ponle nombre a cada hora (por ejemplo «1.ª hora» o «Recreo»).";
    if (!esHora(p.horaInicio) || !esHora(p.horaFin)) return `Revisa las horas de «${p.nombre}»: usa el formato 08:00.`;
    if (minutos(p.horaInicio) >= minutos(p.horaFin)) return `En «${p.nombre}» la hora de inicio debe ser antes que la de fin.`;
  }
  const orden = ordenarPorHora(periodos);
  for (let i = 1; i < orden.length; i++) {
    if (seSolapan(orden[i - 1], orden[i])) return `«${orden[i - 1].nombre}» (${rango(orden[i - 1])}) y «${orden[i].nombre}» (${rango(orden[i])}) se cruzan.`;
  }
  return null;
}

export function ordenarPorHora<T extends Intervalo>(lista: readonly T[]): T[] {
  return [...lista].sort((a, b) => minutos(a.horaInicio) - minutos(b.horaInicio) || minutos(a.horaFin) - minutos(b.horaFin));
}

// ───────────── Cruces de profesores ─────────────

/** Bloque ocupado por un profesor (para detectar cruces entre salones). */
export type OcupacionProfesor = Intervalo & { id?: string; profesorId: string; dia: number; salonId: string; salonNombre: string; titulo: string };

/**
 * Primer bloque que ya ocupa al profesor ese día a una hora que se cruza con la nueva. Ignora el mismo casillero
 * (`ignorarId`) para poder reemplazar un bloque por otro. null si el profesor está libre.
 */
export function buscarCruce(
  nuevo: Intervalo & { profesorId: string; dia: number },
  ocupados: readonly OcupacionProfesor[],
  ignorarId?: string,
): OcupacionProfesor | null {
  return ocupados.find((o) => (ignorarId === undefined || o.id !== ignorarId) && o.profesorId === nuevo.profesorId && o.dia === nuevo.dia && seSolapan(o, nuevo)) ?? null;
}

/** Mensaje claro cuando un profesor ya tiene clase a esa hora en otro salón. */
export function mensajeCruce(nombreProfesor: string, cruce: OcupacionProfesor): string {
  const dia = esDiaHorario(cruce.dia) ? NOMBRE_DIA[cruce.dia].toLowerCase() : "ese día";
  return `${nombreProfesor} ya tiene ${cruce.titulo} en ${cruce.salonNombre} el ${dia} de ${rango(cruce)}. Elige otra hora u otro curso.`;
}

/** Todos los pares de bloques de un mismo profesor que se cruzan (para la vista de carga docente). */
export function crucesDe<T extends OcupacionProfesor>(bloques: readonly T[]): [T, T][] {
  const pares: [T, T][] = [];
  for (let i = 0; i < bloques.length; i++) {
    for (let j = i + 1; j < bloques.length; j++) {
      const a = bloques[i];
      const b = bloques[j];
      if (a.profesorId === b.profesorId && a.dia === b.dia && seSolapan(a, b)) pares.push([a, b]);
    }
  }
  return pares;
}

// ───────────── Ahora y después ─────────────

/** Bloque de clase o actividad del día con sus horas. */
export type BloqueDelDia = Intervalo & { titulo: string };

/**
 * Bloque en curso (`ahora`) y el siguiente que empieza más tarde ese día (`despues`), según la hora «HH:mm» del colegio.
 * `bloques` puede venir desordenado.
 */
export function ahoraYDespues<T extends BloqueDelDia>(bloques: readonly T[], hora: string): { ahora: T | null; despues: T | null } {
  const m = minutos(hora);
  const orden = ordenarPorHora(bloques);
  const ahora = orden.find((b) => minutos(b.horaInicio) <= m && m < minutos(b.horaFin)) ?? null;
  const despues = orden.find((b) => minutos(b.horaInicio) > m) ?? null;
  return { ahora, despues };
}

/** «Ahora: Matemática · 3.° B hasta las 10:30» / «Después: Ciencia · 3.° B a las 10:30». */
export function textoAhora(b: BloqueDelDia, lugar?: string): string {
  return `${b.titulo}${lugar ? ` · ${lugar}` : ""} hasta las ${b.horaFin}`;
}
export function textoDespues(b: BloqueDelDia, lugar?: string): string {
  return `${b.titulo}${lugar ? ` · ${lugar}` : ""} a las ${b.horaInicio}`;
}
