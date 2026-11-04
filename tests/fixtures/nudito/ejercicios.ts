// Fixtures de Nudito (paso 0, specs/41): un ejercicio de cada tipo (los 8), válidos según `esquemaEjercicioConSolucion`,
// y una respuesta correcta y otra incorrecta por ejercicio (útiles para evaluadores, sesiones e interfaz).
// Datos de prueba escritos a mano: no salen de los generadores reales de B.
import type { EjercicioConSolucion, EnvioRespuesta, Rubrica } from "@/lib/nudito/contratos";
import { TEMA_COM_ESCRITURA, TEMA_COM_LECTURA, TEMA_CYT_CELULA, TEMA_CYT_MATERIA, TEMA_MAT_ECUACIONES, TEMA_MAT_FRACCIONES } from "./temas";

export type CasoEjercicio = { ejercicio: EjercicioConSolucion; correcta: EnvioRespuesta; incorrecta: EnvioRespuesta };

export const RUBRICA_OPINION_S2: Rubrica = {
  id: "com.opinion.s2",
  nombre: "Párrafo de opinión (2.° de secundaria)",
  grado: 2,
  criterios: [
    { id: "postura", descripcion: "Expresa una postura clara", niveles: ["No expresa postura", "La postura se intuye", "Postura clara", "Postura clara y precisa"] },
    { id: "razones", descripcion: "Da razones que sostienen la postura", niveles: ["Sin razones", "Una razón poco clara", "Una razón clara", "Dos o más razones claras"] },
    { id: "conectores", descripcion: "Usa conectores para unir ideas", niveles: ["Sin conectores", "Un conector", "Varios conectores", "Conectores variados y bien usados"] },
  ],
};

export const OPCION_MULTIPLE_FRACCIONES: CasoEjercicio = {
  ejercicio: {
    publico: {
      tipo: "opcion_multiple",
      temaClave: TEMA_MAT_FRACCIONES.clave,
      dificultad: 1,
      fuenteId: "mat.fracciones-equivalentes@1",
      semilla: 42,
      enunciado: "¿Qué fracción es equivalente a 2/3?",
      opciones: [
        { id: "a", texto: "4/6" },
        { id: "b", texto: "2/6" },
        { id: "c", texto: "4/3" },
        { id: "d", texto: "3/4" },
      ],
    },
    solucion: { tipo: "opcion_multiple", correcta: "a", distractores: { b: "solo_denominador", c: "solo_numerador", d: "invierte_fraccion" } },
    pistas: [
      "Las fracciones equivalentes representan la misma parte del todo.",
      "Prueba multiplicando el numerador y el denominador de 2/3 por el mismo número.",
      "Multiplica 2 y 3 por 2. ¿Qué fracción obtienes?",
    ],
    explicacion: "Si multiplicas el numerador y el denominador de 2/3 por 2 obtienes 4/6: es la misma parte del todo.",
  },
  correcta: { respuesta: { tipo: "opcion", opcionId: "a" } },
  incorrecta: { respuesta: { tipo: "opcion", opcionId: "b" } },
};

export const FRACCION_AMPLIFICAR: CasoEjercicio = {
  ejercicio: {
    publico: {
      tipo: "fraccion",
      temaClave: TEMA_MAT_FRACCIONES.clave,
      dificultad: 2,
      fuenteId: "mat.fracciones-equivalentes@1",
      semilla: 7,
      enunciado: "Completa: 3/5 = ?/10",
      pideSimplificar: false,
    },
    solucion: { tipo: "fraccion", num: 6, den: 10, aceptarEquivalentes: false },
    pistas: [
      "Mira cómo cambió el denominador: de 5 a 10.",
      "El 5 se multiplicó por 2 para llegar a 10.",
      "Haz lo mismo con el numerador: 3 × 2.",
    ],
    explicacion: "El denominador pasó de 5 a 10 (× 2); el numerador también se multiplica por 2: 3 × 2 = 6. Entonces 3/5 = 6/10.",
  },
  correcta: { respuesta: { tipo: "fraccion", num: "6", den: "10" } },
  incorrecta: { respuesta: { tipo: "fraccion", num: "3", den: "10" } },
};

export const NUMERICO_ECUACION: CasoEjercicio = {
  ejercicio: {
    publico: {
      tipo: "numerico",
      temaClave: TEMA_MAT_ECUACIONES.clave,
      dificultad: 2,
      fuenteId: "mat.ecuaciones-lineales@1",
      semilla: 1234,
      enunciado: "Resuelve: 2x + 3 = 11. ¿Cuánto vale x?",
      decimalesPermitidos: 0,
    },
    solucion: { tipo: "numerico", valor: 4, tolerancia: 0 },
    pistas: [
      "Piensa en una balanza: lo que haces en un lado, hazlo en el otro.",
      "Primero quita el 3 de ambos lados.",
      "Te queda 2x = 8. ¿Qué número multiplicado por 2 da 8?",
    ],
    explicacion: "2x + 3 = 11 → restamos 3: 2x = 8 → dividimos entre 2: x = 4. Comprueba: 2 · 4 + 3 = 11.",
  },
  correcta: { respuesta: { tipo: "numero", valor: "4" }, procedimiento: "2x = 8, x = 4", tiempoMs: 40_000 },
  incorrecta: { respuesta: { tipo: "numero", valor: "7" } },
};

