// Responsable: B (specs/43). `mat.fracciones`: equivalentes, comparar, sumar/restar con igual y distinto denominador y
// simplificar. Nunca hay denominador 0 ni restas con resultado negativo en primaria.
import { crearGenerador, frac, fmtFrac, mcd, mcm, type Problema, type Subtipo } from "./comun";

const maxDen = (d: number) => [4, 6, 8, 10, 12][d - 1];

const equivalentes: Subtipo = {
  nombre: "equivalentes",
  desde: 3,
  hasta: 7,
  claves: ["equivalent", "amplific"],
  crear(ctx): Problema {
    const den = ctx.azar.entero(2, maxDen(ctx.dificultad));
    const n = ctx.azar.entero(1, den - 1);
    const k = ctx.azar.entero(2, 1 + ctx.dificultad + 1);
    const nuevoDen = den * k;
    return {
      enunciado: `Completa la fracción equivalente: ${fmtFrac(n, den)} = ?/${nuevoDen}`,
      respuesta: frac(n * k, nuevoDen),
      aceptarEquivalentes: false,
      pideSimplificar: false,
      distractores: [
        { valor: frac(n, nuevoDen), codigo: "solo_denominador" },
        { valor: frac(n + (nuevoDen - den), nuevoDen), codigo: "suma_en_vez_de_multiplicar" },
        { valor: frac(n * k + 1, nuevoDen), codigo: "error_de_calculo" },
      ],
      pistas: [
        "Las fracciones equivalentes representan la misma parte del todo.",
        `Mira cuántas veces cabe ${den} en ${nuevoDen}: por ese número se multiplicó el denominador.`,
        `El denominador se multiplicó por ${k}; haz lo mismo con el numerador ${n}.`,
      ],
      explicacion: `${den} × ${k} = ${nuevoDen}; el numerador también se multiplica por ${k}: ${n} × ${k} = ${n * k}. Así ${fmtFrac(n, den)} = ${fmtFrac(n * k, nuevoDen)}.`,
    };
  },
};

const comparar: Subtipo = {
  nombre: "comparar",
  desde: 3,
  hasta: 7,
  claves: ["compar", "orden", "mayor", "menor"],
  formatos: ["opcion_multiple"],
  crear(ctx): Problema {
    const top = maxDen(ctx.dificultad);
    let a = { n: 1, d: 2 };
    let b = { n: 1, d: 3 };
    for (let i = 0; i < 20; i++) {
      const igualDen = ctx.dificultad <= 2;
      const d1 = ctx.azar.entero(2, top);
      const d2 = igualDen ? d1 : ctx.azar.entero(2, top);
      a = { n: ctx.azar.entero(1, d1 - 1), d: d1 };
      b = { n: ctx.azar.entero(1, d2 - 1), d: d2 };
      if (a.n * b.d !== b.n * a.d) break;
    }
    if (a.n * b.d === b.n * a.d) b = { n: a.n === 1 ? 2 : a.n - 1, d: a.d + 1 };
    const [mayor, menor] = a.n * b.d > b.n * a.d ? [a, b] : [b, a];
    const codigoMenor = menor.d > mayor.d ? "mayor_denominador_es_mayor" : menor.n > mayor.n ? "compara_solo_numeradores" : "compara_sin_igualar";
    return {
      enunciado: `¿Cuál de estas fracciones es mayor: ${fmtFrac(a.n, a.d)} o ${fmtFrac(b.n, b.d)}?`,
      respuesta: frac(mayor.n, mayor.d),
      opcionesTexto: {
        correcta: fmtFrac(mayor.n, mayor.d),
        distractores: [
          { texto: fmtFrac(menor.n, menor.d), codigo: codigoMenor },
          { texto: "Son iguales", codigo: "cree_que_son_iguales" },
        ],
      },
      distractores: [],
      pistas: [
        "Para comparar fracciones conviene que tengan el mismo denominador.",
        a.d === b.d ? "Si el denominador es el mismo, compara los numeradores." : `Busca un denominador común para ${a.d} y ${b.d}.`,
        a.d === b.d ? "Con igual denominador, es mayor la que tiene más partes tomadas." : `Multiplica en cruz: ${a.n} × ${b.d} y ${b.n} × ${a.d}, y compara.`,
      ],
      explicacion: `Al comparar en cruz: ${a.n} × ${b.d} = ${a.n * b.d} y ${b.n} × ${a.d} = ${b.n * a.d}. Por eso ${fmtFrac(mayor.n, mayor.d)} es mayor.`,
    };
  },
};

