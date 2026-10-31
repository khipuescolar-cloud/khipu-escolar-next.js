// Datos del gráfico de asistencia (specs/27). Lógica pura: agrupa por día, semana o mes según el largo del rango.
import { lunesDeSemana } from "@/lib/fechas";

export type ConteoDia = { fecha: string; llego: number; tarde: number; falta: number };
export type Agrupacion = "dia" | "semana" | "mes";
export type ConteoGrupo = {
  /** Primer día del grupo (el día, el lunes de la semana o el 1.° del mes). */
  desde: string;
  llego: number;
  tarde: number;
  falta: number;
  /** (llegó + tarde) / (llegó + tarde + no llegó) × 100; null sin registros. */
  porcentaje: number | null;
  /** «92 %» sobre la barra si hubo faltas; undefined si no (no se rotula). */
  etiquetaFalta?: string;
};

/** Hasta este número de días se dibuja una barra por día; hasta MAX_SEMANAS, una por semana; más, una por mes. */
export const MAX_DIAS = 23;
export const MAX_SEMANAS = 26;

export function agruparConteos(datos: readonly ConteoDia[]): { grupos: ConteoGrupo[]; agrupacion: Agrupacion } {
  const semanas = new Set(datos.map((d) => lunesDeSemana(d.fecha))).size;
  const agrupacion: Agrupacion = datos.length <= MAX_DIAS ? "dia" : semanas <= MAX_SEMANAS ? "semana" : "mes";
  const clave = (f: string) => (agrupacion === "dia" ? f : agrupacion === "semana" ? lunesDeSemana(f) : `${f.slice(0, 7)}-01`);
  const mapa = new Map<string, ConteoGrupo>();
  for (const d of datos) {
    const k = clave(d.fecha);
    const g = mapa.get(k) ?? { desde: k, llego: 0, tarde: 0, falta: 0, porcentaje: null };
    g.llego += d.llego;
    g.tarde += d.tarde;
    g.falta += d.falta;
    mapa.set(k, g);
  }
  const grupos = [...mapa.values()].sort((a, b) => a.desde.localeCompare(b.desde)).map((g) => {
    const base = g.llego + g.tarde + g.falta;
    const porcentaje = base === 0 ? null : ((g.llego + g.tarde) / base) * 100;
    return { ...g, porcentaje, ...(g.falta > 0 && porcentaje !== null ? { etiquetaFalta: `${Math.round(porcentaje)} %` } : {}) };
  });
  return { grupos, agrupacion };
}