export const VERDADERO_FALSO_CELULA: CasoEjercicio = {
  ejercicio: {
    publico: {
      tipo: "verdadero_falso",
      temaClave: TEMA_CYT_CELULA.clave,
      dificultad: 1,
      fuenteId: "cyt.celula:vf-01",
      semilla: 3,
      enunciado: "Indica si cada afirmación es verdadera o falsa.",
      afirmaciones: [
        { id: "a1", texto: "La célula vegetal tiene pared celular." },
        { id: "a2", texto: "La célula animal tiene cloroplastos." },
      ],
    },
    solucion: {
      tipo: "verdadero_falso",
      valores: { a1: true, a2: false },
      justificacion: { a2: "Los cloroplastos son propios de las células vegetales." },
    },
    pistas: [
      "Piensa en qué necesita una planta que un animal no.",
      "Las plantas fabrican su alimento con la luz del sol.",
      "Los cloroplastos captan la luz: ¿quién los necesita?",
    ],
    explicacion: "La pared celular y los cloroplastos están en la célula vegetal. La célula animal no tiene cloroplastos.",
  },
  correcta: { respuesta: { tipo: "vf", valores: { a1: true, a2: false } } },
  incorrecta: { respuesta: { tipo: "vf", valores: { a1: true, a2: true } } },
};

export const RELACIONAR_CELULA: CasoEjercicio = {
  ejercicio: {
    publico: {
      tipo: "relacionar",
      temaClave: TEMA_CYT_CELULA.clave,
      dificultad: 2,
      fuenteId: "cyt.celula:rel-01",
      semilla: 5,
      enunciado: "Relaciona cada parte de la célula con su función.",
      izquierda: [
        { id: "nucleo", texto: "Núcleo" },
        { id: "membrana", texto: "Membrana celular" },
        { id: "cloroplasto", texto: "Cloroplasto" },
      ],
      derecha: [
        { id: "f1", texto: "Controla las actividades de la célula" },
        { id: "f2", texto: "Deja pasar sustancias hacia dentro y fuera" },
        { id: "f3", texto: "Capta la luz para fabricar alimento" },
      ],
    },
    solucion: { tipo: "relacionar", pares: { nucleo: "f1", membrana: "f2", cloroplasto: "f3" } },
    pistas: [
      "Empieza por la parte que conoces mejor.",
      "La membrana es como la puerta de la célula.",
      "El cloroplasto trabaja con la luz del sol.",
    ],
    explicacion: "El núcleo controla la célula, la membrana regula lo que entra y sale, y el cloroplasto capta la luz.",
  },
  correcta: { respuesta: { tipo: "relacionar", pares: { nucleo: "f1", membrana: "f2", cloroplasto: "f3" } } },
  incorrecta: { respuesta: { tipo: "relacionar", pares: { nucleo: "f2", membrana: "f1", cloroplasto: "f3" } } },
};

export const OPCION_MULTIPLE_MATERIA: CasoEjercicio = {
  ejercicio: {
    publico: {
      tipo: "opcion_multiple",
      temaClave: TEMA_CYT_MATERIA.clave,
      dificultad: 1,
      fuenteId: "cyt.materia:om-01",
      semilla: 9,
      enunciado: "¿Cuál de estos es un cambio químico?",
      opciones: [
        { id: "a", texto: "Un cubo de hielo que se derrite" },
        { id: "b", texto: "Un papel que se quema" },
        { id: "c", texto: "Azúcar que se disuelve en agua" },
      ],
    },
    solucion: { tipo: "opcion_multiple", correcta: "b", distractores: { a: "cambio_de_estado", c: "disolucion" } },
    pistas: [
      "En un cambio químico aparecen sustancias nuevas.",
      "¿En cuál de los casos ya no puedes recuperar lo que tenías al inicio?",
      "Después de quemarse, el papel se vuelve ceniza y humo.",
    ],
    explicacion: "Al quemarse, el papel se transforma en ceniza y gases: son sustancias nuevas. Derretir hielo o disolver azúcar son cambios físicos.",
  },
  correcta: { respuesta: { tipo: "opcion", opcionId: "b" } },
  incorrecta: { respuesta: { tipo: "opcion", opcionId: "a" } },
};

const TEXTO_MERCADO =
  "El sábado, Ana acompañó a su abuela al mercado de Surquillo. Llegaron a las ocho de la mañana, cuando los puestos " +
  "de frutas recién abrían. La abuela compró mangos y paltas, y Ana eligió una piña grande para el almuerzo familiar. " +
  "De regreso, Ana cargó la bolsa más pesada sin quejarse.";

