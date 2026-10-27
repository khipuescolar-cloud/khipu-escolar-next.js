// Constructor de iCalendar (RFC 5545). Puro: sin red ni BD. Fechas en UTC (sin VTIMEZONE).

export type EventoIcs = {
  /** Identificador estable: `<id>@khipuescolar`. */
  uid: string;
  titulo: string;
  descripcion?: string | null;
  lugar?: string | null;
  inicio: Date;
  /** Evento de día completo (p. ej. entrega de tarea): usa `inicio` en hora de Lima. */
  diaCompleto?: boolean;
  /** Duración en minutos para eventos con hora (por defecto 60). */
  duracionMin?: number;
};

const CRLF = "\r\n";

/** Escapa texto: `\`, `;`, `,` y saltos de línea (RFC 5545 §3.3.11). */
export function escaparTextoIcs(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

/** Corta una línea en tramos de máx. 75 octetos UTF-8; las continuaciones empiezan con un espacio. Sin cortar caracteres. */
export function plegarLineaIcs(linea: string): string[] {
  const partes: string[] = [];
  let actual = "";
  let octetos = 0;
  for (const car of linea) {
    const n = Buffer.byteLength(car, "utf8");
    const limite = partes.length === 0 ? 75 : 74; // el espacio inicial de la continuación cuenta
    if (octetos + n > limite) {
      partes.push(actual);
      actual = "";
      octetos = 0;
    }
    actual += car;
    octetos += n;
  }
  partes.push(actual);
  return partes.map((p, i) => (i === 0 ? p : ` ${p}`));
}

const dos = (n: number) => String(n).padStart(2, "0");

/** `AAAAMMDDTHHMMSSZ` en UTC. */
export function fechaHoraUtcIcs(d: Date): string {
  return `${d.getUTCFullYear()}${dos(d.getUTCMonth() + 1)}${dos(d.getUTCDate())}T${dos(d.getUTCHours())}${dos(d.getUTCMinutes())}${dos(d.getUTCSeconds())}Z`;
}

/** `AAAAMMDD` del día calendario en Lima (UTC−5, sin horario de verano). */
export function fechaLimaIcs(d: Date): string {
  const lima = new Date(d.getTime() - 5 * 3_600_000);
  return `${lima.getUTCFullYear()}${dos(lima.getUTCMonth() + 1)}${dos(lima.getUTCDate())}`;
}

function diaSiguiente(yyyymmdd: string): string {
  const d = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8) + 1));
  return `${d.getUTCFullYear()}${dos(d.getUTCMonth() + 1)}${dos(d.getUTCDate())}`;
}

/** Calendario completo con CRLF y plegado de líneas. */
export function construirIcs(opciones: { nombre: string; eventos: EventoIcs[]; ahora?: Date }): string {
  const ahora = opciones.ahora ?? new Date();
  const dtstamp = fechaHoraUtcIcs(ahora);
  const lineas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Khipu Escolar//Agenda//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escaparTextoIcs(opciones.nombre)}`,
    "X-WR-TIMEZONE:America/Lima",
  ];
  for (const e of opciones.eventos) {
    lineas.push("BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${dtstamp}`);
    if (e.diaCompleto) {
      const dia = fechaLimaIcs(e.inicio);
      lineas.push(`DTSTART;VALUE=DATE:${dia}`, `DTEND;VALUE=DATE:${diaSiguiente(dia)}`);
    } else {
      lineas.push(`DTSTART:${fechaHoraUtcIcs(e.inicio)}`, `DTEND:${fechaHoraUtcIcs(new Date(e.inicio.getTime() + (e.duracionMin ?? 60) * 60_000))}`);
    }
    lineas.push(`SUMMARY:${escaparTextoIcs(e.titulo)}`);
    if (e.descripcion) lineas.push(`DESCRIPTION:${escaparTextoIcs(e.descripcion)}`);
    if (e.lugar) lineas.push(`LOCATION:${escaparTextoIcs(e.lugar)}`);
    lineas.push("END:VEVENT");
  }
  lineas.push("END:VCALENDAR");
  return lineas.flatMap(plegarLineaIcs).join(CRLF) + CRLF;
}
