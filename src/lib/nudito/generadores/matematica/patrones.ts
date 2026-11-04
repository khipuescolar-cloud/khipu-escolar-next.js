// Responsable: B (specs/43). `mat.patrones`: secuencias numéricas crecientes y decrecientes (aritméticas), geométricas
// (× r) y de diferencias crecientes; en secundaria también el término n-ésimo. Nunca términos negativos en primaria.
import { crearGenerador, fmt, num, type Problema, type Subtipo } from "./comun";

const secuencia: Subtipo = {
  nombre: "secuencia",
  desde: 1,
  claves: ["patron", "secuencia", "sucesion", "progresion"],
  crear(ctx): Problema {
    const d = ctx.dificultad;
    const opciones = ["suma", ...(d >= 2 ? ["resta"] : []), ...(d >= 3 && ctx.efectivo >= 4 ? ["multiplica"] : []), ...(d >= 4 && ctx.efectivo >= 5 ? ["diferencias"] : []), ...(d >= 4 && ctx.efectivo >= 7 ? ["enesimo"] : [])];
    const tipo = ctx.azar.elegir(opciones);
    const paso = ctx.azar.entero(2, Math.min(3 + d * 2, ctx.efectivo <= 2 ? 5 : 25));
    const inicio = ctx.azar.entero(1, 5 + d * 5);

    if (tipo === "multiplica") {
      const r = ctx.azar.entero(2, 3);
      const t = [inicio, inicio * r, inicio * r ** 2, inicio * r ** 3];
      const sig = inicio * r ** 4;
      return {
        enunciado: `¿Qué número sigue en la secuencia ${t.join(", ")}, …?`,
        respuesta: num(sig),
        distractores: [
          { valor: num(t[3] + (t[3] - t[2])), codigo: "supone_suma_constante" },
          { valor: num(t[3] + r), codigo: "suma_la_razon" },
          { valor: num(t[3] * (r + 1)), codigo: "error_de_calculo" },
        ],
        pistas: [
          "Compara cada número con el anterior: ¿se suma o se multiplica?",
          "Divide un término entre el anterior y fíjate si siempre da lo mismo.",
          `Cada término se multiplica por ${r}.`,
        ],
        explicacion: `Cada término es el anterior × ${r}: ${t[3]} × ${r} = ${sig}.`,
      };
    }
    if (tipo === "diferencias") {
      const t = [inicio];
      for (let i = 1; i < 5; i++) t.push(t[i - 1] + paso + (i - 1));
      const sig = t[4] + paso + 4;
      return {
        enunciado: `Observa la secuencia ${t.join(", ")}, … ¿Qué número sigue?`,
        respuesta: num(sig),
        distractores: [
          { valor: num(t[4] + (t[4] - t[3])), codigo: "repite_ultima_diferencia" },
          { valor: num(t[4] + paso), codigo: "usa_primera_diferencia" },
          { valor: num(sig + 1), codigo: "error_de_calculo" },
        ],
        pistas: [
          "Calcula la diferencia entre cada par de números seguidos.",
          "Las diferencias no son iguales: mira cómo cambian ellas mismas.",
          `Las diferencias aumentan de 1 en 1; la última fue ${t[4] - t[3]}.`,
        ],
        explicacion: `Las diferencias son ${paso}, ${paso + 1}, ${paso + 2}, ${paso + 3}; la siguiente es ${paso + 4}: ${t[4]} + ${paso + 4} = ${sig}.`,
      };
    }
    if (tipo === "enesimo") {
      const n = ctx.azar.entero(10, 10 + d * 6);
      const t = [inicio, inicio + paso, inicio + 2 * paso, inicio + 3 * paso];
      const r = inicio + (n - 1) * paso;
      return {
        enunciado: `En la progresión ${t.join(", ")}, …, ¿cuál es el término que ocupa el lugar ${n}?`,
        respuesta: num(r),
        distractores: [
          { valor: num(inicio + n * paso), codigo: "usa_n_en_vez_de_n_menos_1" },
          { valor: num(n * paso), codigo: "olvida_el_primer_termino" },
          { valor: num(t[3] + paso), codigo: "da_el_siguiente_termino" },
        ],
        pistas: [
          "En una progresión aritmética siempre se suma la misma cantidad.",
          `Del primer término al término ${n} hay ${n} − 1 saltos.`,
          `Usa: primer término + (n − 1) × diferencia, con diferencia ${paso}.`,
        ],
        explicacion: `aₙ = a₁ + (n − 1) · d = ${inicio} + ${n - 1} × ${paso} = ${r}.`,
      };
    }
    const resta = tipo === "resta";
    const a0 = resta ? inicio + paso * 5 : inicio;
    const s = resta ? -paso : paso;
    const t = [a0, a0 + s, a0 + 2 * s, a0 + 3 * s];
    const sig = a0 + 4 * s;
    return {
      enunciado: `¿Qué número sigue en la secuencia ${t.map(fmt).join(", ")}, …?`,
      respuesta: num(sig),
      distractores: [
        { valor: num(t[3] - s), codigo: "invierte_el_sentido" },
        { valor: num(t[3] + s + (resta ? -1 : 1)), codigo: "error_de_conteo" },
        { valor: num(t[3]), codigo: "repite_ultimo" },
      ],
      pistas: [
        "Mira cuánto cambia de un número al siguiente.",
        resta ? "Los números van bajando: cada vez se quita lo mismo." : "Los números van subiendo: cada vez se agrega lo mismo.",
        `Cada vez se ${resta ? "resta" : "suma"} ${paso}.`,
      ],
      explicacion: `La secuencia ${resta ? "disminuye" : "aumenta"} de ${paso} en ${paso}: ${t[3]} ${resta ? "−" : "+"} ${paso} = ${sig}.`,
    };
  },
};

export const generadorPatrones = crearGenerador("mat.patrones", 1, [secuencia]);
