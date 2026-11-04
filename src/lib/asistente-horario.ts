// Paso «Horario» del asistente de reuniones (specs/40): cálculos puros sobre la disponibilidad que devuelve el servidor,
// en minutos del día en la zona del colegio. El servidor revalida siempre al confirmar; esto solo guía la elección.
import type { BloqueDia } from "./disponibilidad";
import { lunesDeSemana, sumarDias } from "./fechas";
import { diaDeSemana, minutos } from "./horario";

/** Encaje del bloque al mover o hacer clic (minutos). */
export const ENCAJE_MIN = 15;

export type Tramo = { desde: number; hasta: number };
export type Seleccion = { fecha: string; inicio: number };

export type PersonaHorario = { membershipId: string; nombre: string; requerido: boolean; propia: boolean; bloques: BloqueDia[] };
export type DatosHorario = {
  dias: { fecha: string; lectivo: boolean }[];
  jornada: { desde: string; hasta: string };
  hoy: { fecha: string; hora: string };
  personas: PersonaHorario[];
};

export const horaTexto = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Semana que muestra el calendario para una fecha: su lunes; el sábado y el domingo pasan al lunes siguiente. */
export function semanaDe(fecha: string): string {
  return diaDeSemana(fecha) >= 6 ? sumarDias(lunesDeSemana(fecha), 7) : lunesDeSemana(fecha);
}

/** Columnas del calendario: lunes a viernes de la semana, más el sábado o domingo si la selección cae ahí. */
export function columnasSemana(lunes: string, seleccion: Seleccion | null): string[] {
  const dias = Array.from({ length: 5 }, (_, i) => sumarDias(lunes, i));
  if (seleccion && lunesDeSemana(seleccion.fecha) === lunes && !dias.includes(seleccion.fecha)) dias.push(seleccion.fecha);
  return dias;
}

/** Horas visibles: la jornada con margen (al menos 07:00–18:00) y la selección si queda fuera. */
export function rangoVisible(jornada: { desde: string; hasta: string }, seleccion?: Tramo | null): Tramo {
  const desde = Math.min(7 * 60, Math.floor((minutos(jornada.desde) - 30) / 60) * 60, seleccion ? Math.floor(seleccion.desde / 60) * 60 : Infinity);
  const hasta = Math.max(18 * 60, Math.ceil((minutos(jornada.hasta) + 60) / 60) * 60, seleccion ? Math.ceil(seleccion.hasta / 60) * 60 : 0);
  return { desde: Math.max(0, desde), hasta: Math.min(24 * 60, hasta) };
}

export const tramoDe = (b: { desde: string; hasta: string }): Tramo => ({ desde: minutos(b.desde), hasta: b.hasta === "24:00" ? 24 * 60 : minutos(b.hasta) });

/** Une tramos que se cruzan o se tocan. */
function unir(xs: Tramo[]): Tramo[] {
  const salida: Tramo[] = [];
  for (const t of [...xs].sort((a, b) => a.desde - b.desde)) {
    const u = salida.at(-1);
    if (u && t.desde <= u.hasta) u.hasta = Math.max(u.hasta, t.hasta);
    else salida.push({ ...t });
  }
  return salida;
}

/** Tramos de la jornada de un día lectivo en que todos los requeridos están libres (para insinuarlos en verde). */
export function libresParaTodos(datos: DatosHorario, fecha: string): Tramo[] {
  if (!datos.dias.find((d) => d.fecha === fecha)?.lectivo) return [];
  const ocupado = unir(datos.personas.filter((p) => p.requerido).flatMap((p) => p.bloques.filter((b) => b.fecha === fecha).map(tramoDe)));
  const salida: Tramo[] = [];
  let cursor = minutos(datos.jornada.desde);
  const fin = minutos(datos.jornada.hasta);
  for (const o of ocupado) {
    if (o.hasta <= cursor) continue;
    if (o.desde >= fin) break;
    if (o.desde > cursor) salida.push({ desde: cursor, hasta: o.desde });
    cursor = Math.max(cursor, o.hasta);
  }
  if (cursor < fin) salida.push({ desde: cursor, hasta: fin });
  return salida;
}

export type Choque = { membershipId: string; nombre: string; etiqueta: string; esClase: boolean; requerido: boolean; propia: boolean };

export type Analisis = {
  /** La fecha de la selección está en los datos cargados (si no, no se puede evaluar). */
  conocida: boolean;
  choques: Choque[];
  choquesRequeridos: Choque[];
  /** Todos los choques de requeridos son clases (dirección y administrativo pueden forzar con motivo). */
  soloClases: boolean;
  fueraDeHorario: boolean;
  noLectivo: boolean;
  pasada: boolean;
};

/** Quién está ocupado en la franja elegida, y si cae fuera de la jornada, en día no lectivo o en el pasado. */
export function analizar(datos: DatosHorario, sel: Seleccion, duracion: number): Analisis {
  const fin = sel.inicio + duracion;
  const dia = datos.dias.find((d) => d.fecha === sel.fecha);
  const choques: Choque[] = [];
  for (const p of datos.personas) {
    const b = p.bloques.find((x) => x.fecha === sel.fecha && tramoDe(x).desde < fin && sel.inicio < tramoDe(x).hasta);
    if (b) choques.push({ membershipId: p.membershipId, nombre: p.nombre, etiqueta: b.etiqueta, esClase: b.esClase, requerido: p.requerido, propia: p.propia });
  }
  const choquesRequeridos = choques.filter((c) => c.requerido);
  const noLectivo = !!dia && !dia.lectivo;
  const ahora = minutos(datos.hoy.hora);
  return {
    conocida: !!dia,
    choques,
    choquesRequeridos,
    soloClases: choquesRequeridos.length > 0 && choquesRequeridos.every((c) => c.esClase),
    noLectivo,
    fueraDeHorario: noLectivo || sel.inicio < minutos(datos.jornada.desde) || fin > minutos(datos.jornada.hasta),
    pasada: sel.fecha < datos.hoy.fecha || (sel.fecha === datos.hoy.fecha && sel.inicio < ahora),
  };
}

/** Nombres de los opcionales ocupados en una franja (para «Libre salvo opcional X»). */
export function opcionalesOcupados(datos: DatosHorario, fecha: string, desde: number, hasta: number): string[] {
  return datos.personas
    .filter((p) => !p.requerido && p.bloques.some((b) => b.fecha === fecha && tramoDe(b).desde < hasta && desde < tramoDe(b).hasta))
    .map((p) => p.nombre);
}

/** Encaja un minuto a la grilla de 15 min dentro de [desde, hasta − duración]. */
export function encajar(min: number, duracion: number, rango: Tramo): number {
  const m = Math.round(min / ENCAJE_MIN) * ENCAJE_MIN;
  return Math.min(Math.max(m, rango.desde), rango.hasta - duracion);
}

/** Primer nombre («Rocío Pérez Díaz» → «Rocío»); «Tú» para la propia persona. */
export const nombreCorto = (p: { nombre: string; propia: boolean }) => (p.propia ? "Tú" : p.nombre.split(" ")[0]);

/** Iniciales para el avatar («Lucía García» → «LG»). */
export const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");

/** Texto «Choca con: Rocío (Clase), Pedro (Ocupado)». */
export const textoChoques = (cs: readonly Choque[]) => `Choca con: ${cs.map((c) => `${nombreCorto(c)} (${c.etiqueta})`).join(", ")}`;
