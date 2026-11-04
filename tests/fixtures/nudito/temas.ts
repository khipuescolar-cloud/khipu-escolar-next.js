// Fixtures de Nudito (paso 0, specs/41): 2 temas por área para que C y D trabajen sin esperar el catálogo real de A.
// Datos de prueba: NO son el catálogo oficial. Los códigos de desempeño existen en src/lib/cneb/*.json (lo verifica
// tests/unit/nudito-contratos-fixtures.test.ts).
import type { Tema } from "@/lib/nudito/contratos";

const revisado = { por: "fixture", fecha: "2026-11-14" };

export const TEMA_MAT_FRACCIONES: Tema = {
  clave: "mat.p4.fracciones-equivalentes",
  area: "matematica",
  nivel: "primaria",
  grado: 4,
  competenciaCneb: 23,
  capacidad: "Comunica su comprensión sobre los números y las operaciones",
  desempenoCodigo: "MAT-C23-P4-07",
  nombre: "Fracciones equivalentes",
  descripcionCorta: "Reconocer fracciones que representan la misma parte de un todo.",
  palabrasClave: ["fraccion equivalente", "fracciones equivalentes", "misma fraccion", "amplificar", "simplificar"],
  prerrequisitos: [],
  dificultad: { min: 1, max: 4 },
  tipos: ["opcion_multiple", "fraccion"],
  fuente: { tipo: "generador", generadorId: "mat.fracciones-equivalentes" },
  repaso: {
    idea: "Dos fracciones son equivalentes si representan la misma parte. Se obtienen multiplicando o dividiendo numerador y denominador por el mismo número.",
    ejemplo: "1/2 = 2/4 = 3/6: si partes una torta en 2 y tomas 1, comes lo mismo que si la partes en 4 y tomas 2.",
    errorFrecuente: "Multiplicar solo el numerador o solo el denominador.",
  },
  recursos: [{ titulo: "PerúEduca: fracciones", url: "https://www.perueduca.pe/" }],
  origen: "cneb",
  version: 1,
  revisado,
};

export const TEMA_MAT_ECUACIONES: Tema = {
  clave: "mat.s1.ecuaciones-lineales",
  area: "matematica",
  nivel: "secundaria",
  grado: 1,
  competenciaCneb: 24,
  desempenoCodigo: "MAT-C24-S1-04",
  nombre: "Ecuaciones de primer grado",
  descripcionCorta: "Resolver ecuaciones lineales con una incógnita.",
  palabrasClave: ["ecuacion", "ecuaciones", "despejar", "incognita", "primer grado"],
  prerrequisitos: [],
  dificultad: { min: 1, max: 5 },
  tipos: ["numerico", "opcion_multiple"],
  fuente: { tipo: "generador", generadorId: "mat.ecuaciones-lineales" },
  repaso: {
    idea: "Una ecuación es una balanza: lo que haces en un lado lo haces en el otro para dejar sola a la incógnita.",
    ejemplo: "2x + 3 = 11 → restas 3: 2x = 8 → divides entre 2: x = 4.",
  },
  recursos: [],
  origen: "cneb",
  version: 1,
  revisado,
};

export const TEMA_CYT_CELULA: Tema = {
  clave: "cyt.p5.celula-animal-vegetal",
  area: "ciencia-tecnologia",
  nivel: "primaria",
  grado: 5,
  competenciaCneb: 21,
  desempenoCodigo: "CYT-C21-P5-01",
  nombre: "Célula animal y célula vegetal",
  descripcionCorta: "Diferencias entre la célula animal y la vegetal y sus funciones básicas.",
  palabrasClave: ["celula", "celulas", "celula animal", "celula vegetal", "cloroplasto", "pared celular"],
  prerrequisitos: [],
  dificultad: { min: 1, max: 3 },
  tipos: ["opcion_multiple", "verdadero_falso", "relacionar"],
  fuente: { tipo: "banco", bancoId: "cyt.celula" },
  repaso: {
    idea: "Todos los seres vivos están formados por células. La célula vegetal tiene pared celular y cloroplastos; la animal no.",
    ejemplo: "Los cloroplastos de las hojas captan la luz del sol para que la planta fabrique su alimento.",
  },
  recursos: [],
  origen: "cneb",
  version: 1,
  revisado,
};

