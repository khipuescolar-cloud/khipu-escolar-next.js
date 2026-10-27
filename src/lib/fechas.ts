// Fechas y horas en la zona del colegio (America/Lima por defecto). Sin dependencias de servidor.

export type MomentoLocal = {
  /** AAAA-MM-DD en la zona del colegio. */
  isoFecha: string;
  /** HH:mm (24 h) en la zona del colegio. */
  hora: string;
};

/** Fecha y hora locales del colegio para un instante dado. */
export function momentoEnZona(instante: Date, zonaHoraria = "America/Lima"): MomentoLocal {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: zonaHoraria,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instante);
  const p = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((x) => x.type === tipo)?.value ?? "00";
  return { isoFecha: `${p("year")}-${p("month")}-${p("day")}`, hora: `${p("hour")}:${p("minute")}` };
}

/** Valor para columnas `@db.Date` (medianoche UTC de la fecha local). */
export function fechaDb(isoFecha: string): Date {
  return new Date(`${isoFecha}T00:00:00.000Z`);
}

/** AAAA-MM-DD de una columna `@db.Date`. */
export function isoDeFechaDb(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Resta días a una fecha AAAA-MM-DD. */
export function restarDias(isoFecha: string, dias: number): string {
  const d = fechaDb(isoFecha);
  d.setUTCDate(d.getUTCDate() - dias);
  return isoDeFechaDb(d);
}

/** "07:52" → "7:52 a. m."; "13:05" → "1:05 p. m." (formato usado en los avisos). */
export function hora12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

/** Compara horas HH:mm: true si `hora` es igual o posterior a `limite`. */
export function esHoraIgualOPosterior(hora: string, limite: string): boolean {
  return hora >= limite;
}

/** "2026-10-26" → "lunes 26 de octubre". */
export function fechaLarga(isoFecha: string): string {
  return new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    fechaDb(isoFecha),
  );
}

/** "2026-10-26" → "26/10/2026". */
export function fechaCorta(isoFecha: string): string {
  const [a, m, d] = isoFecha.split("-");
  return `${d}/${m}/${a}`;
}
