// Responsable: B (specs/43). `mat.operaciones`: suma, resta, multiplicación, división (exacta y con resto) y operaciones
// combinadas, en forma directa o como problema de enunciado (dificultad ≥ 3). Sin resultados negativos en primaria.
import { crearGenerador, cuantos, fmt, limiteNumerico, NOMBRES, num, OBJETOS, type ContextoProblema, type Problema, type Subtipo } from "./comun";

/** Suma dígito a dígito sin «llevar» (error típico). */
function sumaSinLlevar(a: number, b: number): number {
  let r = 0;
  for (let p = 1; a > 0 || b > 0; p *= 10, a = Math.floor(a / 10), b = Math.floor(b / 10)) r += ((a % 10) + (b % 10)) % 10 * p;
  return r;
}
/** Resta dígito a dígito «el mayor menos el menor» (error típico de no prestar). */
function restaSinPrestar(a: number, b: number): number {
  let r = 0;
  for (let p = 1; a > 0 || b > 0; p *= 10, a = Math.floor(a / 10), b = Math.floor(b / 10)) r += Math.abs((a % 10) - (b % 10)) * p;
  return r;
}

const enunciadoConContexto = (ctx: ContextoProblema) => ctx.dificultad >= 3;

const suma: Subtipo = {
  nombre: "suma",
  desde: 1,
  hasta: 6,
  claves: ["suma", "adicion"],
  crear(ctx) {
    const lim = limiteNumerico(ctx.efectivo, ctx.dificultad);
    const a = ctx.azar.entero(Math.ceil(lim / 4), lim);
    const b = ctx.azar.entero(1, lim);
    const r = a + b;
    const quien = ctx.azar.elegir(NOMBRES);
    const obj = ctx.azar.elegir(OBJETOS);
    const enunciado = enunciadoConContexto(ctx)
      ? `${quien} tenía ${a} ${obj.plural} y le regalaron ${b} más. ¿${cuantos(obj)} ${obj.plural} tiene ahora?`
      : `Calcula: ${a} + ${b}`;
    return {
      enunciado,
      respuesta: num(r),
      distractores: [
        { valor: num(sumaSinLlevar(a, b)), codigo: "olvida_llevar" },
        { valor: num(Math.abs(a - b)), codigo: "resta_en_vez_de_sumar" },
        { valor: num(r + 10), codigo: "lleva_de_mas" },
      ],
      pistas: [
        enunciadoConContexto(ctx) ? "Juntar o agregar cantidades es sumar." : "Ordena los números uno debajo del otro: unidades con unidades y decenas con decenas.",
        "Suma primero las unidades. Si pasa de 9, lleva 1 a la columna siguiente.",
        `Suma ${a} + ${b} columna por columna, empezando por las unidades.`,
      ],
      explicacion: `Se suman ${a} y ${b} columna por columna, desde las unidades, llevando cuando la suma pasa de 9: ${a} + ${b} = ${r}.`,
    };
  },
};

const resta: Subtipo = {
  nombre: "resta",
  desde: 1,
  hasta: 6,
  claves: ["resta", "sustraccion"],
  crear(ctx) {
    const lim = limiteNumerico(ctx.efectivo, ctx.dificultad);
    const a = ctx.azar.entero(Math.max(2, Math.ceil(lim / 3)), lim);
    const b = ctx.azar.entero(1, a - 1);
    const r = a - b;
    const quien = ctx.azar.elegir(NOMBRES);
    const enunciado = enunciadoConContexto(ctx)
      ? `${quien} ahorró S/ ${a} y gastó S/ ${b} en útiles. ¿Cuántos soles le quedan?`
      : `Calcula: ${a} − ${b}`;
    return {
      enunciado,
      respuesta: num(r),
      ...(enunciadoConContexto(ctx) ? { unidad: "soles" } : {}),
      distractores: [
        { valor: num(restaSinPrestar(a, b)), codigo: "resta_menor_de_mayor" },
        { valor: num(a + b), codigo: "suma_en_vez_de_restar" },
        { valor: num(r + 10), codigo: "olvida_prestar" },
      ],
      pistas: [
        enunciadoConContexto(ctx) ? "Si gastas, lo que tienes disminuye: es una resta." : "Escribe el número mayor arriba y el menor abajo, alineando las unidades.",
        "Si arriba hay una cifra menor que abajo, pide prestada una decena a la columna de la izquierda.",
        `Resta ${a} − ${b} columna por columna. Puedes comprobar sumando el resultado con ${b}.`,
      ],
      explicacion: `${a} − ${b} = ${r}. Para comprobar: ${r} + ${b} = ${a}.`,
    };
  },
};

const multiplicacion: Subtipo = {
  nombre: "multiplicacion",
  desde: 3,
  hasta: 7,
  claves: ["multiplic", "producto", "tabla"],
  crear(ctx) {
    const lim = limiteNumerico(ctx.efectivo, ctx.dificultad);
    const maxA = ctx.efectivo <= 3 ? 10 : Math.max(10, Math.floor(lim / 10));
    const a = ctx.azar.entero(2, Math.min(maxA, 999));
    const b = ctx.azar.entero(2, ctx.efectivo <= 3 ? 10 : Math.min(12 + ctx.dificultad * 4, 99));
    const r = a * b;
    const obj = ctx.azar.elegir(OBJETOS);
    const enunciado = enunciadoConContexto(ctx)
      ? `En una tienda hay ${b} cajas con ${a} ${obj.plural} cada una. ¿${cuantos(obj)} ${obj.plural} hay en total?`
      : `Calcula: ${a} × ${b}`;
    return {
      enunciado,
      respuesta: num(r),
      distractores: [
        { valor: num(a + b), codigo: "suma_en_vez_de_multiplicar" },
        { valor: num(a * (b - 1)), codigo: "error_en_tabla" },
        { valor: num(r + a * 10), codigo: "error_de_posicion" },
      ],
      pistas: [
        enunciadoConContexto(ctx) ? "Cuando un grupo se repite varias veces, puedes multiplicar." : "Multiplicar es sumar el mismo número varias veces.",
        `Puedes descomponer: multiplica ${a} por las unidades y por las decenas de ${b} por separado.`,
        `Calcula ${a} × ${b}; comprueba que el resultado dividido entre ${b} da ${a}.`,
      ],
      explicacion: `${a} × ${b} = ${r}, porque ${b} grupos de ${a} hacen ${r}.`,
    };
  },
};

