// Tablero de dirección (specs/33): cálculo puro, sin base de datos. Compartido por servidor y pruebas.
import { lunesDeSemana } from "@/lib/fechas";
import { porcentajeAsistencia, type EstadoRegistro } from "@/lib/reportes-asistencia";
import type { Escala, Literal } from "@/lib/calificaciones";

// ───────────── Periodo del tablero ─────────────

export type PeriodoOpcion = { id: string; nombre: string; inicio: string; fin: string };
export type PeriodoTablero = {
  /** Valor del parámetro `p` de la URL: «mes», «anio» o el id del periodo académico. */
  clave: string;
  etiqueta: string;
  desde: string;
  hasta: string;
  /** Periodo académico del que salen notas y avance de registro (el elegido, o el vigente si se eligió mes/año). */
  referencia: PeriodoOpcion | null;
};

/** Periodo que contiene `fecha`; si no hay, el último que ya empezó. */
export function periodoVigente(periodos: readonly PeriodoOpcion[], fecha: string): PeriodoOpcion | null {
  const ordenados = [...periodos].sort((a, b) => a.inicio.localeCompare(b.inicio));
  return ordenados.find((p) => p.inicio <= fecha && fecha <= p.fin) ?? ordenados.filter((p) => p.inicio <= fecha).at(-1) ?? null;
}

/** Interpreta el parámetro `p`. Sin valor o desconocido: el mes actual (del 1.º a hoy). */
export function resolverPeriodo(param: string | null | undefined, hoy: string, periodos: readonly PeriodoOpcion[]): PeriodoTablero {
  const vigente = periodoVigente(periodos, hoy);
  if (param === "anio") return { clave: "anio", etiqueta: `Año ${hoy.slice(0, 4)}`, desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy, referencia: vigente };
  const elegido = param ? periodos.find((p) => p.id === param) : undefined;
  if (elegido) return { clave: elegido.id, etiqueta: elegido.nombre, desde: elegido.inicio, hasta: elegido.fin, referencia: elegido };
  return { clave: "mes", etiqueta: "Mes actual", desde: `${hoy.slice(0, 7)}-01`, hasta: hoy, referencia: vigente };
}

// ───────────── Umbral de ausentismo crónico ─────────────

export const UMBRAL_DEFECTO = 90;
export const UMBRAL_MINIMO = 50;
export const UMBRAL_MAXIMO = 99;
/** Días con registro que hacen falta para señalar a un alumno (evita marcar a quien solo tiene 1 día). */
export const MIN_DIAS_CRONICO = 3;

/** Umbral válido (entero entre 50 y 99); si no, el de por defecto. */
export function umbralValido(texto: string | null | undefined): number {
  const n = Number(texto);
  return Number.isInteger(n) && n >= UMBRAL_MINIMO && n <= UMBRAL_MAXIMO ? n : UMBRAL_DEFECTO;
}

// ───────────── Asistencia ─────────────

export type ConteoEstados = Record<EstadoRegistro, number>;
export const conteoVacio = (): ConteoEstados => ({ llego: 0, tarde: 0, falta: 0, problema: 0 });

export const registrosDe = (c: ConteoEstados) => c.llego + c.tarde + c.falta + c.problema;
/** (llegó + tarde) / días con registro, igual que los reportes de asistencia (specs/27). */
export const porcentajeDe = (c: ConteoEstados) => porcentajeAsistencia(c.llego + c.tarde, registrosDe(c));

export function sumarConteos(lista: readonly ConteoEstados[]): ConteoEstados {
  const t = conteoVacio();
  for (const c of lista) for (const e of Object.keys(t) as EstadoRegistro[]) t[e] += c[e];
  return t;
}

export type PuntoSemana = { semana: string; porcentaje: number; tardanzas: number; faltas: number; registros: number };

/** Agrupa conteos diarios por semana (lunes). Las semanas sin ningún registro (feriados, vacaciones) no salen. */
export function tendenciaSemanal(filas: readonly { fecha: string; estado: EstadoRegistro; n: number }[]): PuntoSemana[] {
  const semanas = new Map<string, ConteoEstados>();
  for (const f of filas) {
    const clave = lunesDeSemana(f.fecha);
    const c = semanas.get(clave) ?? conteoVacio();
    c[f.estado] += f.n;
    semanas.set(clave, c);
  }
  return [...semanas.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([semana, c]) => {
      const porcentaje = porcentajeDe(c);
      return porcentaje === null ? [] : [{ semana, porcentaje, tardanzas: c.tarde, faltas: c.falta, registros: registrosDe(c) }];
    });
}

export type AlumnoAsistencia = { alumnoId: string; nombre: string; salonId: string; salon: string; conteo: ConteoEstados };
export type FilaCronica = { alumnoId: string; nombre: string; salonId: string; salon: string; porcentaje: number; registros: number; faltas: number };