function sumaResta(igualDen: boolean): Subtipo {
  return {
    nombre: igualDen ? "suma_igual_denominador" : "suma_distinto_denominador",
    desde: igualDen ? 4 : 5,
    claves: igualDen
      ? ["igual denominador", "homogene", "suma-fracciones", "sumar-fracciones", "resta-fracciones"]
      : ["distinto denominador", "heterogene", "suma-fracciones", "sumar-fracciones", "resta-fracciones"],
    crear(ctx): Problema {
      const top = maxDen(ctx.dificultad);
      const d1 = ctx.azar.entero(2, top);
      let den2 = d1;
      if (!igualDen) {
        den2 = ctx.azar.entero(2, top - 1);
        if (den2 >= d1) den2++;
      }
      let a = { n: ctx.azar.entero(1, d1 - 1), d: d1 };
      let b = { n: ctx.azar.entero(1, den2 - 1), d: den2 };
      let restar = ctx.azar.siguiente() < 0.5;
      if (restar && a.n * b.d < b.n * a.d) [a, b] = [b, a];
      if (a.n * b.d === b.n * a.d) restar = false;
      const comun = mcm(a.d, b.d);
      const na = a.n * (comun / a.d);
      const nb = b.n * (comun / b.d);
      const rn = restar ? na - nb : na + nb;
      const g = mcd(rn, comun);
      const pideSimplificar = ctx.dificultad >= 4;
      const signo = restar ? "−" : "+";
      const signoN = restar ? a.n - b.n : a.n + b.n;
      return {
        enunciado: `Calcula: ${fmtFrac(a.n, a.d)} ${signo} ${fmtFrac(b.n, b.d)}${pideSimplificar ? " (escribe el resultado simplificado)" : ""}`,
        respuesta: frac(rn / g, comun / g),
        pideSimplificar,
        aceptarEquivalentes: true,
        distractores: [
          { valor: frac(Math.abs(signoN), a.d + b.d), codigo: restar ? "resta_denominadores" : "suma_denominadores" },
          { valor: frac(Math.abs(signoN), Math.max(a.d, b.d)), codigo: "no_iguala_denominadores" },
          { valor: frac(rn + 1, comun), codigo: "error_de_calculo" },
        ],
        pistas: [
          a.d === b.d ? "Con el mismo denominador, el denominador se mantiene." : "Para sumar o restar fracciones necesitas el mismo denominador.",
          a.d === b.d ? `Opera solo los numeradores: ${a.n} ${signo} ${b.n}.` : `Busca el mínimo común múltiplo de ${a.d} y ${b.d} y convierte las dos fracciones.`,
          a.d === b.d ? `El denominador sigue siendo ${a.d}.${pideSimplificar ? " Luego simplifica." : ""}` : `Con denominador ${comun}: ${fmtFrac(na, comun)} ${signo} ${fmtFrac(nb, comun)}.`,
        ],
        explicacion:
          `${a.d === b.d ? `Igual denominador ${comun}` : `Denominador común ${comun}: ${fmtFrac(na, comun)} ${signo} ${fmtFrac(nb, comun)}`}; ` +
          `se operan los numeradores: ${fmtFrac(rn, comun)}${g > 1 ? `, que simplificado (÷ ${g}) es ${fmtFrac(rn / g, comun / g)}` : ""}. ` +
          "Nunca se suman ni restan los denominadores.",
      };
    },
  };
}

const simplificar: Subtipo = {
  nombre: "simplificar",
  desde: 5,
  claves: ["simplific", "irreducible"],
  crear(ctx): Problema {
    const d0 = ctx.azar.entero(2, maxDen(ctx.dificultad));
    const n0 = ctx.azar.entero(1, d0 - 1);
    const g0 = mcd(n0, d0);
    const n = n0 / g0;
    const d = d0 / g0;
    const k = ctx.azar.entero(2, 2 + ctx.dificultad);
    return {
      enunciado: `Simplifica hasta obtener una fracción irreducible: ${fmtFrac(n * k, d * k)}`,
      respuesta: frac(n, d),
      pideSimplificar: true,
      aceptarEquivalentes: true,
      distractores: [
        { valor: frac(n * k, d), codigo: "simplifica_solo_denominador" },
        { valor: frac(n, d * k), codigo: "simplifica_solo_numerador" },
        { valor: frac(d, n), codigo: "invierte_fraccion" },
      ],
      pistas: [
        "Simplificar es dividir el numerador y el denominador entre el mismo número.",
        `Busca un número que divida exactamente a ${n * k} y a ${d * k}.`,
        `Prueba dividir ambos entre ${k}, y revisa si aún se puede seguir.`,
      ],
      explicacion: `${n * k} y ${d * k} se pueden dividir entre ${k}: ${fmtFrac(n * k, d * k)} = ${fmtFrac(n, d)}, que ya no se puede simplificar.`,
    };
  },
};

export const generadorFracciones = crearGenerador("mat.fracciones", 1, [equivalentes, comparar, sumaResta(true), sumaResta(false), simplificar]);