export const LECTURA_MERCADO: CasoEjercicio = {
  ejercicio: {
    publico: {
      tipo: "lectura",
      temaClave: TEMA_COM_LECTURA.clave,
      dificultad: 1,
      fuenteId: "com.p4.narrativos:mercado",
      semilla: 11,
      enunciado: "Lee el texto y responde las preguntas.",
      texto: TEXTO_MERCADO,
      preguntas: [
        {
          id: "q1",
          tipo: "literal",
          enunciado: "¿A qué hora llegaron al mercado?",
          opciones: [
            { id: "a", texto: "A las ocho de la mañana" },
            { id: "b", texto: "Al mediodía" },
            { id: "c", texto: "En la tarde" },
          ],
        },
        { id: "q2", tipo: "literal", enunciado: "¿Qué fruta eligió Ana?" },
        {
          id: "q3",
          tipo: "inferencial",
          enunciado: "¿Cómo es Ana, según lo que hizo al regresar?",
          opciones: [
            { id: "a", texto: "Perezosa" },
            { id: "b", texto: "Servicial" },
            { id: "c", texto: "Distraída" },
          ],
        },
      ],
    },
    solucion: { tipo: "lectura", respuestas: { q1: "a", q2: { aceptadas: ["piña", "una piña", "la piña", "una piña grande"] }, q3: "b" } },
    pistas: [
      "Relee la oración donde dice cuándo llegaron.",
      "Busca la parte del texto donde aparece lo que eligió Ana.",
      "Fíjate en qué hizo Ana con la bolsa más pesada.",
    ],
    explicacion: "El texto dice que llegaron a las ocho y que Ana eligió una piña. Como cargó la bolsa más pesada sin quejarse, podemos deducir que es servicial.",
  },
  correcta: { respuesta: { tipo: "lectura", respuestas: { q1: "a", q2: "una piña", q3: "b" } } },
  incorrecta: { respuesta: { tipo: "lectura", respuestas: { q1: "b", q2: "mangos", q3: "a" } } },
};

export const TEXTO_CORTO_MERCADO: CasoEjercicio = {
  ejercicio: {
    publico: {
      tipo: "texto_corto",
      temaClave: TEMA_COM_LECTURA.clave,
      dificultad: 1,
      fuenteId: "com.p4.narrativos:mercado-tc",
      semilla: 12,
      enunciado: `${TEXTO_MERCADO}\n\n¿Con quién fue Ana al mercado?`,
      maxCaracteres: 60,
    },
    solucion: { tipo: "texto_corto", aceptadas: ["abuela", "su abuela", "con su abuela", "la abuela"], normalizacion: "flexible" },
    pistas: [
      "La respuesta está en la primera oración.",
      "Busca a la persona que acompañó Ana.",
      "Es un familiar de Ana.",
    ],
    explicacion: "La primera oración dice que Ana acompañó a su abuela al mercado.",
  },
  correcta: { respuesta: { tipo: "texto", texto: "Con su abuela" } },
  incorrecta: { respuesta: { tipo: "texto", texto: "Con su mamá" } },
};

export const ESCRITURA_OPINION: CasoEjercicio = {
  ejercicio: {
    publico: {
      tipo: "escritura_rubrica",
      temaClave: TEMA_COM_ESCRITURA.clave,
      dificultad: 2,
      fuenteId: "com.s2.opinion:recreo",
      semilla: 21,
      enunciado: "Escribe un párrafo de opinión.",
      consigna: "¿El recreo debería durar más tiempo? Escribe tu opinión y da al menos dos razones.",
      minPalabras: 40,
      maxPalabras: 120,
      rubricaId: RUBRICA_OPINION_S2.id,
      criteriosVisibles: ["Expresa una postura clara", "Da razones", "Usa conectores"],
    },
    solucion: { tipo: "escritura_rubrica", rubrica: RUBRICA_OPINION_S2 },
    pistas: [
      "Empieza diciendo qué piensas: «Creo que…».",
      "Agrega una razón con «porque…».",
      "Suma otra razón con «además…» y cierra con una conclusión.",
    ],
    explicacion: "Un buen párrafo de opinión presenta la postura, la sostiene con razones unidas por conectores y cierra con una conclusión.",
  },
  correcta: {
    respuesta: {
      tipo: "texto",
      texto:
        "Creo que el recreo debería durar más tiempo porque nos ayuda a descansar y volver a clase con más atención. " +
        "Además, en el recreo compartimos con compañeros de otros salones y aprendemos a convivir. Por eso, " +
        "diez minutos más harían que aprendamos mejor y estemos más tranquilos.",
    },
  },
  incorrecta: { respuesta: { tipo: "texto", texto: "Sí." } },
};

export const CASOS_FIXTURE: readonly CasoEjercicio[] = [
  OPCION_MULTIPLE_FRACCIONES, FRACCION_AMPLIFICAR, NUMERICO_ECUACION, VERDADERO_FALSO_CELULA, RELACIONAR_CELULA,
  OPCION_MULTIPLE_MATERIA, LECTURA_MERCADO, TEXTO_CORTO_MERCADO, ESCRITURA_OPINION,
];
