// Reportes de asistencia (specs/27): cálculo puro, sin base de datos. Compartido por servidor y pruebas.
import { z } from "zod";
import { diasEntre, esFechaIso, sumarDias } from "@/lib/fechas";
import { esDiaHabil } from "@/lib/dias-habiles";

export type EstadoRegistro = "llego" | "tarde" | "falta" | "problema";
export type EstadoJustificacionReporte = "pendiente" | "aceptada" | "rechazada";

/** Rango máximo de un reporte: un año escolar (366 días corridos, ambos extremos incluidos). */
export const MAX_DIAS_RANGO = 366;

export type RegistroDia = {
  fecha: string; // AAAA-MM-DD
  ambito: string; // "dia" o cursoId
  hora: string; // HH:mm
  estado: EstadoRegistro;
  justificacion?: EstadoJustificacionReporte | null;
  /** Hora de salida registrada en portería (solo el ingreso al colegio). */
  horaSalida?: string | null;
};

/** Fecha real AAAA-MM-DD (rechaza 2026-02-31). */
const fechaValida = z.string().refine((s) => esFechaIso(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s, "Fecha no válida.");

export const rangoSchema = z
  .object({ desde: fechaValida, hasta: fechaValida })
  .refine((r) => r.desde <= r.hasta, { message: "La fecha «desde» no puede ser posterior a «hasta».", path: ["desde"] })
  .refine((r) => diasEntre(r.desde, r.hasta) + 1 <= MAX_DIAS_RANGO, { message: "El rango no puede pasar de un año.", path: ["hasta"] });

export type Rango = z.infer<typeof rangoSchema>;

/** Días hábiles (lunes a viernes sin feriados) del rango, ambos extremos incluidos. */
export function diasHabilesDelRango(desde: string, hasta: string, feriadosExtra: readonly string[] = []): string[] {
  const dias: string[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) if (esDiaHabil(f, feriadosExtra)) dias.push(f);
  return dias;
}

/** Registro que cuenta ese día: prevalece el del ingreso al colegio (`ambito = "dia"`); si no hay, el primero por hora. */
export function elegirRegistroDelDia<T extends { ambito: string; hora: string }>(registros: readonly T[]): T | null {
  let elegido: T | null = null;
  for (const r of registros) {
    if (!elegido || (r.ambito === "dia" && elegido.ambito !== "dia") || (elegido.ambito !== "dia" && r.ambito !== "dia" && r.hora < elegido.hora)) elegido = r;
  }
  return elegido;
}

export type ResumenAlumno = {
  diasHabiles: number;
  /** Días hábiles con al menos un registro (denominador del porcentaje). */
  diasConRegistro: number;
  diasSinRegistro: number;
  llego: number;
  tarde: number;
  falta: number;
  problema: number;
  /** Faltas con justificación aceptada. */
  faltasJustificadas: number;
  /** Faltas con una justificación enviada que la tutora o dirección aún no revisa. */
  faltasEnRevision: number;
  /** Faltas sin justificación o con la justificación rechazada. */
  faltasInjustificadas: number;
  /** Días hábiles cubiertos por un permiso de asistencia de día completo en los que no estuvo (falta o sin registro). */
  conPermiso: number;
  /** (llegó + tarde) / días con registro × 100, con un decimal; null si no hay días con registro. */
  porcentaje: number | null;
};

export type DetalleDia = {
  fecha: string; estado: EstadoRegistro | null; hora: string | null; justificada: boolean; enRevision: boolean;
  /** Hora de salida registrada en portería, si la hay. */
  horaSalida?: string | null;
  /** Día cubierto por un permiso de asistencia de día completo (specs/04). */
  conPermiso?: boolean;
};

/** Texto de la justificación de una falta en el detalle por día. */
export function textoJustificacion(d: Pick<DetalleDia, "estado" | "justificada" | "enRevision" | "conPermiso">): string {
  if (d.estado !== "falta") return "";
  if (d.conPermiso && !d.enRevision) return "Con permiso";
  return d.justificada ? "Justificada" : d.enRevision ? "En revisión" : "Sin justificar";
}

/** Porcentaje con un decimal (nulo sin base). */
export function porcentajeAsistencia(presentes: number, base: number): number | null {
  if (base <= 0) return null;
  return Math.round((presentes / base) * 1000) / 10;
}

/**
 * Resumen de un alumno. `diasHabiles` son los días hábiles ya recortados (hasta hoy en la zona del colegio).
 * Solo cuenta la **asistencia al colegio** (`ambito = "dia"`: portería o lista del día); los registros de curso se ven en
 * «Asistencia por curso» (specs/27). Los registros en fines de semana, feriados o fuera del rango no cuentan.
 * Falta justificada = justificación aceptada o falta cubierta por un permiso de asistencia de día completo (specs/04);
 * en revisión = pendiente; sin justificar = sin justificación o rechazada. `diasConPermiso`: fechas con permiso de día completo.
 */
export function resumirAlumno(
  diasHabiles: readonly string[], registros: readonly RegistroDia[], diasConPermiso: ReadonlySet<string> = new Set(),
): { resumen: ResumenAlumno; detalle: DetalleDia[] } {
  const porFecha = new Map<string, RegistroDia[]>();
  for (const r of registros) if (r.ambito === "dia") porFecha.set(r.fecha, [...(porFecha.get(r.fecha) ?? []), r]);
  const resumen: ResumenAlumno = {
    diasHabiles: diasHabiles.length, diasConRegistro: 0, diasSinRegistro: 0,
    llego: 0, tarde: 0, falta: 0, problema: 0, faltasJustificadas: 0, faltasEnRevision: 0, faltasInjustificadas: 0, conPermiso: 0, porcentaje: null,
  };
  const detalle: DetalleDia[] = [];
  for (const fecha of diasHabiles) {
    const r = elegirRegistroDelDia(porFecha.get(fecha) ?? []);
    const permiso = diasConPermiso.has(fecha);
    if (!r) {
      resumen.diasSinRegistro++;
      if (permiso) resumen.conPermiso++;
      detalle.push({ fecha, estado: null, hora: null, justificada: false, enRevision: false, horaSalida: null, conPermiso: permiso });
      continue;
    }
    resumen.diasConRegistro++;
    resumen[r.estado]++;
    const conPermiso = permiso && r.estado === "falta";
    const enRevision = r.estado === "falta" && r.justificacion === "pendiente" && !conPermiso;
    const justificada = r.estado === "falta" && (r.justificacion === "aceptada" || conPermiso);
    if (conPermiso) resumen.conPermiso++;
    if (r.estado === "falta") resumen[justificada ? "faltasJustificadas" : enRevision ? "faltasEnRevision" : "faltasInjustificadas"]++;
    detalle.push({ fecha, estado: r.estado, hora: r.hora, justificada, enRevision, horaSalida: r.horaSalida ?? null, conPermiso });
  }
  resumen.porcentaje = porcentajeAsistencia(resumen.llego + resumen.tarde, resumen.diasConRegistro);
  return { resumen, detalle };
}

/** Un día hábil de un salón o del colegio en el calendario del reporte: cuántos alumnos en cada estado. */
export type DiaAgregado = {
  fecha: string;
  llego: number;
  tarde: number;
  falta: number;
  problema: number;
  sinRegistro: number;
  faltasJustificadas: number;
  /** (llegó + tarde) / alumnos con registro ese día × 100; null si nadie tiene registro. */
  porcentaje: number | null;
};

/** Junta el detalle día a día de varios alumnos (mismos días hábiles) en un conteo por día, en orden de fecha. */
export function agregarPorDia(detalles: readonly (readonly DetalleDia[])[]): DiaAgregado[] {
  const porFecha = new Map<string, DiaAgregado>();
  for (const detalle of detalles) {
    for (const d of detalle) {
      const dia = porFecha.get(d.fecha) ?? { fecha: d.fecha, llego: 0, tarde: 0, falta: 0, problema: 0, sinRegistro: 0, faltasJustificadas: 0, porcentaje: null };
      if (d.estado) dia[d.estado]++;
      else dia.sinRegistro++;
      if (d.estado === "falta" && d.justificada) dia.faltasJustificadas++;
      porFecha.set(d.fecha, dia);
    }
  }
  return [...porFecha.values()]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((d) => ({ ...d, porcentaje: porcentajeAsistencia(d.llego + d.tarde, d.llego + d.tarde + d.falta + d.problema) }));
}

/** Suma resúmenes (salón o colegio): el porcentaje es sobre el total de días con registro, no el promedio de porcentajes. */
export function sumarResumenes(resumenes: readonly ResumenAlumno[]): ResumenAlumno {
  const t: ResumenAlumno = {
    diasHabiles: 0, diasConRegistro: 0, diasSinRegistro: 0,
    llego: 0, tarde: 0, falta: 0, problema: 0, faltasJustificadas: 0, faltasEnRevision: 0, faltasInjustificadas: 0, conPermiso: 0, porcentaje: null,
  };
  for (const r of resumenes) {
    t.diasHabiles += r.diasHabiles; t.diasConRegistro += r.diasConRegistro; t.diasSinRegistro += r.diasSinRegistro;
    t.llego += r.llego; t.tarde += r.tarde; t.falta += r.falta; t.problema += r.problema;
    t.faltasJustificadas += r.faltasJustificadas; t.faltasEnRevision += r.faltasEnRevision; t.faltasInjustificadas += r.faltasInjustificadas;
    t.conPermiso += r.conPermiso ?? 0;
  }
  t.porcentaje = porcentajeAsistencia(t.llego + t.tarde, t.diasConRegistro);
  return t;
}

export function textoPorcentaje(p: number | null): string {
  return p === null ? "Sin datos" : `${p.toLocaleString("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

/** Nombre de archivo seguro: sin tildes ni símbolos. */
export function nombreArchivoReporte(partes: readonly string[]): string {
  return partes.join("-").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

/** Atajos de rango. `hoy` y las fechas son AAAA-MM-DD de la zona del colegio. */
export function rangoEsteMes(hoy: string): Rango {
  return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
}
export function rangoAnio(hoy: string): Rango {
  return { desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy };
}

export type NivelReporte = "inicial" | "primaria" | "secundaria" | "academia";
/** Grado de un nivel (todas sus secciones): en la URL va como `grado=primaria-3`. */
export type GradoReporte = { nivel: NivelReporte; grado: number };

/** `cursoId`: «mis» (los cursos que el profesor puede ver en ese alcance) o el id de un curso (specs/27). */
export type FiltrosReporte = { salonId?: string; alumnoId?: string; grado?: GradoReporte; cursoId?: string; desde: string; hasta: string };

/** Valor de `?curso=` para «Mis cursos» / «Todos los cursos» del profesor. */
export const MIS_CURSOS = "mis";

const NOMBRE_NIVEL_REPORTE: Record<NivelReporte, string> = { inicial: "inicial", primaria: "primaria", secundaria: "secundaria", academia: "academia" };

/** «primaria-3» → { nivel, grado }. Lanza ZodError si no es válido. */
export const gradoSchema = z
  .string()
  .regex(/^(inicial|primaria|secundaria|academia)-([1-9]|1[0-2])$/, "Grado no válido.")
  .transform((v): GradoReporte => {
    const [nivel, grado] = v.split("-");
    return { nivel: nivel as NivelReporte, grado: Number(grado) };
  });

export const claveGrado = (g: GradoReporte) => `${g.nivel}-${g.grado}`;

/** «3.° grado de primaria» · en inicial, «Inicial de 4 años». */
export function nombreGrado(g: GradoReporte): string {
  return g.nivel === "inicial" ? `Inicial de ${g.grado} años` : `${g.grado}.° grado de ${NOMBRE_NIVEL_REPORTE[g.nivel]}`;
}

/** Lee los filtros de la URL (página y exportaciones). Sin fechas: del 1.º del mes a hoy. Lanza ZodError si algo no es válido. */
export function filtrosDeBusqueda(get: (clave: string) => string | null | undefined, hoy: string): FiltrosReporte {
  const vacio = (v: string | null | undefined) => (v && v.trim() !== "" ? v.trim() : undefined);
  const base = rangoEsteMes(hoy);
  const filtros = z
    .object({ salonId: z.uuid().optional(), alumnoId: z.uuid().optional(), grado: gradoSchema.optional(), cursoId: z.union([z.literal(MIS_CURSOS), z.uuid()]).optional() })
    .parse({ salonId: vacio(get("salon")), alumnoId: vacio(get("alumno")), grado: vacio(get("grado")), cursoId: vacio(get("curso")) });
  const rango = rangoSchema.parse({ desde: vacio(get("desde")) ?? base.desde, hasta: vacio(get("hasta")) ?? base.hasta });
  return { salonId: filtros.salonId, alumnoId: filtros.alumnoId, ...(filtros.grado ? { grado: filtros.grado } : {}), ...(filtros.cursoId ? { cursoId: filtros.cursoId } : {}), ...rango };
}
