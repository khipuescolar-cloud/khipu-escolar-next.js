// Responsable: B (specs/43). `mat.porcentajes`: porcentaje de una cantidad, descuentos y aumentos, y qué porcentaje es
// una cantidad de otra. Resultados enteros (se eligen cantidades múltiplos adecuados).
import { crearGenerador, fmt, num, type Problema, type Subtipo } from "./comun";

const PORCENTAJES = [[50, 10], [50, 25, 10], [10, 20, 25, 50, 75], [5, 15, 20, 30, 40, 60, 75], [5, 12, 15, 35, 45, 65, 80]];
const PRENDAS = ["una casaca", "unas zapatillas", "una mochila", "un polo", "una chompa de alpaca"];

function cantidadPara(p: number, ctx: Parameters<Subtipo["crear"]>[0]): number {
  // N múltiplo de 100/mcd(p,100) para que p% de N sea entero.
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  const paso = 100 / g(p, 100);
  const maxK = Math.max(2, Math.floor((40 * ctx.dificultad * (ctx.efectivo >= 7 ? 5 : 1)) / paso));
  return paso * ctx.azar.entero(1, maxK) * (paso < 10 ? 10 : 1);
}

const porcentajeDe: Subtipo = {
  nombre: "porcentaje_de",
  desde: 5,
  claves: ["porcentaje de", "tanto por ciento"],
  crear(ctx): Problema {
    const p = ctx.azar.elegir(PORCENTAJES[ctx.dificultad - 1]);
    const n = cantidadPara(p, ctx);
    const r = (p * n) / 100;
    return {
      enunciado: `¿Cuánto es el ${p} % de ${n}?`,
      respuesta: num(r),
      distractores: [
        { valor: num(n - r), codigo: "calcula_el_complemento" },
        { valor: num(p), codigo: "confunde_porcentaje_con_cantidad" },
        { valor: num(n / p), codigo: "divide_entre_porcentaje" },
      ],
      pistas: [
        `${p} % significa ${p} de cada 100.`,
        p % 10 === 0 ? `Calcula primero el 10 % de ${n} (divide entre 10).` : `Calcula primero el 1 % de ${n} (divide entre 100).`,
        `Multiplica ${n} por ${p} y divide entre 100.`,
      ],
      explicacion: `${p} % de ${n} = ${n} × ${p} ÷ 100 = ${r}.`,
    };
  },
};

const descuento: Subtipo = {
  nombre: "descuento_aumento",
  desde: 6,
  claves: ["descuento", "aumento", "rebaja", "oferta"],
  crear(ctx): Problema {
    const p = ctx.azar.elegir(PORCENTAJES[ctx.dificultad - 1].filter((x) => x < 100));
    const precio = cantidadPara(p, ctx);
    const parte = (p * precio) / 100;
    const aumento = ctx.dificultad >= 4 && ctx.azar.siguiente() < 0.4;
    const r = aumento ? precio + parte : precio - parte;
    const prenda = ctx.azar.elegir(PRENDAS);
    return {
      enunciado: aumento
        ? `El pasaje de un bus interprovincial costaba S/ ${precio} y subió ${p} %. ¿Cuál es el nuevo precio?`
        : `${prenda[0].toUpperCase()}${prenda.slice(1)} cuesta S/ ${precio} y tiene ${p} % de descuento. ¿Cuánto pagas?`,
      respuesta: num(r),
      unidad: "soles",
      distractores: [
        { valor: num(parte), codigo: aumento ? "da_solo_el_aumento" : "da_solo_el_descuento" },
        { valor: num(aumento ? precio - parte : precio + parte), codigo: aumento ? "resta_en_vez_de_sumar" : "suma_en_vez_de_restar" },
        { valor: num(aumento ? precio + p : precio - p), codigo: "resta_el_porcentaje_como_soles" },
      ],
      pistas: [
        aumento ? "Un aumento se suma al precio original." : "Un descuento se resta del precio original.",
        `Primero calcula el ${p} % de ${precio}.`,
        `${p} % de ${precio} es ${parte}; ahora ${aumento ? "súmalo al" : "réstalo del"} precio.`,
      ],
      explicacion: `${p} % de ${precio} = ${parte}. ${aumento ? `Nuevo precio: ${precio} + ${parte}` : `Pagas: ${precio} − ${parte}`} = ${r} soles.`,
    };
  },
};

const quePorcentaje: Subtipo = {
  nombre: "que_porcentaje",
  desde: 7,
  claves: ["que porcentaje", "que-porcentaje"],
  crear(ctx): Problema {
    const p = ctx.azar.elegir(PORCENTAJES[ctx.dificultad - 1]);
    const total = cantidadPara(p, ctx);
    const parte = (p * total) / 100;
    return {
      enunciado: `En una encuesta a ${total} estudiantes, ${parte} prefieren el vóley. ¿Qué porcentaje del total prefiere el vóley?`,
      respuesta: num(p),
      unidad: "%",
      distractores: [
        { valor: num(100 - p), codigo: "calcula_el_complemento" },
        { valor: num(parte), codigo: "confunde_porcentaje_con_cantidad" },
        { valor: num(Math.round((total / parte) * 100) / 100), codigo: "invierte_division" },
      ],
      pistas: [
        "Un porcentaje compara una parte con el total, tomando el total como 100.",
        `Divide la parte (${parte}) entre el total (${total}).`,
        "Multiplica ese resultado por 100.",
      ],
      explicacion: `${parte} ÷ ${total} = ${fmt(parte / total)}; × 100 = ${p} %.`,
    };
  },
};

export const generadorPorcentajes = crearGenerador("mat.porcentajes", 1, [porcentajeDe, descuento, quePorcentaje]);
