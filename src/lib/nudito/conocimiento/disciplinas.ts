// Disciplina de cada tema del banco (specs/50): permite que un curso propio del colegio (Química, Álgebra, Literatura…)
// tenga sus temas y que el área CNEB deje de mostrarlos en los grados donde ese curso existe (specs/51).
import type { AreaNudito } from "@/lib/nudito/contratos";

export const DISCIPLINAS = {
  matematica: ["aritmetica", "algebra", "geometria", "trigonometria", "estadistica"],
  comunicacion: ["lenguaje", "literatura", "comprension-lectora", "oralidad", "escritura", "razonamiento-verbal"],
  "ciencia-tecnologia": ["biologia", "quimica", "fisica", "tierra-universo", "indagacion", "tecnologia"],
} as const satisfies Record<AreaNudito, readonly string[]>;

export type Disciplina = (typeof DISCIPLINAS)[AreaNudito][number];

export function esDisciplinaDe(area: AreaNudito, valor: unknown): valor is Disciplina {
  return typeof valor === "string" && (DISCIPLINAS[area] as readonly string[]).includes(valor);
}
