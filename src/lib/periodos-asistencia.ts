import { porcentajeAsistencia } from "@/lib/reportes-asistencia";

// Periodos que el alumno y su familia eligen en «Mi asistencia» (specs/27): los periodos del año ya empezados de su
// nivel y «Año» (desde el inicio de clases). Lógica pura, sin BD.

export type PeriodoAsistencia = { clave: string; nombre: string; desde: string; hasta: string };

export const CLAVE_ANIO = "anio";

/**
 * Periodos ya empezados (recortados a hoy) y al final «Año», desde el inicio del primer periodo (sin periodos, el 1.º de enero).
 * `periodos` llega ordenado por inicio.
 */
export function periodosParaAsistencia(periodos: { numero: number; nombre: string; inicio: string; fin: string }[], hoy: string): PeriodoAsistencia[] {
  const empezados = periodos.filter((p) => p.inicio <= hoy);
  const inicioClases = empezados[0]?.inicio ?? `${hoy.slice(0, 4)}-01-01`;
  return [
    ...empezados.map((p) => ({ clave: String(p.numero), nombre: p.nombre, desde: p.inicio, hasta: p.fin < hoy ? p.fin : hoy })),
    { clave: CLAVE_ANIO, nombre: "Año", desde: inicioClases, hasta: hoy },
  ];
}

/** El periodo pedido; si no existe, el que contiene a hoy (o «Año» si `porDefecto` es `anio` o no hay periodos). */
export function periodoElegido(lista: PeriodoAsistencia[], clave: string | null, hoy: string, porDefecto: "actual" | "anio" = "actual"): PeriodoAsistencia {
  const anio = lista[lista.length - 1];
  const pedido = clave ? lista.find((p) => p.clave === clave) : undefined;
  if (pedido) return pedido;
  if (porDefecto === "anio") return anio;
  return lista.find((p) => p.clave !== CLAVE_ANIO && p.desde <= hoy && hoy <= p.hasta) ?? anio;
}

/** % de asistencia a clase de un curso: clases sin falta ÷ clases con lista (nulo sin clases). */
export function porcentajeCurso(clases: number, faltas: number): number | null {
  return porcentajeAsistencia(clases - faltas, clases);
}

const DIA_MES = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" });

/** Rango corto para el encabezado del periodo: «12 oct. – 8 nov.». */
export function rangoCorto(desde: string, hasta: string): string {
  const f = (iso: string) => DIA_MES.format(new Date(`${iso}T12:00:00Z`));
  return `${f(desde)} – ${f(hasta)}`;
}
