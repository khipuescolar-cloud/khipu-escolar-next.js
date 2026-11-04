// Responsable: B (specs/43). `mat.ecuaciones`: ecuaciones lineales de una incógnita con solución entera. En primaria la
// solución y todos los números son positivos; en secundaria, desde dificultad 3, puede haber negativos.
import { crearGenerador, fmt, num, type Problema, type Subtipo } from "./comun";

/** «3x + −2» → «3x − 2». */
const limpiar = (s: string) => s.replace(/\+ −/g, "− ").replace(/− −/g, "+ ").replace(/\b1x/g, "x");

const lineal: Subtipo = {
  nombre: "lineal",
  desde: 1,
  claves: ["ecuacion", "incognita", "despej", "igualdad"],
  crear(ctx): Problema {
    const negativos = ctx.efectivo >= 7 && ctx.dificultad >= 3;
    const tope = 5 + ctx.dificultad * 3;
    let x = ctx.azar.entero(negativos ? -tope : 1, tope);
    if (x === 0) x = 1;
    const a = ctx.azar.entero(2, 2 + ctx.dificultad);
    const b = ctx.azar.entero(negativos ? -tope : 1, tope) || 1;
    const d = ctx.dificultad;

    if (d === 1) {
      const c = x + b;
      return {
        enunciado: limpiar(`Resuelve: x + ${fmt(b)} = ${fmt(c)}. ¿Cuánto vale x?`),
        respuesta: num(x),
        distractores: [
          { valor: num(c + b), codigo: "no_invierte_operacion" },
          { valor: num(c), codigo: "copia_resultado" },
          { valor: num(x + 1), codigo: "error_de_calculo" },
        ],
        pistas: [
          "Piensa en una balanza: lo que haces en un lado, hazlo en el otro.",
          `Para dejar sola a x, quita ${fmt(b)} de ambos lados.`,
          `Calcula ${fmt(c)} − ${fmt(b)}.`,
        ],
        explicacion: limpiar(`x + ${fmt(b)} = ${fmt(c)} → x = ${fmt(c)} − ${fmt(b)} = ${fmt(x)}. Comprueba: ${fmt(x)} + ${fmt(b)} = ${fmt(c)}.`),
      };
    }
    if (d === 2) {
      const c = a * x;
      return {
        enunciado: `Resuelve: ${a}x = ${fmt(c)}. ¿Cuánto vale x?`,
        respuesta: num(x),
        distractores: [
          { valor: num(c - a), codigo: "resta_en_vez_de_dividir" },
          { valor: num(c * a), codigo: "multiplica_en_vez_de_dividir" },
          { valor: num(-x), codigo: "error_de_signo" },
        ],
        pistas: [
          `${a}x significa ${a} veces x.`,
          `Para dejar sola a x, divide ambos lados entre ${a}.`,
          `Calcula ${fmt(c)} ÷ ${a}.`,
        ],
        explicacion: `${a}x = ${fmt(c)} → x = ${fmt(c)} ÷ ${a} = ${fmt(x)}. Comprueba: ${a} · ${fmt(x)} = ${fmt(c)}.`,
      };
    }
    if (d === 3 || ctx.efectivo < 7) {
      const c = a * x + b;
      return {
        enunciado: limpiar(`Resuelve: ${a}x + ${fmt(b)} = ${fmt(c)}. ¿Cuánto vale x?`),
        respuesta: num(x),
        distractores: [
          { valor: num((c + b) / a), codigo: "no_cambia_signo_al_transponer" },
          { valor: num(c / a - b), codigo: "divide_antes_de_restar" },
          { valor: num(-x), codigo: "error_de_signo" },
        ],
        pistas: [
          "Primero aísla el término con x; después ocúpate del número que lo multiplica.",
          `Quita ${fmt(b)} de ambos lados de la igualdad.`,
          limpiar(`Te queda ${a}x = ${fmt(c)} − ${fmt(b)}; luego divide entre ${a}.`),
        ],
        explicacion: limpiar(`${a}x + ${fmt(b)} = ${fmt(c)} → ${a}x = ${fmt(c - b)} → x = ${fmt(c - b)} ÷ ${a} = ${fmt(x)}.`),
      };
    }
    if (d === 4) {
      const cx = ctx.azar.entero(1, a - 1);
      const dd = (a - cx) * x + b;
      return {
        enunciado: limpiar(`Resuelve: ${a}x + ${fmt(b)} = ${cx}x + ${fmt(dd)}. ¿Cuánto vale x?`),
        respuesta: num(x),
        distractores: [
          { valor: num((dd - b) / (a + cx)), codigo: "suma_terminos_con_x_en_vez_de_restar" },
          { valor: num((dd + b) / (a - cx)), codigo: "no_cambia_signo_al_transponer" },
          { valor: num(-x), codigo: "error_de_signo" },
        ],
        pistas: [
          "Junta los términos con x en un lado y los números en el otro.",
          `Resta ${cx}x a ambos lados y resta ${fmt(b)} a ambos lados.`,
          limpiar(`Te queda ${a - cx}x = ${fmt(dd)} − ${fmt(b)}.`),
        ],
        explicacion: limpiar(`${a}x − ${cx}x = ${fmt(dd)} − ${fmt(b)} → ${a - cx}x = ${fmt(dd - b)} → x = ${fmt(x)}.`),
      };
    }
    const c = a * (x + b);
    return {
      enunciado: limpiar(`Resuelve: ${a}(x + ${fmt(b)}) = ${fmt(c)}. ¿Cuánto vale x?`),
      respuesta: num(x),
      distractores: [
        { valor: num(c - a * b + b === c ? c : (c - b) / a), codigo: "no_distribuye" },
        { valor: num(c / a + b), codigo: "no_cambia_signo_al_transponer" },
        { valor: num(-x), codigo: "error_de_signo" },
      ],
      pistas: [
        "Puedes dividir ambos lados entre el número que está fuera del paréntesis.",
        `Divide ${fmt(c)} entre ${a}.`,
        limpiar(`Te queda x + ${fmt(b)} = ${fmt(c / a)}; ahora despeja x.`),
      ],
      explicacion: limpiar(`${a}(x + ${fmt(b)}) = ${fmt(c)} → x + ${fmt(b)} = ${fmt(c / a)} → x = ${fmt(x)}.`),
    };
  },
};

/** En 1.°–4.° de primaria la incógnita se escribe «□» (como en los textos escolares); desde 5.°, «x». */
const conCuadro: Subtipo = {
  ...lineal,
  crear(ctx) {
    const p = lineal.crear(ctx);
    if (ctx.efectivo > 4) return p;
    const cambiar = (t: string) => t.replace(/(\d)x\b/g, "$1 × □").replace(/\bx\b/g, "□");
    return {
      ...p,
      enunciado: cambiar(p.enunciado),
      pistas: p.pistas.map(cambiar) as Problema["pistas"],
      explicacion: cambiar(p.explicacion),
    };
  },
};

export const generadorEcuaciones = crearGenerador("mat.ecuaciones", 1, [conCuadro]);
