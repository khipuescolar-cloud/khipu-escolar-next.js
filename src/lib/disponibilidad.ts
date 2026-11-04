// Disponibilidad del personal para reuniones (specs/40), estilo «asistente de programación»: lógica pura, sin BD.
// Todos los rangos son instantes en milisegundos y semiabiertos [inicio, fin): tocarse en el borde no es cruce
// (una reunión 10:00–11:00 y otra 11:00–11:30 no chocan).
import { esDiaHabil, instanteEnZona } from "./dias-habiles";
import { momentoEnZona } from "./fechas";

export type Rango = { inicio: number; fin: number };

export type MotivoOcupado = "clase" | "reunion" | "bloqueo" | "ausencia";
export type Ocupacion = Rango & { motivo: MotivoOcupado };
export type EstadoCelda = "libre" | "ocupado" | "fuera_de_horario" | "no_lectivo";

export const MINUTO = 60_000;
export const DURACIONES = [15, 30, 45, 60, 90] as const;
export const PASO_MINUTOS = 15;
export const MAX_DIAS_RANGO = 14;

const ordenar = (xs: readonly Rango[]) => [...xs].sort((a, b) => a.inicio - b.inicio || a.fin - b.fin);

/** Une los rangos que se cruzan o se tocan; descarta los vacíos. */
export function fusionar(xs: readonly Rango[]): Rango[] {
  const salida: Rango[] = [];
  for (const r of ordenar(xs.filter((x) => x.fin > x.inicio))) {
    const ultimo = salida.at(-1);
    if (ultimo && r.inicio <= ultimo.fin) ultimo.fin = Math.max(ultimo.fin, r.fin);
    else salida.push({ inicio: r.inicio, fin: r.fin });
  }
  return salida;
}

/** `base` menos `quitar` (ambos se fusionan antes). */
export function restar(base: readonly Rango[], quitar: readonly Rango[]): Rango[] {
  const q = fusionar(quitar);
  const salida: Rango[] = [];
  for (const b of fusionar(base)) {
    let cursor = b.inicio;
    for (const x of q) {
      if (x.fin <= cursor || x.inicio >= b.fin) continue;
      if (x.inicio > cursor) salida.push({ inicio: cursor, fin: x.inicio });
      cursor = Math.max(cursor, x.fin);
      if (cursor >= b.fin) break;
    }
    if (cursor < b.fin) salida.push({ inicio: cursor, fin: b.fin });
  }
  return salida;
}

/** Intersección de dos listas de rangos. */
export function intersectar(a: readonly Rango[], b: readonly Rango[]): Rango[] {
  const fa = fusionar(a);
  const fb = fusionar(b);
  const salida: Rango[] = [];
  let i = 0;
  let j = 0;
  while (i < fa.length && j < fb.length) {
    const inicio = Math.max(fa[i].inicio, fb[j].inicio);
    const fin = Math.min(fa[i].fin, fb[j].fin);
    if (inicio < fin) salida.push({ inicio, fin });
    if (fa[i].fin < fb[j].fin) i++;
    else j++;
  }
  return salida;
}

/** Intersección de varias listas (sin listas = sin restricción: devuelve `[]`). */
export function intersectarVarios(listas: readonly (readonly Rango[])[]): Rango[] {
  if (listas.length === 0) return [];
  return listas.slice(1).reduce<Rango[]>((acc, l) => intersectar(acc, l), fusionar(listas[0]));
}

/** El rango cabe entero en alguno de los rangos libres. */
export function contiene(libres: readonly Rango[], r: Rango): boolean {
  return fusionar(libres).some((l) => l.inicio <= r.inicio && r.fin <= l.fin);
}

export function seCruzan(a: Rango, b: Rango): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}

/** Franjas de `duracionMin` que caben en los libres, con inicio alineado a `pasoMin` (en hora del reloj). */
export function franjas(libres: readonly Rango[], duracionMin: number, pasoMin = PASO_MINUTOS): Rango[] {
  const dur = duracionMin * MINUTO;
  const paso = pasoMin * MINUTO;
  const salida: Rango[] = [];
  for (const l of fusionar(libres)) {
    for (let t = Math.ceil(l.inicio / paso) * paso; t + dur <= l.fin; t += paso) salida.push({ inicio: t, fin: t + dur });
  }
  return salida;
}

/** Fechas AAAA-MM-DD de `desde` a `hasta` (inclusive). */
export function fechasEntre(desde: string, hasta: string): string[] {
  const salida: string[] = [];
  for (let t = Date.parse(`${desde}T00:00:00Z`); t <= Date.parse(`${hasta}T00:00:00Z`); t += 86_400_000) {
    salida.push(new Date(t).toISOString().slice(0, 10));
  }
  return salida;
}

