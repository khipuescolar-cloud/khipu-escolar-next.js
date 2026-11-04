// Responsable: B (specs/43). `mat.proporcionalidad`: regla de tres simple directa e inversa y razones. Resultados enteros.
import { crearGenerador, frac, fmtFrac, mcd, NOMBRES, num, OBJETOS, type Problema, type Subtipo } from "./comun";

const directa: Subtipo = {
  nombre: "regla_de_tres_directa",
  desde: 5,
  claves: ["directa", "regla de tres", "regla-de-tres", "proporcional"],
  crear(ctx): Problema {
    const precio = ctx.azar.entero(2, 3 + ctx.dificultad * 3);
    const a = ctx.azar.entero(2, 3 + ctx.dificultad * 2);
    let b = ctx.azar.entero(2, 5 + ctx.dificultad * 4);
    if (b === a) b++;
    const obj = ctx.azar.elegir(OBJETOS);
    const total = a * precio;
    const r = b * precio;
    return {
      enunciado: `Si ${a} ${obj.plural} cuestan S/ ${total}, ¿cuánto cuestan ${b} ${obj.plural} del mismo precio?`,
      respuesta: num(r),
      unidad: "soles",
      distractores: [
        { valor: num(total + (b - a)), codigo: "suma_diferencia_en_vez_de_proporcion" },
        { valor: num((a * total) / b), codigo: "inversa_en_vez_de_directa" },
        { valor: num(precio), codigo: "da_valor_unitario" },
      ],
      pistas: [
        "Si compras más unidades, pagas más: es una proporción directa.",
        `Averigua primero cuánto cuesta un solo ${obj.singular}.`,
        `Divide ${total} entre ${a} y multiplica el resultado por ${b}.`,
      ],
      explicacion: `Un ${obj.singular} cuesta ${total} ÷ ${a} = ${precio} soles; ${b} cuestan ${b} × ${precio} = ${r} soles.`,
    };
  },
};

const inversa: Subtipo = {
  nombre: "regla_de_tres_inversa",
  desde: 7,
  claves: ["inversa"],
  crear(ctx): Problema {
    const dias = ctx.azar.entero(2, 4 + ctx.dificultad * 2);
    const a = ctx.azar.entero(2, 4 + ctx.dificultad);
    const trabajo = a * dias;
    const divisores = Array.from({ length: trabajo }, (_, i) => i + 1).filter((x) => trabajo % x === 0 && x !== a && x > 1 && x < trabajo);
    const b = divisores.length ? ctx.azar.elegir(divisores) : a * 2;
    const r = trabajo / b;
    const quien = ctx.azar.elegir(NOMBRES);
    return {
      enunciado: `${a} pintores tardan ${dias} días en pintar el colegio de ${quien}. Si trabajan al mismo ritmo, ¿cuántos días tardarían ${b} pintores?`,
      respuesta: num(r),
      unidad: "días",
      decimales: Number.isInteger(r) ? 0 : 2,
      tolerancia: Number.isInteger(r) ? 0 : 0.01,
      distractores: [
        { valor: num((dias * b) / a), codigo: "directa_en_vez_de_inversa" },
        { valor: num(dias + (a - b)), codigo: "suma_diferencia_en_vez_de_proporcion" },
        { valor: num(trabajo), codigo: "olvida_dividir" },
      ],
      pistas: [
        "Si trabajan más personas, terminan en menos días: es una proporción inversa.",
        "Calcula el trabajo total en «días de un pintor»: pintores × días.",
        `Multiplica ${a} × ${dias} y divide el resultado entre ${b}.`,
      ],
      explicacion: `El trabajo total es ${a} × ${dias} = ${trabajo} días-pintor. Con ${b} pintores: ${trabajo} ÷ ${b} = ${r} días.`,
    };
  },
};

const razones: Subtipo = {
  nombre: "razones",
  desde: 5,
  claves: ["razon", "razones"],
  crear(ctx): Problema {
    let x = ctx.azar.entero(1, 3 + ctx.dificultad);
    let y = ctx.azar.entero(1, 3 + ctx.dificultad);
    if (x === y) y++;
    const g = mcd(x, y);
    x /= g;
    y /= g;
    const k = ctx.azar.entero(2, 2 + ctx.dificultad * 2);
    const ninas = x * k;
    const ninos = y * k;
    return {
      enunciado: `En un salón hay ${ninas} niñas y ${ninos} niños. Escribe la razón entre niñas y niños como fracción simplificada.`,
      respuesta: frac(x, y),
      pideSimplificar: true,
      aceptarEquivalentes: true,
      distractores: [
        { valor: frac(y, x), codigo: "invierte_razon" },
        { valor: frac(x, x + y), codigo: "parte_sobre_total" },
        { valor: frac(ninas, ninos + 1), codigo: "error_de_calculo" },
      ],
      pistas: [
        "Una razón compara dos cantidades dividiéndolas, en el orden en que se mencionan.",
        `Escribe primero ${ninas}/${ninos} (niñas sobre niños).`,
        `Divide ${ninas} y ${ninos} entre su mayor divisor común.`,
      ],
      explicacion: `Niñas : niños = ${fmtFrac(ninas, ninos)}; dividiendo ambos entre ${k} queda ${fmtFrac(x, y)}.`,
    };
  },
};

export const generadorProporcionalidad = crearGenerador("mat.proporcionalidad", 1, [directa, inversa, razones]);