export const TEMA_CYT_MATERIA: Tema = {
  clave: "cyt.s1.cambios-materia",
  area: "ciencia-tecnologia",
  nivel: "secundaria",
  grado: 1,
  competenciaCneb: 21,
  desempenoCodigo: "CYT-C21-S1-01",
  nombre: "Cambios físicos y químicos",
  descripcionCorta: "Distinguir cambios físicos de cambios químicos de la materia.",
  palabrasClave: ["cambio fisico", "cambio quimico", "materia", "reaccion quimica"],
  prerrequisitos: [],
  dificultad: { min: 1, max: 4 },
  tipos: ["verdadero_falso", "opcion_multiple"],
  fuente: { tipo: "banco", bancoId: "cyt.materia" },
  repaso: {
    idea: "En un cambio físico la sustancia sigue siendo la misma; en un cambio químico se forman sustancias nuevas.",
    ejemplo: "El hielo que se derrite sigue siendo agua (físico); el papel que se quema se vuelve ceniza y gases (químico).",
  },
  recursos: [],
  origen: "cneb",
  version: 1,
  revisado,
};

export const TEMA_COM_LECTURA: Tema = {
  clave: "com.p4.informacion-explicita",
  area: "comunicacion",
  nivel: "primaria",
  grado: 4,
  competenciaCneb: 8,
  desempenoCodigo: "COM-C8-P4-01",
  nombre: "Información explícita en un texto",
  descripcionCorta: "Ubicar datos que el texto dice directamente y deducir otros sencillos.",
  palabrasClave: ["comprension lectora", "leer", "lectura", "informacion explicita", "preguntas del texto"],
  prerrequisitos: [],
  dificultad: { min: 1, max: 3 },
  tipos: ["lectura", "texto_corto"],
  fuente: { tipo: "lecturas", coleccionId: "com.p4.narrativos" },
  repaso: {
    idea: "La información explícita está escrita en el texto: búscala releyendo la parte donde aparece.",
    ejemplo: "Si el texto dice «Ana llegó al mercado a las 8», la hora de llegada es información explícita.",
  },
  recursos: [],
  origen: "cneb",
  version: 1,
  revisado,
};

export const TEMA_COM_ESCRITURA: Tema = {
  clave: "com.s2.texto-opinion",
  area: "comunicacion",
  nivel: "secundaria",
  grado: 2,
  competenciaCneb: 9,
  desempenoCodigo: "COM-C9-S2-01",
  nombre: "Texto de opinión",
  descripcionCorta: "Escribir un párrafo de opinión con una idea clara y razones.",
  palabrasClave: ["opinion", "texto de opinion", "argumentar", "escribir", "parrafo"],
  prerrequisitos: [],
  dificultad: { min: 1, max: 4 },
  tipos: ["escritura_rubrica"],
  fuente: { tipo: "lecturas", coleccionId: "com.s2.opinion" },
  repaso: {
    idea: "Un texto de opinión dice qué piensas (tu postura) y por qué (tus razones), unidas con conectores.",
    ejemplo: "Creo que el recreo debe ser más largo porque nos ayuda a descansar; además, jugamos en equipo.",
  },
  recursos: [],
  origen: "cneb",
  version: 1,
  revisado,
};

export const TEMAS_FIXTURE: readonly Tema[] = [
  TEMA_MAT_FRACCIONES, TEMA_MAT_ECUACIONES, TEMA_CYT_CELULA, TEMA_CYT_MATERIA, TEMA_COM_LECTURA, TEMA_COM_ESCRITURA,
];
