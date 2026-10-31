// Control de ingreso automático (specs/05). Lógica pura: la usan el cron, los avisos y las pruebas.
import { esHoraIgualOPosterior } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";

/**
 * Qué toca hacer con los alumnos sin ingreso según la hora del colegio:
 * - antes de la hora de tardanza: nada;
 * - desde la hora de tardanza: avisar «aún no llega» (una vez al día);
 * - desde la hora límite de falta: poner falta del día y avisar con enlace para justificar.
 * Si el cron no corrió entre ambas horas, se salta directo a la falta (no se manda «aún no llega» tarde).
 */
export function faseControlIngreso(hora: string, horaTardanza: string, horaFalta: string): "antes" | "no_llega" | "falta" {
  if (esHoraIgualOPosterior(hora, horaFalta)) return "falta";
  if (esHoraIgualOPosterior(hora, horaTardanza)) return "no_llega";
  return "antes";
}

/** La hora de falta debe ser posterior a la de tardanza. */
export function horasControlValidas(horaTardanza: string, horaFalta: string): boolean {
  return !esHoraIgualOPosterior(horaTardanza, horaFalta);
}

/** «Buenos días, Rosa.» / «Buenas tardes, Rosa.» según la hora del colegio (HH:mm). Sin nombre, solo el saludo. */
export function saludoFamilia(nombre: string | null | undefined, hora: string): string {
  const h = Number(hora.slice(0, 2));
  const momento = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  const n = nombre ? primerNombre(nombre) : "";
  return n ? `${momento}, ${n}.` : `${momento}.`;
}
