// Escalas de calificación (specs/11-notas-y-libreta.md). Solo funciones puras: se usan en cliente y servidor.

export const LITERALES = ["AD", "A", "B", "C"] as const;
export type Literal = (typeof LITERALES)[number];
export type Escala = "literal" | "vigesimal";
/** Cómo se sugiere la calificación literal del periodo: promedio (con pesos) o la más frecuente. */
export type CalculoLiteral = "promedio" | "frecuente";

/** Valor de cada literal para promediar: AD = 4, A = 3, B = 2, C = 1. */
export const PUNTOS_LITERAL: Record<Literal, number> = { AD: 4, A: 3, B: 2, C: 1 };

export const INSTRUMENTOS = ["prueba_escrita", "lista_cotejo", "rubrica", "ficha_observacion", "otro"] as const;
export type Instrumento = (typeof INSTRUMENTOS)[number];
export const NOMBRE_INSTRUMENTO: Record<Instrumento, string> = {
  prueba_escrita: "Prueba escrita",
  lista_cotejo: "Lista de cotejo",
  rubrica: "Rúbrica",
  ficha_observacion: "Ficha de observación",
  otro: "Otro instrumento",
};

export const ETIQUETA_LITERAL: Record<Literal, string> = {
  AD: "Logro destacado",
  A: "Logro esperado",
  B: "En proceso",
  C: "En inicio",
};

/** Nota mínima aprobatoria de la escala vigesimal. */
export const APROBADO_VIGESIMAL = 11;

export type ValorCalificacion = { valorLiteral: Literal | null; valorNumerico: number | null };

export function esLiteral(v: string): v is Literal {
  return (LITERALES as readonly string[]).includes(v);
}

export function aprobado(nota: number, minimo = APROBADO_VIGESIMAL): boolean {
  return nota >= minimo;
}

/** Etiqueta amable de una nota vigesimal. */
export function etiquetaVigesimal(nota: number, minimo = APROBADO_VIGESIMAL): string {
  return aprobado(nota, minimo) ? "Aprobado" : "Por reforzar";
}

/** Texto corto de un valor (AD, A, B, C o el número). */
export function textoValor(valor: ValorCalificacion): string {
  if (valor.valorLiteral) return valor.valorLiteral;
  if (valor.valorNumerico !== null) return formatearNumero(valor.valorNumerico);
  return "—";
}

/** Texto con significado: «AD · Logro destacado» o «14 · Aprobado». */
export function textoValorLargo(valor: ValorCalificacion): string {
  if (valor.valorLiteral) return `${valor.valorLiteral} · ${ETIQUETA_LITERAL[valor.valorLiteral]}`;
  if (valor.valorNumerico !== null) return `${formatearNumero(valor.valorNumerico)} · ${etiquetaVigesimal(valor.valorNumerico)}`;
  return "—";
}

export function formatearNumero(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace(".", ",");
}

export function requiereConclusion(valor: Literal | null): boolean {
  return valor === "B" || valor === "C";
}

/**
 * Interpreta lo que escribió el profesor según la escala del colegio.
 * `valor: null` significa «borrar la nota» (campo vacío).
 */
export function interpretarValor(
  escala: Escala,
  texto: string,
): { ok: true; valor: ValorCalificacion | null } | { ok: false; error: string } {
  const t = texto.trim();
  if (t === "") return { ok: true, valor: null };
  if (escala === "literal") {
    const u = t.toUpperCase();
    if (!esLiteral(u)) return { ok: false, error: "Usa AD, A, B o C." };
    return { ok: true, valor: { valorLiteral: u, valorNumerico: null } };
  }
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 20) return { ok: false, error: "Escribe una nota entre 0 y 20." };
  return { ok: true, valor: { valorLiteral: null, valorNumerico: Math.round(n * 100) / 100 } };
}