const division: Subtipo = {
  nombre: "division",
  desde: 4,
  hasta: 7,
  claves: ["divis", "cociente", "reparto", "resto", "residuo"],
  crear(ctx) {
    const divisor = ctx.azar.entero(2, ctx.efectivo <= 4 ? 9 : 9 + ctx.dificultad * 3);
    const cociente = ctx.azar.entero(2, Math.max(3, Math.floor(limiteNumerico(ctx.efectivo, ctx.dificultad) / (divisor * 4))));
    const conResto = ctx.efectivo >= 5 && ctx.dificultad >= 2 && ctx.azar.siguiente() < 0.6;
    const resto = conResto ? ctx.azar.entero(1, divisor - 1) : 0;
    const dividendo = divisor * cociente + resto;
    const preguntaResto = conResto && ctx.azar.siguiente() < 0.4;
    const obj = ctx.azar.elegir(OBJETOS);
    const enunciado = enunciadoConContexto(ctx)
      ? `Se reparten ${dividendo} ${obj.plural} entre ${divisor} niños en partes iguales. ${preguntaResto ? `¿${cuantos(obj)} ${obj.plural} sobran?` : `¿${cuantos(obj)} ${obj.plural} recibe cada niño?`}`
      : `Divide ${dividendo} ÷ ${divisor}. ${preguntaResto ? "¿Cuál es el residuo?" : conResto ? "¿Cuál es el cociente (sin decimales)?" : "¿Cuál es el resultado?"}`;
    const r = preguntaResto ? resto : cociente;
    return {
      enunciado,
      respuesta: num(r),
      distractores: [
        { valor: num(preguntaResto ? cociente : resto || cociente + 1), codigo: preguntaResto ? "confunde_cociente_y_residuo" : resto ? "confunde_cociente_y_residuo" : "error_en_tabla" },
        { valor: num(dividendo - divisor), codigo: "resta_en_vez_de_dividir" },
        { valor: num(preguntaResto ? resto + 1 : cociente - 1), codigo: "error_en_tabla" },
      ],
      pistas: [
        "Dividir es repartir en partes iguales.",
        `Busca cuántas veces cabe ${divisor} en ${dividendo}: piensa en la tabla del ${divisor}.`,
        `Multiplica ${divisor} por distintos números hasta acercarte a ${dividendo} sin pasarte.`,
      ],
      explicacion: `${dividendo} ÷ ${divisor}: el cociente es ${cociente} y el residuo es ${resto}, porque ${divisor} × ${cociente} + ${resto} = ${dividendo}.`,
    };
  },
};

const combinadas: Subtipo = {
  nombre: "combinadas",
  desde: 6,
  claves: ["combinad", "jerarquia", "entero"],
  crear(ctx): Problema {
    const permiteNeg = ctx.efectivo >= 7 && ctx.dificultad >= 3;
    const tope = 5 + ctx.dificultad * 4;
    const a = ctx.azar.entero(permiteNeg ? -tope : 1, tope);
    const b = ctx.azar.entero(2, tope);
    const c = ctx.azar.entero(2, 9);
    const forma = ctx.azar.entero(0, 1);
    const enunciado = forma === 0 ? `Calcula: ${fmt(a)} + ${b} × ${c}` : `Calcula: (${fmt(a)} + ${b}) × ${c}`;
    const r = forma === 0 ? a + b * c : (a + b) * c;
    const sinJerarquia = forma === 0 ? (a + b) * c : a + b * c;
    return {
      enunciado,
      respuesta: num(r),
      distractores: [
        { valor: num(sinJerarquia), codigo: forma === 0 ? "ignora_jerarquia" : "ignora_parentesis" },
        { valor: num(-r), codigo: "error_de_signo" },
        { valor: num(a + b + c), codigo: "suma_todo" },
      ],
      pistas: [
        "Recuerda el orden: primero lo que está entre paréntesis, luego multiplicaciones y divisiones, al final sumas y restas.",
        forma === 0 ? `Aquí no hay paréntesis: resuelve primero ${b} × ${c}.` : `Primero resuelve lo que está dentro del paréntesis: ${fmt(a)} + ${b}.`,
        forma === 0 ? `Calcula ${b} × ${c} y súmale ${fmt(a)}.` : `Multiplica el resultado del paréntesis por ${c}.`,
      ],
      explicacion: forma === 0
        ? `Primero la multiplicación: ${b} × ${c} = ${b * c}; luego ${fmt(a)} + ${b * c} = ${fmt(r)}.`
        : `Primero el paréntesis: ${fmt(a)} + ${b} = ${fmt(a + b)}; luego ${fmt(a + b)} × ${c} = ${fmt(r)}.`,
    };
  },
};

export const generadorOperaciones = crearGenerador("mat.operaciones", 1, [suma, resta, multiplicacion, division, combinadas]);
