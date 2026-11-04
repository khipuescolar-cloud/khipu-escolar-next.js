// Responsable: B (specs/43). `mat.geometria`: perímetro y área de cuadrado, rectángulo, triángulo y figuras compuestas
// (en L), y círculo con π ≈ 3,14 en secundaria. Siempre con unidades.
import { crearGenerador, fmt, num, type ContextoProblema, type Problema, type Subtipo } from "./comun";

const unidad = (ctx: ContextoProblema) => (ctx.azar.siguiente() < 0.5 ? "cm" : "m");
const lado = (ctx: ContextoProblema) => ctx.azar.entero(2, 4 + ctx.dificultad * 3 + (ctx.efectivo >= 6 ? 6 : 0));

const perimetro: Subtipo = {
  nombre: "perimetro",
  desde: 3,
  claves: ["perimetro", "contorno"],
  crear(ctx): Problema {
    const u = unidad(ctx);
    const cuadrado = ctx.azar.siguiente() < 0.35;
    const a = lado(ctx);
    let b = lado(ctx);
    if (b === a) b++;
    if (cuadrado) {
      return {
        enunciado: `Un terreno cuadrado mide ${a} ${u} de lado. ¿Cuál es su perímetro?`,
        respuesta: num(4 * a),
        unidad: u,
        distractores: [
          { valor: num(a * a), codigo: "confunde_area_y_perimetro" },
          { valor: num(2 * a), codigo: "suma_solo_dos_lados" },
          { valor: num(3 * a), codigo: "olvida_un_lado" },
        ],
        pistas: [
          "El perímetro es la medida del contorno: la suma de todos los lados.",
          "Un cuadrado tiene 4 lados iguales.",
          `Suma ${a} cuatro veces, o multiplica 4 × ${a}.`,
        ],
        explicacion: `Perímetro del cuadrado = 4 × lado = 4 × ${a} = ${4 * a} ${u}.`,
      };
    }
    return {
      enunciado: `Un patio rectangular mide ${a} ${u} de largo y ${b} ${u} de ancho. ¿Cuál es su perímetro?`,
      respuesta: num(2 * (a + b)),
      unidad: u,
      distractores: [
        { valor: num(a * b), codigo: "confunde_area_y_perimetro" },
        { valor: num(a + b), codigo: "suma_solo_dos_lados" },
        { valor: num(2 * a + b), codigo: "olvida_un_lado" },
      ],
      pistas: [
        "El perímetro es la medida del contorno: la suma de todos los lados.",
        "Un rectángulo tiene dos lados largos iguales y dos lados anchos iguales.",
        `Suma ${a} + ${b} + ${a} + ${b}.`,
      ],
      explicacion: `Perímetro = 2 × (largo + ancho) = 2 × (${a} + ${b}) = ${2 * (a + b)} ${u}.`,
    };
  },
};

