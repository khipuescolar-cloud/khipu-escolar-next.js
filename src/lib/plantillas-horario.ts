// Plantillas de horario (specs/34). Lógica pura compartida cliente/servidor: arma las horas del día a partir de la
// entrada, la duración de la hora de clase, los recreos y la salida, y valida lo que escribe la dirección.
import { esHora, minutos, type Intervalo, type PeriodoEntrada } from "@/lib/horario";

export type DatosPlantilla = {
  horaEntrada: string;
  horaSalida: string;
  /** Minutos de cada hora de clase. */
  duracionClase: number;
  recreos: Intervalo[];
};

export const DURACION_MINIMA = 20;
export const DURACION_MAXIMA = 120;

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const sumarMinutos = (hora: string, min: number) => hhmm(Math.min(minutos(hora) + min, 23 * 60 + 59));

/** Primer error de la plantilla, en palabras para la dirección; null si está bien. */
export function validarPlantilla(p: DatosPlantilla): string | null {
  if (!esHora(p.horaEntrada)) return "Escribe la hora de entrada (por ejemplo 07:45).";
  if (!esHora(p.horaSalida)) return "Escribe la hora de salida (por ejemplo 13:30).";
  if (minutos(p.horaSalida) <= minutos(p.horaEntrada)) return "La salida debe ser después de la entrada.";
  if (!Number.isInteger(p.duracionClase) || p.duracionClase < DURACION_MINIMA || p.duracionClase > DURACION_MAXIMA) {
    return `Cada hora de clase debe durar entre ${DURACION_MINIMA} y ${DURACION_MAXIMA} minutos.`;
  }
  const recreos = [...p.recreos].sort((a, b) => minutos(a.horaInicio) - minutos(b.horaInicio));
  for (const [i, r] of recreos.entries()) {
    const n = recreos.length > 1 ? ` ${i + 1}` : "";
    if (!esHora(r.horaInicio) || !esHora(r.horaFin)) return `Escribe el inicio y el fin del recreo${n}.`;
    if (minutos(r.horaFin) <= minutos(r.horaInicio)) return `El recreo${n} debe terminar después de empezar.`;
    if (minutos(r.horaInicio) <= minutos(p.horaEntrada) || minutos(r.horaFin) >= minutos(p.horaSalida)) {
      return `El recreo${n} debe quedar entre la entrada y la salida.`;
    }
    if (i > 0 && minutos(r.horaInicio) < minutos(recreos[i - 1].horaFin)) return "Dos recreos se cruzan.";
  }
  if (generarPeriodos(p).periodos.every((x) => x.tipo === "recreo")) return "Con esas horas no entra ninguna hora de clase.";
  return null;
}

/**
 * Horas del día de la plantilla: llena con horas de clase de `duracionClase` cada tramo entre la entrada, los recreos y
 * la salida. Lo que no alcanza para una hora completa queda en `sobrantes` (la vista previa lo avisa).
 */
export function generarPeriodos(p: DatosPlantilla): { periodos: PeriodoEntrada[]; sobrantes: Intervalo[] } {
  const recreos = [...p.recreos].sort((a, b) => minutos(a.horaInicio) - minutos(b.horaInicio));
  const periodos: PeriodoEntrada[] = [];
  const sobrantes: Intervalo[] = [];
  const dur = Math.max(p.duracionClase, 1);
  let cursor = minutos(p.horaEntrada);
  let n = 0;
  const llenar = (hasta: number) => {
    while (cursor + dur <= hasta) {
      periodos.push({ nombre: `${++n}.ª hora`, horaInicio: hhmm(cursor), horaFin: hhmm(cursor + dur), tipo: "clase" });
      cursor += dur;
    }
    if (cursor < hasta) sobrantes.push({ horaInicio: hhmm(cursor), horaFin: hhmm(hasta) });
  };
  for (const r of recreos) {
    llenar(minutos(r.horaInicio));
    periodos.push({ nombre: recreos.length > 1 ? `Recreo ${periodos.filter((x) => x.tipo === "recreo").length + 1}` : "Recreo", horaInicio: r.horaInicio, horaFin: r.horaFin, tipo: "recreo" });
    cursor = Math.max(cursor, minutos(r.horaFin));
  }
  llenar(minutos(p.horaSalida));
  return { periodos, sobrantes };
}

/** Hora límite de falta sugerida: una hora después de la entrada. */
export const faltaSugerida = (horaEntrada: string) => (esHora(horaEntrada) ? sumarMinutos(horaEntrada, 60) : "");

/** Horas de ingreso de un salón: las de su plantilla o, sin plantilla, las de Configuración (specs/05). */
export function horasDeIngreso(
  plantilla: { horaEntrada: string; horaLimiteFalta: string } | null | undefined,
  colegio: { horaLimiteTardanza: string; horaLimiteFalta: string },
): { tardanza: string; falta: string } {
  return plantilla ? { tardanza: plantilla.horaEntrada, falta: plantilla.horaLimiteFalta } : { tardanza: colegio.horaLimiteTardanza, falta: colegio.horaLimiteFalta };
}
