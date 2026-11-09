// Catálogo de cursos de Khipu (specs/51). El colegio elige de aquí los cursos que dicta (o escribe uno propio, sin
// Nudito). Cada curso pertenece a un área CNEB (notas, competencias) y, si es un curso especializado (Química, Álgebra…),
// declara qué disciplinas del banco le quita a su área en los grados donde el colegio lo dicta.
import { CATALOGO_CNEB, normalizar, type NivelCneb } from "@/lib/cneb/catalogo";
import type { Disciplina } from "@/lib/nudito/conocimiento/disciplinas";

export type CursoKhipu = {
  clave: string;
  nombre: string;
  /** Clave del área en `CATALOGO_CNEB`. */
  area: string;
  niveles: readonly NivelCneb[];
  /** Prefijo de las claves de tema de su banco (`qui.s3.…`). Solo cursos con Nudito. */
  prefijo?: string;
  /** Disciplinas del banco del área que pasan a este curso (vacío en los cursos que son el área completa). */
  disciplinas: readonly Disciplina[];
  /** Nombres con que los colegios suelen llamarlo (normalizados), además del nombre. */
  sinonimos: readonly string[];
  nudito: boolean;
};

const AREAS_CON_NUDITO: Record<string, string> = { matematica: "mat", comunicacion: "com", "ciencia-tecnologia": "cyt" };

const ESPECIALIZADOS: readonly Omit<CursoKhipu, "nudito">[] = [
  { clave: "aritmetica", nombre: "Aritmética", area: "matematica", niveles: ["primaria", "secundaria"], prefijo: "ari", disciplinas: ["aritmetica"], sinonimos: ["aritmetica"] },
  { clave: "algebra", nombre: "Álgebra", area: "matematica", niveles: ["primaria", "secundaria"], prefijo: "alg", disciplinas: ["algebra"], sinonimos: ["algebra"] },
  { clave: "geometria", nombre: "Geometría", area: "matematica", niveles: ["primaria", "secundaria"], prefijo: "geo", disciplinas: ["geometria"], sinonimos: ["geometria"] },
  { clave: "trigonometria", nombre: "Trigonometría", area: "matematica", niveles: ["secundaria"], prefijo: "tri", disciplinas: ["trigonometria"], sinonimos: ["trigonometria"] },
  { clave: "estadistica", nombre: "Estadística", area: "matematica", niveles: ["primaria", "secundaria"], prefijo: "est", disciplinas: ["estadistica"], sinonimos: ["estadistica", "estadistica y probabilidad"] },
  { clave: "razonamiento-matematico", nombre: "Razonamiento Matemático", area: "matematica", niveles: ["primaria", "secundaria"], prefijo: "rm", disciplinas: [], sinonimos: ["razonamiento matematico", "rm"] },
  { clave: "lenguaje", nombre: "Lenguaje", area: "comunicacion", niveles: ["primaria", "secundaria"], prefijo: "len", disciplinas: ["lenguaje"], sinonimos: ["lenguaje", "gramatica", "ortografia"] },
  { clave: "literatura", nombre: "Literatura", area: "comunicacion", niveles: ["primaria", "secundaria"], prefijo: "lit", disciplinas: ["literatura"], sinonimos: ["literatura"] },
  { clave: "razonamiento-verbal", nombre: "Razonamiento Verbal", area: "comunicacion", niveles: ["primaria", "secundaria"], prefijo: "rv", disciplinas: ["razonamiento-verbal"], sinonimos: ["razonamiento verbal", "rv"] },
  { clave: "plan-lector", nombre: "Plan Lector", area: "comunicacion", niveles: ["primaria", "secundaria"], prefijo: "pl", disciplinas: ["comprension-lectora"], sinonimos: ["plan lector", "comprension lectora", "comprension de textos"] },
  { clave: "biologia", nombre: "Biología", area: "ciencia-tecnologia", niveles: ["primaria", "secundaria"], prefijo: "bio", disciplinas: ["biologia"], sinonimos: ["biologia", "ciencias biologicas"] },
  { clave: "quimica", nombre: "Química", area: "ciencia-tecnologia", niveles: ["primaria", "secundaria"], prefijo: "qui", disciplinas: ["quimica"], sinonimos: ["quimica"] },
  { clave: "fisica", nombre: "Física", area: "ciencia-tecnologia", niveles: ["primaria", "secundaria"], prefijo: "fis", disciplinas: ["fisica"], sinonimos: ["fisica"] },
];

export const CURSOS_KHIPU: readonly CursoKhipu[] = [
  ...CATALOGO_CNEB.filter(a => a.area !== "transversales").map(a => ({
    clave: a.area, nombre: a.nombre, area: a.area, niveles: a.niveles, prefijo: AREAS_CON_NUDITO[a.area],
    disciplinas: [], sinonimos: a.sinonimos, nudito: a.area in AREAS_CON_NUDITO,
  })),
  ...ESPECIALIZADOS.map(c => ({ ...c, nudito: true })),
];

const porClave = new Map(CURSOS_KHIPU.map(c => [c.clave, c]));
/** Especializados primero: «Álgebra» también es sinónimo del área Matemática y debe ganar el curso propio. */
const ordenDeteccion = [...CURSOS_KHIPU].sort((a, b) => Number(a.clave === a.area) - Number(b.clave === b.area));
export function cursoKhipu(clave: string): CursoKhipu | null {
  return porClave.get(clave) ?? null;
}

/** Curso de Khipu que mejor corresponde a un nombre de curso del colegio (gana el sinónimo más largo), o null. */
export function detectarCursoKhipu(nombre: string, nivel?: NivelCneb): CursoKhipu | null {
  const n = normalizar(nombre);
  let mejor: { curso: CursoKhipu; largo: number } | null = null;
  for (const curso of ordenDeteccion) {
    if (nivel && !curso.niveles.includes(nivel)) continue;
    for (const s of [normalizar(curso.nombre), ...curso.sinonimos]) {
      if ((n === s || n.startsWith(s + " ")) && (!mejor || s.length > mejor.largo)) mejor = { curso, largo: s.length };
    }
  }
  return mejor?.curso ?? null;
}

/** Disciplinas que el área pierde en un grado porque el colegio dicta ahí cursos especializados. */
export function disciplinasCedidas(area: string, cursosDelGrado: readonly string[]): Set<Disciplina> {
  return new Set(cursosDelGrado.flatMap(c => { const k = porClave.get(c); return k && k.area === area ? k.disciplinas : []; }));
}