const area: Subtipo = {
  nombre: "area",
  desde: 4,
  claves: ["area", "superficie"],
  crear(ctx): Problema {
    const u = unidad(ctx);
    const forma = ctx.dificultad <= 2 ? "rectangulo" : ctx.azar.elegir(ctx.dificultad >= 5 ? ["triangulo", "compuesta"] : ["rectangulo", "triangulo"]);
    const a = lado(ctx);
    let b = lado(ctx);
    if (b === a) b++;
    if (forma === "triangulo") {
      const base = a % 2 === 0 ? a : a + 1;
      return {
        enunciado: `Un triángulo tiene ${base} ${u} de base y ${b} ${u} de altura. ¿Cuál es su área?`,
        respuesta: num((base * b) / 2),
        unidad: `${u}²`,
        distractores: [
          { valor: num(base * b), codigo: "olvida_dividir_entre_2" },
          { valor: num(base + b), codigo: "suma_en_vez_de_multiplicar" },
          { valor: num(2 * (base + b)), codigo: "confunde_area_y_perimetro" },
        ],
        pistas: [
          "Un triángulo es la mitad de un rectángulo con la misma base y altura.",
          "Multiplica la base por la altura.",
          `Calcula ${base} × ${b} y divide el resultado entre 2.`,
        ],
        explicacion: `Área del triángulo = base × altura ÷ 2 = ${base} × ${b} ÷ 2 = ${(base * b) / 2} ${u}².`,
      };
    }
    if (forma === "compuesta") {
      const c = ctx.azar.entero(1, a - 1 || 1);
      const d = ctx.azar.entero(1, b - 1 || 1);
      const r = a * b - c * d;
      return {
        enunciado: `A un rectángulo de ${a} ${u} por ${b} ${u} se le quita una esquina rectangular de ${c} ${u} por ${d} ${u} (queda una figura en forma de L). ¿Cuál es el área de la figura?`,
        respuesta: num(r),
        unidad: `${u}²`,
        distractores: [
          { valor: num(a * b), codigo: "no_resta_la_esquina" },
          { valor: num(a * b + c * d), codigo: "suma_la_esquina" },
          { valor: num(2 * (a + b)), codigo: "confunde_area_y_perimetro" },
        ],
        pistas: [
          "Piensa en el rectángulo completo y luego en lo que le falta.",
          `Calcula el área del rectángulo grande y la de la esquina por separado.`,
          `Resta: ${a} × ${b} − ${c} × ${d}.`,
        ],
        explicacion: `Área = ${a} × ${b} − ${c} × ${d} = ${a * b} − ${c * d} = ${r} ${u}².`,
      };
    }
    return {
      enunciado: `Un aula rectangular mide ${a} ${u} de largo y ${b} ${u} de ancho. ¿Cuál es su área?`,
      respuesta: num(a * b),
      unidad: `${u}²`,
      distractores: [
        { valor: num(2 * (a + b)), codigo: "confunde_area_y_perimetro" },
        { valor: num(a + b), codigo: "suma_en_vez_de_multiplicar" },
        { valor: num(a * b + a), codigo: "error_de_calculo" },
      ],
      pistas: [
        "El área mide cuántos cuadraditos de 1 × 1 caben dentro de la figura.",
        "En un rectángulo, el área se obtiene multiplicando el largo por el ancho.",
        `Calcula ${a} × ${b}.`,
      ],
      explicacion: `Área del rectángulo = largo × ancho = ${a} × ${b} = ${a * b} ${u}².`,
    };
  },
};

const circulo: Subtipo = {
  nombre: "circulo",
  desde: 7,
  claves: ["circulo", "circunferencia"],
  crear(ctx): Problema {
    const r = ctx.azar.entero(1, 3 + ctx.dificultad * 2);
    const u = unidad(ctx);
    const pideArea = ctx.dificultad >= 3 && ctx.azar.siguiente() < 0.5;
    const valor = Math.round((pideArea ? 3.14 * r * r : 2 * 3.14 * r) * 100) / 100;
    return {
      enunciado: `Un círculo tiene ${r} ${u} de radio. Usando π ≈ 3,14, calcula ${pideArea ? "su área" : "la longitud de su circunferencia"}.`,
      respuesta: num(valor),
      unidad: pideArea ? `${u}²` : u,
      decimales: 2,
      tolerancia: 0.01,
      distractores: pideArea
        ? [
            { valor: num(Math.round(2 * 3.14 * r * 100) / 100), codigo: "confunde_area_y_perimetro" },
            { valor: num(Math.round(3.14 * 2 * r * 100) / 100 + 0.01), codigo: "usa_diametro_sin_elevar" },
            { valor: num(Math.round(3.14 * 4 * r * r * 100) / 100), codigo: "usa_diametro_en_vez_de_radio" },
          ]
        : [
            { valor: num(Math.round(3.14 * r * 100) / 100), codigo: "olvida_multiplicar_por_2" },
            { valor: num(Math.round(3.14 * r * r * 100) / 100), codigo: "confunde_area_y_perimetro" },
            { valor: num(Math.round(4 * 3.14 * r * 100) / 100), codigo: "usa_diametro_en_vez_de_radio" },
          ],
      pistas: [
        pideArea ? "El área del círculo se calcula con π × radio × radio." : "La longitud de la circunferencia es π × diámetro.",
        pideArea ? `Eleva el radio al cuadrado: ${r} × ${r}.` : `El diámetro es el doble del radio: 2 × ${r}.`,
        pideArea ? `Multiplica 3,14 × ${r * r}.` : `Multiplica 3,14 × ${2 * r}.`,
      ],
      explicacion: pideArea
        ? `Área = π × r² ≈ 3,14 × ${r * r} = ${fmt(valor)} ${u}².`
        : `Longitud = 2 × π × r ≈ 2 × 3,14 × ${r} = ${fmt(valor)} ${u}.`,
    };
  },
};

export const generadorGeometria = crearGenerador("mat.geometria", 1, [perimetro, area, circulo]);
