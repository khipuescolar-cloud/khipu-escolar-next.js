// Días hábiles del Perú (specs/07): lunes a viernes, sin feriados nacionales. Lógica pura.
// Fechas como «AAAA-MM-DD» (día calendario, sin hora).

const MS_DIA = 86_400_000;

/** Feriados nacionales de fecha fija (MM-DD). */
const FERIADOS_FIJOS = [
  "01-01", // Año Nuevo
  "05-01", // Día del Trabajo
  "06-07", // Batalla de Arica y Día de la Bandera
  "06-29", // San Pedro y San Pablo
  "07-23", // Día de la Fuerza Aérea
  "07-28", // Fiestas Patrias
  "07-29", // Fiestas Patrias
  "08-06", // Batalla de Junín
  "08-30", // Santa Rosa de Lima
  "10-08", // Combate de Angamos
  "11-01", // Todos los Santos
  "12-08", // Inmaculada Concepción
  "12-09", // Batalla de Ayacucho
  "12-25", // Navidad
];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sumarDiasIso(fechaIso: string, dias: number): string {
  return iso(new Date(Date.parse(`${fechaIso}T00:00:00Z`) + dias * MS_DIA));
}

/** Domingo de Pascua (calendario gregoriano, algoritmo de Gauss en la versión de Meeus/Jones/Butcher). */
export function domingoDePascua(anio: number): string {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Feriados nacionales de un año (incluye Jueves y Viernes Santo), ordenados. */
export function feriadosNacionales(anio: number): string[] {
  const pascua = domingoDePascua(anio);
  return [...FERIADOS_FIJOS.map((md) => `${anio}-${md}`), sumarDiasIso(pascua, -3), sumarDiasIso(pascua, -2)].sort();
}

const cacheFeriados = new Map<number, Set<string>>();
function feriadosDelAnio(anio: number): Set<string> {
  let s = cacheFeriados.get(anio);
  if (!s) {
    s = new Set(feriadosNacionales(anio));
    cacheFeriados.set(anio, s);
  }
  return s;
}

/** true si la fecha es de lunes a viernes y no es feriado nacional ni uno de `feriadosExtra` (p. ej. días no laborables decretados). */
export function esDiaHabil(fechaIso: string, feriadosExtra: readonly string[] = []): boolean {
  const dow = new Date(`${fechaIso}T00:00:00Z`).getUTCDay();
  if (dow === 0 || dow === 6) return false;
  if (feriadosDelAnio(Number(fechaIso.slice(0, 4))).has(fechaIso)) return false;
  return !feriadosExtra.includes(fechaIso);
}

/** El n-ésimo día hábil posterior a `fechaIso` (la fecha de partida no cuenta). Con n ≤ 0 devuelve la misma fecha. */
export function sumarDiasHabiles(fechaIso: string, n: number, feriadosExtra: readonly string[] = []): string {
  let fecha = fechaIso;
  let restantes = Math.floor(n);
  while (restantes > 0) {
    fecha = sumarDiasIso(fecha, 1);
    if (esDiaHabil(fecha, feriadosExtra)) restantes--;
  }
  return fecha;
}

/** Diferencia (ms) entre la hora local de `zona` y UTC en ese instante. */
function desfaseZonaMs(instante: Date, zona: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zona, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
      .formatToParts(instante)
      .map((x) => [x.type, x.value]),
  );
  const local = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return local - Math.floor(instante.getTime() / 1000) * 1000;
}

/** Instante del fin del día (23:59:59.999) de `fechaIso` en la zona indicada. */
export function finDelDia(fechaIso: string, zona = "America/Lima"): Date {
  const comoUtc = Date.parse(`${fechaIso}T23:59:59.999Z`);
  return new Date(comoUtc - desfaseZonaMs(new Date(comoUtc), zona));
}

/**
 * Hasta cuándo se puede justificar una falta: fin del día (hora local) del n-ésimo día hábil
 * posterior al día de la falta. Por defecto, 15 días hábiles (`Tenant.plazoJustificacionDiasHabiles`).
 */
export function venceJustificacion(fechaFaltaIso: string, dias: number, zona = "America/Lima", feriadosExtra: readonly string[] = []): Date {
  return finDelDia(sumarDiasHabiles(fechaFaltaIso, dias, feriadosExtra), zona);
}
