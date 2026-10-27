// Fechas en America/Lima (UTC−5, sin horario de verano). Funciones puras para tareas y agenda.

export const ZONA_LIMA = "America/Lima";
const MS_DIA = 86_400_000;

/** «AAAA-MM-DD» de un instante, según la hora de Lima. */
export function fechaLima(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_LIMA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Instante en que empieza ese día (hora Lima). */
export function inicioDiaLima(iso: string): Date {
  return new Date(`${iso}T00:00:00-05:00`);
}

/** Instante de una fecha y hora «HH:mm» de Lima. */
export function instanteLima(iso: string, hora = "08:00"): Date {
  return new Date(`${iso}T${hora}:00-05:00`);
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(d.getTime() + dias * MS_DIA).toISOString().slice(0, 10);
}

/** Días calendario entre dos fechas ISO (b − a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / MS_DIA);
}

export type GrupoEntrega = "vencida" | "manana" | "semana" | "despues";

export const NOMBRE_GRUPO: Record<Exclude<GrupoEntrega, "vencida">, string> = {
  manana: "Para mañana",
  semana: "Esta semana",
  despues: "Más adelante",
};

/** Agrupa una entrega: hoy y mañana → «Para mañana»; hasta 7 días → «Esta semana»; el resto → «Más adelante». */
export function grupoEntrega(fechaEntrega: Date, ahora: Date = new Date()): GrupoEntrega {
  const dif = diasEntre(fechaLima(ahora), fechaLima(fechaEntrega));
  if (dif < 0) return "vencida";
  if (dif <= 1) return "manana";
  if (dif <= 7) return "semana";
  return "despues";
}

/** Lunes de la semana que contiene la fecha. */
export function lunesDeSemana(iso: string): string {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return sumarDias(iso, -((dow + 6) % 7));
}

export function diasDeSemana(iso: string): string[] {
  const lunes = lunesDeSemana(iso);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/** Cuadrícula del mes: semanas (lunes a domingo) con fechas ISO; incluye días de meses vecinos. */
export function cuadriculaMes(anio: number, mes: number): string[][] {
  const primero = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const ultimo = new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
  const semanas: string[][] = [];
  for (let lunes = lunesDeSemana(primero); lunes <= ultimo; lunes = sumarDias(lunes, 7)) {
    semanas.push(Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)));
  }
  return semanas;
}

export function esFechaIso(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function formatoDia(d: Date | string, opciones: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }): string {
  const fecha = typeof d === "string" ? new Date(`${d}T12:00:00-05:00`) : d;
  return new Intl.DateTimeFormat("es-PE", { timeZone: ZONA_LIMA, ...opciones }).format(fecha);
}

export function formatoHora(d: Date): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: ZONA_LIMA, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

/** Fecha de una columna @db.Date (guardada a medianoche UTC) como «AAAA-MM-DD». */
export function fechaDeColumnaDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
