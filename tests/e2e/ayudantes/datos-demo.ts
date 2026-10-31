// Ayudantes para los e2e que usan los datos del seed (Nuevo Horizonte): fechas relativas a hoy y limpieza de lo que crean.
import { esDiaHabil } from "../../../src/lib/dias-habiles";
import { sql } from "./colegio-temporal";

/** «AAAA-MM-DD» de hoy en Lima. */
export const hoyLima = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());

const sumar = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** El n-ésimo día hábil (sin fines de semana ni feriados) anterior a hoy. El seed tiene asistencia de ~30 días hábiles. */
export function diaHabilAnterior(n: number): string {
  let f = hoyLima();
  for (let i = 0; i < n; ) {
    f = sumar(f, -1);
    if (esDiaHabil(f)) i++;
  }
  return f;
}

/**
 * Borra la asistencia de HOY de un salón (del día y de sus cursos), con sus avisos y justificaciones: el seed no registra
 * nada hoy en primaria, así que deja el salón como venía. Úsalo en `afterAll` de los e2e que pasan lista.
 */
export async function limpiarAsistenciaDeHoy(salon: string) {
  const filtro = `select a.id from asistencias a join alumnos al on al.id = a.alumno_id join salones s on s.id = al.salon_id
    join tenants t on t.id = s.tenant_id where t.slug = 'nuevohorizonte' and s.nombre = $1 and a.fecha = $2::date`;
  await sql(`delete from avisos where asistencia_id in (${filtro})`, [salon, hoyLima()]);
  await sql(`delete from asistencias where id in (${filtro})`, [salon, hoyLima()]);
}