/** Alumnos con asistencia por debajo del umbral (estrictamente menor), de menor a mayor porcentaje. */
export function ausentismoCronico(alumnos: readonly AlumnoAsistencia[], umbral: number): FilaCronica[] {
  return alumnos
    .flatMap((a) => {
      const porcentaje = porcentajeDe(a.conteo);
      const registros = registrosDe(a.conteo);
      return porcentaje !== null && registros >= MIN_DIAS_CRONICO && porcentaje < umbral
        ? [{ alumnoId: a.alumnoId, nombre: a.nombre, salonId: a.salonId, salon: a.salon, porcentaje, registros, faltas: a.conteo.falta }]
        : [];
    })
    .sort((a, b) => a.porcentaje - b.porcentaje || a.nombre.localeCompare(b.nombre, "es"));
}

export type FilaSalonAsistencia = { salonId: string; salon: string; alumnos: number; porcentaje: number | null; tardanzas: number; faltas: number };

/** Ranking de salones por asistencia (mayor primero; sin datos al final). El porcentaje es sobre el total de registros del salón. */
export function rankingSalones(salones: readonly { salonId: string; salon: string }[], alumnos: readonly AlumnoAsistencia[]): FilaSalonAsistencia[] {
  return salones
    .map((s) => {
      const delSalon = alumnos.filter((a) => a.salonId === s.salonId);
      const total = sumarConteos(delSalon.map((a) => a.conteo));
      return { ...s, alumnos: delSalon.length, porcentaje: porcentajeDe(total), tardanzas: total.tarde, faltas: total.falta };
    })
    .sort((a, b) => (b.porcentaje ?? -1) - (a.porcentaje ?? -1) || a.salon.localeCompare(b.salon, "es"));
}

// ───────────── Rendimiento académico ─────────────

export type Nivel = Literal;
export const NIVELES: readonly Nivel[] = ["AD", "A", "B", "C"];
/** Cortes vigesimales equivalentes a AD / A / B / C (el SQL del servidor usa los mismos). */
export const CORTE_VIGESIMAL = { AD: 18, A: 14, B: 11 } as const;

/** Nivel de una calificación: el literal tal cual, o el tramo vigesimal (18–20 AD, 14–17 A, 11–13 B, 0–10 C). */
export function nivelDeValor(v: { valorLiteral: Literal | null; valorNumerico: number | null }): Nivel | null {
  if (v.valorLiteral) return v.valorLiteral;
  const n = v.valorNumerico;
  if (n === null) return null;
  return n >= CORTE_VIGESIMAL.AD ? "AD" : n >= CORTE_VIGESIMAL.A ? "A" : n >= CORTE_VIGESIMAL.B ? "B" : "C";
}

export type Distribucion = Record<Nivel, number>;
export const distribucionVacia = (): Distribucion => ({ AD: 0, A: 0, B: 0, C: 0 });
export const totalDistribucion = (d: Distribucion) => d.AD + d.A + d.B + d.C;

/** % de calificaciones en logro esperado o destacado (AD o A; en vigesimal, 14 o más). Nulo sin datos. */
export function logroEsperado(d: Distribucion): number | null {
  const t = totalDistribucion(d);
  return t === 0 ? null : Math.round(((d.AD + d.A) / t) * 1000) / 10;
}

export function sumarDistribuciones(lista: readonly Distribucion[]): Distribucion {
  const t = distribucionVacia();
  for (const d of lista) for (const n of NIVELES) t[n] += d[n];
  return t;
}

/** Texto de cada nivel según la escala del colegio. */
export function etiquetaNivel(nivel: Nivel, escala: Escala): string {
  if (escala === "vigesimal") return { AD: "18–20", A: "14–17", B: "11–13", C: "0–10" }[nivel];
  return nivel;
}

/** Una calificación que cuenta como riesgo: C o, en vigesimal, menos de 11. */
export const esRiesgo = (nivel: Nivel | null) => nivel === "C";
/** Un alumno está en riesgo si tiene C (o <11) en dos o más competencias. */
export const COMPETENCIAS_RIESGO = 2;

// ───────────── Avance de registro de notas ─────────────

export type AvanceCurso = { evaluaciones: number; alumnos: number; registradas: number; esperadas: number; porcentaje: number | null };

/** Notas registradas ÷ (evaluaciones × alumnos activos del salón), tope 100 %. Sin evaluaciones: sin dato. */
export function avanceRegistro(evaluaciones: number, alumnos: number, registradas: number): AvanceCurso {
  const esperadas = evaluaciones * alumnos;
  const porcentaje = esperadas === 0 ? null : Math.min(100, Math.round((registradas / esperadas) * 1000) / 10);
  return { evaluaciones, alumnos, registradas, esperadas, porcentaje };
}

// ───────────── Fechas en la zona del colegio ─────────────

/** Instante en que empieza el día `iso` (AAAA-MM-DD) en la zona horaria del colegio. */
export function inicioDiaEnZonaIso(iso: string, zona: string): Date {
  const medianocheUtc = new Date(`${iso}T00:00:00Z`);
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: zona, timeZoneName: "longOffset" }).formatToParts(medianocheUtc);
  const nombre = partes.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(nombre);
  const minutos = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
  return new Date(medianocheUtc.getTime() - minutos * 60_000);
}
