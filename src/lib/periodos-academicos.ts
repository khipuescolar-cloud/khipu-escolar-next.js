// Organización del año escolar (specs/11). Lógica pura: cada nivel trabaja por bimestres, trimestres o semestres; los
// niveles con el mismo tipo comparten los periodos (y sus fechas).
import type { Nivel, TipoPeriodo } from "@/generated/prisma/enums";
import { sumarDias } from "@/lib/fechas";

export const TIPOS_PERIODO = ["bimestre", "trimestre", "semestre"] as const;
export const CANTIDAD_PERIODOS: Record<TipoPeriodo, number> = { bimestre: 4, trimestre: 3, semestre: 2 };
export const NOMBRE_TIPO: Record<TipoPeriodo, { singular: string; plural: string }> = {
  bimestre: { singular: "Bimestre", plural: "Bimestres" },
  trimestre: { singular: "Trimestre", plural: "Trimestres" },
  semestre: { singular: "Semestre", plural: "Semestres" },
};
export const TODOS_LOS_NIVELES: Nivel[] = ["inicial", "primaria", "secundaria", "academia"];

const ROMANOS = ["I", "II", "III", "IV", "V", "VI"];

/** «II Trimestre». */
export function nombrePeriodo(tipo: TipoPeriodo, numero: number): string {
  return `${ROMANOS[numero - 1] ?? numero} ${NOMBRE_TIPO[tipo].singular}`;
}

/** Día de la semana de una fecha AAAA-MM-DD: 0 = domingo … 6 = sábado. */
const dow = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/** Año escolar sugerido en el Perú: del segundo lunes de marzo al tercer viernes de diciembre. */
export function anioEscolarSugerido(anio: number): { inicio: string; fin: string } {
  const primeroMarzo = `${anio}-03-01`;
  const primerLunes = sumarDias(primeroMarzo, (8 - dow(primeroMarzo)) % 7);
  const primeroDic = `${anio}-12-01`;
  const primerViernes = sumarDias(primeroDic, (5 - dow(primeroDic) + 7) % 7);
  return { inicio: sumarDias(primerLunes, 7), fin: sumarDias(primerViernes, 14) };
}

/**
 * Fechas sugeridas de los periodos del año: el año escolar partido en partes iguales, sin huecos. La dirección las ajusta
 * (por ejemplo, para las vacaciones de medio año).
 */
export function periodosSugeridos(anio: number, tipo: TipoPeriodo): { numero: number; nombre: string; inicio: string; fin: string }[] {
  const { inicio, fin } = anioEscolarSugerido(anio);
  const total = (Date.parse(fin) - Date.parse(inicio)) / 86_400_000 + 1;
  const n = CANTIDAD_PERIODOS[tipo];
  return Array.from({ length: n }, (_, i) => ({
    numero: i + 1,
    nombre: nombrePeriodo(tipo, i + 1),
    inicio: sumarDias(inicio, Math.round((i * total) / n)),
    fin: i === n - 1 ? fin : sumarDias(inicio, Math.round(((i + 1) * total) / n) - 1),
  }));
}

/** Cómo trabaja cada nivel en el año, según sus periodos: el tipo, o null si aún no tiene periodos. */
export function organizacionDelAnio(periodos: readonly { tipo: TipoPeriodo; niveles: readonly Nivel[] }[]): Record<Nivel, TipoPeriodo | null> {
  const res = Object.fromEntries(TODOS_LOS_NIVELES.map((n) => [n, null])) as Record<Nivel, TipoPeriodo | null>;
  for (const p of periodos) for (const n of p.niveles) res[n] ??= p.tipo;
  return res;
}

/** Niveles que ya trabajan con otro tipo de periodo en el año (un nivel usa un solo tipo por año). */
export function nivelesConOtroTipo(periodos: readonly { tipo: TipoPeriodo; niveles: readonly Nivel[] }[], tipo: TipoPeriodo, niveles: readonly Nivel[]): Nivel[] {
  const org = organizacionDelAnio(periodos);
  return niveles.filter((n) => org[n] !== null && org[n] !== tipo);
}