/** Día lectivo: lunes a viernes, sin feriado nacional ni ninguno de `noLectivos` (feriados del colegio, región, agenda). */
export function esLectivo(fecha: string, noLectivos: readonly string[]): boolean {
  return esDiaHabil(fecha, noLectivos);
}

/** Ventanas laborales (en la zona del colegio) de los días lectivos de `fechas`. */
export function ventanasLaborales(d: { fechas: readonly string[]; horaInicio: string; horaFin: string; zona: string; noLectivos: readonly string[] }): Rango[] {
  return d.fechas
    .filter((f) => esLectivo(f, d.noLectivos))
    .map((f) => ({ inicio: instanteEnZona(f, d.horaInicio, d.zona).getTime(), fin: instanteEnZona(f, d.horaFin, d.zona).getTime() }))
    .filter((r) => r.fin > r.inicio);
}

/** Días completos no lectivos de `fechas`, como rangos (para marcar la cuadrícula). */
export function rangosNoLectivos(fechas: readonly string[], noLectivos: readonly string[], zona: string): Rango[] {
  return fechas
    .filter((f) => !esLectivo(f, noLectivos))
    .map((f) => ({ inicio: instanteEnZona(f, "00:00", zona).getTime(), fin: instanteEnZona(sumarUnDia(f), "00:00", zona).getTime() }));
}

