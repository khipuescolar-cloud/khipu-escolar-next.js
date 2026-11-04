// Responsable: B (specs/43). Rúbricas FORMATIVAS de escritura (CNEB Comunicación, competencia 9), una por grado.
// Cuatro criterios fijos y cuatro niveles (0 = inicio … 3 = logrado), con descriptores ajustados por tramo de grado.
// Son orientativas para la retroalimentación: nunca son una nota.
import { esquemaRubrica, type NivelNudito, type Rubrica } from "../contratos";

export const CRITERIOS_ESCRITURA = ["adecuacion", "coherencia", "conectores", "ortografia"] as const;
export type CriterioEscritura = (typeof CRITERIOS_ESCRITURA)[number];

type Tramo = "inicial" | "intermedio" | "avanzado";
const tramoDe = (nivel: NivelNudito, grado: number): Tramo => (nivel === "secundaria" ? "avanzado" : grado <= 3 ? "inicial" : "intermedio");

const DESCRIPTORES: Record<Tramo, Record<CriterioEscritura, { descripcion: string; niveles: [string, string, string, string] }>> = {
  inicial: {
    adecuacion: { descripcion: "Escribe sobre lo que pide la consigna", niveles: ["Escribe sobre otro tema", "Toca el tema, pero falta lo principal", "Responde a la consigna", "Responde a la consigna con detalles propios"] },
    coherencia: { descripcion: "Las ideas siguen un orden", niveles: ["Las ideas están sueltas", "Hay orden en parte del texto", "Las ideas siguen un orden claro", "Tiene inicio, desarrollo y final claros"] },
    conectores: { descripcion: "Une las ideas con palabras como «y», «luego», «también», «porque»", niveles: ["No une las ideas", "Usa un conector", "Usa varios conectores", "Usa conectores variados y bien elegidos"] },
    ortografia: { descripcion: "Usa mayúscula al inicio y punto al final", niveles: ["Sin mayúsculas ni puntos", "Algunas mayúsculas o puntos", "Mayúsculas y puntos casi siempre", "Mayúsculas, puntos y comas bien usados"] },
  },
  intermedio: {
    adecuacion: { descripcion: "Se ajusta al propósito, al tipo de texto y a quien lo leerá", niveles: ["No responde a la consigna", "Responde en parte a la consigna", "Responde a la consigna con el tipo de texto pedido", "Responde a la consigna y se adapta al lector"] },
    coherencia: { descripcion: "Organiza las ideas en párrafos sin contradicciones ni repeticiones", niveles: ["Ideas desordenadas o repetidas", "Algunas ideas se conectan", "Ideas organizadas y relacionadas", "Ideas organizadas en párrafos con progresión clara"] },
    conectores: { descripcion: "Usa conectores de orden, causa y adición («primero», «porque», «además»)", niveles: ["Sin conectores", "Repite el mismo conector", "Usa conectores adecuados", "Usa conectores variados y precisos"] },
    ortografia: { descripcion: "Cuida la ortografía, las tildes y la puntuación", niveles: ["Muchos errores que dificultan leer", "Varios errores", "Pocos errores", "Casi sin errores; buena puntuación"] },
  },
  avanzado: {
    adecuacion: { descripcion: "Se adecua a la situación comunicativa, al propósito y al registro", niveles: ["No se adecua a la consigna", "Se adecua parcialmente", "Se adecua al propósito y al registro", "Se adecua con precisión y voz propia"] },
    coherencia: { descripcion: "Desarrolla las ideas con coherencia y cohesión, en párrafos", niveles: ["Texto confuso o contradictorio", "Coherencia parcial", "Texto coherente con párrafos", "Texto coherente, con ideas desarrolladas y bien jerarquizadas"] },
    conectores: { descripcion: "Usa conectores y referentes que relacionan las ideas (causa, contraste, conclusión)", niveles: ["Sin conectores", "Conectores escasos o repetidos", "Conectores adecuados", "Conectores variados y precisos, incluidos los de contraste y conclusión"] },
    ortografia: { descripcion: "Aplica normas ortográficas, de tildación y de puntuación", niveles: ["Errores frecuentes", "Varios errores", "Pocos errores", "Uso correcto y consciente de la puntuación"] },
  },
};

export function idRubricaEscritura(nivel: NivelNudito, grado: number): string {
  return `com.escritura.${nivel === "secundaria" ? "s" : "p"}${grado}`;
}

/** Rúbrica formativa del grado (validada con `esquemaRubrica`). */
export function rubricaEscritura(nivel: NivelNudito, grado: number): Rubrica {
  const d = DESCRIPTORES[tramoDe(nivel, grado)];
  return esquemaRubrica.parse({
    id: idRubricaEscritura(nivel, grado),
    nombre: `Escritura formativa (${grado}.° de ${nivel})`,
    grado,
    criterios: CRITERIOS_ESCRITURA.map((id) => ({ id, ...d[id] })),
  });
}