/** Vigesimal: promedio ponderado por peso, redondeado al entero. Sin notas → null. */
export function sugerirVigesimal(items: { valor: number; peso: number }[]): number | null {
  const promedio = sugerirVigesimalSinRedondeo(items);
  return promedio === null ? null : Math.round(promedio);
}

/** Literal: el valor más frecuente; si empatan, gana el que tiene la nota más reciente. */
export function sugerirLiteral(items: { valor: Literal; fecha: Date | string }[]): Literal | null {
  if (items.length === 0) return null;
  const cuentas = new Map<Literal, { n: number; ultima: number }>();
  for (const { valor, fecha } of items) {
    const t = new Date(fecha).getTime();
    const previo = cuentas.get(valor);
    cuentas.set(valor, { n: (previo?.n ?? 0) + 1, ultima: Math.max(previo?.ultima ?? 0, t) });
  }
  let mejor: Literal | null = null;
  for (const [valor, c] of cuentas) {
    const m = mejor ? cuentas.get(mejor)! : null;
    if (!m || c.n > m.n || (c.n === m.n && c.ultima > m.ultima)) mejor = valor;
  }
  return mejor;
}

/**
 * Literal por promedio: AD = 4, A = 3, B = 2, C = 1, ponderado por peso. El promedio se redondea al literal más cercano
 * y los empates (x,5) suben: 2,5 → A, 3,5 → AD. Sin notas → null.
 */
export function promedioLiteral(items: { valor: Literal; peso: number }[]): Literal | null {
  const promedio = sugerirVigesimalSinRedondeo(items.map((i) => ({ valor: PUNTOS_LITERAL[i.valor], peso: i.peso })));
  if (promedio === null) return null;
  const puntos = Math.min(4, Math.max(1, Math.floor(promedio + 0.5 + 1e-9)));
  return (Object.keys(PUNTOS_LITERAL) as Literal[]).find((l) => PUNTOS_LITERAL[l] === puntos)!;
}

function sugerirVigesimalSinRedondeo(items: { valor: number; peso: number }[]): number | null {
  const validos = items.filter((i) => i.peso > 0);
  const pesoTotal = validos.reduce((s, i) => s + i.peso, 0);
  if (validos.length === 0 || pesoTotal === 0) return null;
  return validos.reduce((s, i) => s + i.valor * i.peso, 0) / pesoTotal;
}

export type NotaParaSugerir = {
  valorLiteral: Literal | null;
  valorNumerico: number | null;
  peso: number;
  fecha: Date | string;
};

/** Valor sugerido para una competencia según la escala (y, en literal, el cálculo) del colegio. */
export function sugerirCalificacion(escala: Escala, notas: NotaParaSugerir[], calculo: CalculoLiteral = "promedio"): ValorCalificacion | null {
  if (escala === "vigesimal") {
    const v = sugerirVigesimal(
      notas.filter((n) => n.valorNumerico !== null).map((n) => ({ valor: n.valorNumerico as number, peso: n.peso })),
    );
    return v === null ? null : { valorLiteral: null, valorNumerico: v };
  }
  const literales = notas.filter((n) => n.valorLiteral !== null);
  const l = calculo === "promedio"
    ? promedioLiteral(literales.map((n) => ({ valor: n.valorLiteral as Literal, peso: n.peso })))
    : sugerirLiteral(literales.map((n) => ({ valor: n.valorLiteral as Literal, fecha: n.fecha })));
  return l === null ? null : { valorLiteral: l, valorNumerico: null };
}

/** Cómo se explica la sugerencia al profesor. */
export function textoCalculo(escala: Escala, calculo: CalculoLiteral): string {
  if (escala === "vigesimal") return "el promedio con pesos, redondeado";
  return calculo === "promedio"
    ? "el promedio con pesos (AD = 4, A = 3, B = 2, C = 1), redondeado; 2,5 sube a A"
    : "la más frecuente; si empatan, la más reciente";
}