function sumarUnDia(f: string): string {
  return new Date(Date.parse(`${f}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

/** Estado de una celda para una persona: no lectivo > fuera de horario > ocupado > libre. */
export function estadoCelda(celda: Rango, d: { laboral: readonly Rango[]; noLectivo: readonly Rango[]; ocupado: readonly Rango[] }): EstadoCelda {
  if (d.noLectivo.some((n) => seCruzan(n, celda))) return "no_lectivo";
  if (!contiene(d.laboral, celda)) return "fuera_de_horario";
  if (d.ocupado.some((o) => seCruzan(o, celda))) return "ocupado";
  return "libre";
}

export type PersonaParaCalculo = { id: string; requerido: boolean; ocupado: readonly Rango[] };

export type Alternativa = Rango & { opcionalesLibres: number };

export type ResultadoDisponibilidad = {
  /** Libre de cada persona dentro de la ventana laboral. */
  libres: Map<string, Rango[]>;
  /** Tiempo libre común a todos los requeridos. */
  coincidencias: Rango[];
  /** La franja preferida cabe en las coincidencias. */
  preferidaLibre: boolean;
  /** Hasta `maxAlternativas` franjas libres para todos los requeridos, cercanas a la preferida (sin la preferida). */
  alternativas: Alternativa[];
};

/**
 * Algoritmo del asistente: ventana = horas laborales (iguales para todo el personal del colegio); libre de cada persona =
 * ventana − ocupado; coincidencias = intersección de los requeridos; franjas de la duración pedida cada 15 minutos.
 * Alternativas ordenadas por cercanía a la hora preferida y, a igual distancia, por más opcionales libres.
 */
export function calcularDisponibilidad(d: {
  personas: readonly PersonaParaCalculo[];
  ventana: readonly Rango[];
  duracionMin: number;
  preferida: Rango;
  /** No se proponen franjas que empiecen antes (p. ej. ahora). */
  noAntesDe?: number;
  maxAlternativas?: number;
  pasoMin?: number;
  /**
   * Alternativas «distintas» (calendario del asistente): no se cruzan entre sí, primero una por día y luego hasta `maxPorDia` por día
   * (`claveDia` da el día de un instante en la zona del colegio). Sin esta opción, son las más cercanas cada 15 min.
   */
  distintas?: { claveDia: (inicio: number) => string; maxPorDia: number };
}): ResultadoDisponibilidad {
  const libres = new Map<string, Rango[]>();
  for (const p of d.personas) libres.set(p.id, restar(d.ventana, p.ocupado));
  const requeridos = d.personas.filter((p) => p.requerido).map((p) => libres.get(p.id)!);
  const coincidencias = requeridos.length > 0 ? intersectarVarios(requeridos) : fusionar(d.ventana);
  const opcionales = d.personas.filter((p) => !p.requerido).map((p) => libres.get(p.id)!);
  const noAntes = d.noAntesDe ?? -Infinity;
  const candidatas = franjas(coincidencias, d.duracionMin, d.pasoMin).filter((f) => f.inicio >= noAntes);
  const max = d.maxAlternativas ?? 5;
  const ordenadas = candidatas
    .filter((f) => f.inicio !== d.preferida.inicio)
    .map((f) => ({ ...f, opcionalesLibres: opcionales.filter((l) => contiene(l, f)).length }))
    .sort((a, b) => Math.abs(a.inicio - d.preferida.inicio) - Math.abs(b.inicio - d.preferida.inicio) || b.opcionalesLibres - a.opcionalesLibres || a.inicio - b.inicio);
  let elegidas: Alternativa[];
  if (d.distintas) {
    const { claveDia, maxPorDia } = d.distintas;
    const porDia = new Map<string, number>();
    elegidas = [];
    // Primero una por día (repartidas en la semana); si faltan, se completa hasta `maxPorDia` por día.
    for (let tope = 1; tope <= maxPorDia; tope++) {
      for (const f of ordenadas) {
        if (elegidas.length >= max) break;
        const dia = claveDia(f.inicio);
        if ((porDia.get(dia) ?? 0) >= tope || elegidas.some((e) => seCruzan(e, f))) continue;
        porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
        elegidas.push(f);
      }
    }
  } else {
    elegidas = ordenadas.slice(0, max);
  }
  const alternativas = elegidas.sort((a, b) => a.inicio - b.inicio);
  return { libres, coincidencias, preferidaLibre: contiene(coincidencias, d.preferida) && d.preferida.inicio >= noAntes, alternativas };
}

/** Celdas de la cuadrícula de un día: desde la hora en punto antes del inicio laboral (o 07:00) hasta la de después del fin (o 18:00). */
export function celdasDelDia(fecha: string, d: { horaInicio: string; horaFin: string; zona: string; pasoMin?: number }): Rango[] {
  const h = (s: string) => Number(s.slice(0, 2));
  const desde = Math.min(7, h(d.horaInicio));
  const hasta = Math.max(18, h(d.horaFin) + (d.horaFin.endsWith(":00") ? 0 : 1));
  const inicio = instanteEnZona(fecha, `${String(desde).padStart(2, "0")}:00`, d.zona).getTime();
  const paso = (d.pasoMin ?? 30) * MINUTO;
  const salida: Rango[] = [];
  for (let t = inicio; t < inicio + (hasta - desde) * 60 * MINUTO; t += paso) salida.push({ inicio: t, fin: t + paso });
  return salida;
}

/** Texto que ve un tercero sobre la ocupación de otra persona (privacidad, specs/40). */
export function etiquetaParaTercero(motivo: MotivoOcupado, veClases: boolean): string {
  return motivo === "clase" && veClases ? "Clase" : "Ocupado";
}

/** Ocupación de una persona tal como la ve quien consulta (etiqueta ya filtrada por privacidad). */
export type OcupacionVista = Rango & { etiqueta: string; esClase: boolean };
/** Tramo ocupado de un día, en hora del colegio («24:00» = medianoche del día siguiente). */
export type BloqueDia = { fecha: string; desde: string; hasta: string; etiqueta: string; esClase: boolean };

/**
 * Tramos ocupados por día para el calendario del asistente: recorta cada ocupación a los días de `fechas` (en `zona`) y
 * une los tramos seguidos o cruzados con la misma etiqueta (para un tercero, varias reuniones seguidas se ven como un
 * solo «Ocupado»).
 */
export function bloquesPorDia(ocupado: readonly OcupacionVista[], fechas: readonly string[], zona: string): BloqueDia[] {
  const salida: BloqueDia[] = [];
  for (const f of fechas) {
    const ini = instanteEnZona(f, "00:00", zona).getTime();
    const fin = instanteEnZona(sumarUnDia(f), "00:00", zona).getTime();
    const delDia = ocupado
      .map((o) => ({ ...o, inicio: Math.max(o.inicio, ini), fin: Math.min(o.fin, fin) }))
      .filter((o) => o.fin > o.inicio)
      .sort((a, b) => a.inicio - b.inicio || a.fin - b.fin);
    const unidos: OcupacionVista[] = [];
    for (const o of delDia) {
      const previo = [...unidos].reverse().find((u) => u.etiqueta === o.etiqueta);
      if (previo && o.inicio <= previo.fin) previo.fin = Math.max(previo.fin, o.fin);
      else unidos.push({ ...o });
    }
    const hora = (t: number) => (t >= fin ? "24:00" : momentoEnZona(new Date(t), zona).hora);
    for (const u of unidos) salida.push({ fecha: f, desde: hora(u.inicio), hasta: hora(u.fin), etiqueta: u.etiqueta, esClase: u.esClase });
  }
  return salida;
}
