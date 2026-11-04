// Responsable: B (specs/43). Piezas comunes de los generadores de Matemática: rangos por grado y dificultad, formato de
// números y fracciones, armado de opción múltiple con distractores ligados a errores típicos y conversión a
// `EjercicioConSolucion`. Puro y determinista (solo usa el `Azar` recibido).
import { crearAzar, type Azar } from "../../azar";
import type { Dificultad, EjercicioConSolucion, Generador, Tema, TipoEjercicio } from "../../contratos";

/** Grado «continuo»: primaria 1–6 → 1–6; secundaria 1–5 → 7–11. */
export function gradoEfectivo(tema: Pick<Tema, "nivel" | "grado">): number {
  return tema.nivel === "secundaria" ? 6 + tema.grado : tema.grado;
}

/**
 * Límite superior de los números con los que se trabaja. Creciente en grado y en dificultad (lo verifica el test):
 * 1.° prim. d1 = 10 … 6.° prim. d5 ≈ 100 000.
 */
export function limiteNumerico(efectivo: number, dificultad: Dificultad): number {
  const base = [10, 20, 100, 500, 1_000, 5_000, 10_000, 10_000, 20_000, 50_000, 100_000][Math.min(Math.max(efectivo, 1), 11) - 1];
  const factor = [0.2, 0.4, 0.6, 0.8, 1][dificultad - 1];
  return Math.max(10, Math.round(base * factor));
}

export type Valor = { tipo: "numero"; valor: number } | { tipo: "fraccion"; num: number; den: number };
export const num = (valor: number): Valor => ({ tipo: "numero", valor });
export const frac = (n: number, d: number): Valor => ({ tipo: "fraccion", num: n, den: d });

export type Problema = {
  enunciado: string;
  respuesta: Valor;
  unidad?: string;
  /** Numérico: decimales que se aceptan y tolerancia. */
  decimales?: number;
  tolerancia?: number;
  pideSimplificar?: boolean;
  aceptarEquivalentes?: boolean;
  /** Valores incorrectos frecuentes → código del error típico. */
  distractores: { valor: Valor; codigo: string }[];
  /** Si la respuesta no es un número (p. ej. «¿cuál es mayor?»): solo opción múltiple con estos textos. */
  opcionesTexto?: { correcta: string; distractores: { texto: string; codigo: string }[] };
  pistas: [string, string, string];
  explicacion: string;
};

export type ContextoProblema = { azar: Azar; efectivo: number; dificultad: Dificultad; tema: Tema };

export type Subtipo = {
  nombre: string;
  /** Rango de grado efectivo en que aplica (1–11). */
  desde: number;
  hasta?: number;
  /** Fragmentos (sin tildes) que, si aparecen en la clave/nombre/subtema del tema, lo restringen a este subtipo. */
  claves: string[];
  /** Formatos que puede producir (por defecto numérico/fracción y opción múltiple). */
  formatos?: TipoEjercicio[];
  crear(ctx: ContextoProblema): Problema;
};

export function mcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
export const mcm = (a: number, b: number) => Math.abs(a * b) / mcd(a, b);

export function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Número con coma decimal (uso escolar peruano) y sin separador de miles (más fácil de escribir). */
export function fmt(n: number): string {
  const r = Math.round(n * 10_000) / 10_000;
  return String(r).replace(".", ",").replace(/^-/, "−");
}
export const fmtFrac = (n: number, d: number) => `${n}/${d}`;
export function fmtValor(v: Valor, unidad?: string): string {
  const t = v.tipo === "numero" ? fmt(v.valor) : fmtFrac(v.num, v.den);
  return unidad ? `${t} ${unidad}` : t;
}

function mismoValor(a: Valor, b: Valor): boolean {
  const x = a.tipo === "numero" ? a.valor : a.num / a.den;
  const y = b.tipo === "numero" ? b.valor : b.num / b.den;
  return Math.abs(x - y) < 1e-9;
}

function valorValido(v: Valor, permiteNegativos: boolean): boolean {
  if (v.tipo === "numero") return Number.isFinite(v.valor) && (permiteNegativos || v.valor >= 0);
  return Number.isInteger(v.num) && Number.isInteger(v.den) && v.den > 0 && (permiteNegativos || v.num >= 0);
}

const IDS = ["a", "b", "c", "d", "e", "f"];

/** Distractores válidos, distintos entre sí y de la correcta (ni equivalentes); completa con errores de cálculo. */
export function distractoresFinales(p: Problema, ctx: ContextoProblema, cuantos = 3): { valor: Valor; codigo: string }[] {
  const permiteNeg = ctx.efectivo >= 7 || (p.respuesta.tipo === "numero" ? p.respuesta.valor < 0 : p.respuesta.num < 0);
  const elegidos: { valor: Valor; codigo: string }[] = [];
  const agregar = (d: { valor: Valor; codigo: string }) => {
    if (elegidos.length >= cuantos || !valorValido(d.valor, permiteNeg)) return;
    if (mismoValor(d.valor, p.respuesta) || elegidos.some((e) => mismoValor(e.valor, d.valor))) return;
    elegidos.push(d);
  };
  p.distractores.forEach(agregar);
  const r = p.respuesta;
  const paso = r.tipo === "numero" ? (Number.isInteger(r.valor) ? Math.max(1, Math.round(Math.abs(r.valor) / 10)) : 0.5) : 1;
  for (let k = 1; elegidos.length < cuantos && k < 50; k++) {
    for (const s of [1, -1]) {
      if (r.tipo === "numero") agregar({ valor: num(r.valor + s * k * paso), codigo: "error_de_calculo" });
      else agregar({ valor: frac(r.num + s * k, r.den), codigo: "error_de_calculo" });
    }
  }
  return elegidos;
}

function formatosDe(p: Problema): TipoEjercicio[] {
  if (p.opcionesTexto) return ["opcion_multiple"];
  return p.respuesta.tipo === "numero" ? ["numerico", "opcion_multiple"] : ["fraccion", "opcion_multiple"];
}

/** Convierte un problema en ejercicio con el formato permitido por el tema (o el primero del problema). */
export function materializar(g: { id: string; version: number }, ctx: ContextoProblema, semilla: number, p: Problema): EjercicioConSolucion {
  const posibles = formatosDe(p);
  const permitidos = posibles.filter((f) => ctx.tema.tipos.includes(f));
  const formato = permitidos.length ? ctx.azar.elegir(permitidos) : posibles[0];
  const base = { temaClave: ctx.tema.clave, dificultad: ctx.dificultad, fuenteId: `${g.id}@${g.version}`, semilla };
  const comun = { pistas: p.pistas, explicacion: p.explicacion };

  if (formato === "opcion_multiple") {
    const items = p.opcionesTexto
      ? [{ texto: p.opcionesTexto.correcta, codigo: null as string | null }, ...p.opcionesTexto.distractores]
      : [{ texto: fmtValor(p.respuesta, p.unidad), codigo: null as string | null }, ...distractoresFinales(p, ctx).map((d) => ({ texto: fmtValor(d.valor, p.unidad), codigo: d.codigo }))];
    const unicos = items.filter((x, i) => items.findIndex((y) => y.texto === x.texto) === i);
    const barajados = ctx.azar.barajar(unicos).map((x, i) => ({ ...x, id: IDS[i] }));
    const correcta = barajados.find((x) => x.codigo === null)!.id;
    const distractores = Object.fromEntries(barajados.filter((x) => x.codigo !== null).map((x) => [x.id, x.codigo as string]));
    return {
      publico: { ...base, tipo: "opcion_multiple", enunciado: p.enunciado, opciones: barajados.map(({ id, texto }) => ({ id, texto })) },
      solucion: { tipo: "opcion_multiple", correcta, distractores },
      ...comun,
    };
  }
  if (formato === "fraccion" && p.respuesta.tipo === "fraccion") {
    const pide = p.pideSimplificar ?? false;
    return {
      publico: { ...base, tipo: "fraccion", enunciado: p.enunciado, pideSimplificar: pide },
      solucion: { tipo: "fraccion", num: p.respuesta.num, den: p.respuesta.den, aceptarEquivalentes: p.aceptarEquivalentes ?? true },
      ...comun,
    };
  }
  if (p.respuesta.tipo !== "numero") throw new Error(`Formato ${formato} imposible para una fracción`);
  const decimales = p.decimales ?? (Number.isInteger(p.respuesta.valor) ? 0 : 2);
  return {
    publico: { ...base, tipo: "numerico", enunciado: p.enunciado, ...(p.unidad ? { unidad: p.unidad } : {}), decimalesPermitidos: decimales },
    solucion: { tipo: "numerico", valor: p.respuesta.valor, tolerancia: p.tolerancia ?? 0 },
    ...comun,
  };
}

/** Elige el subtipo: primero los que nombra el tema; luego los del grado; si ninguno aplica, el más cercano al grado. */
export function elegirSubtipo(subtipos: readonly Subtipo[], ctx: ContextoProblema): Subtipo {
  const texto = sinTildes([ctx.tema.clave, ctx.tema.nombre, ctx.tema.subtema ?? ""].join(" "));
  const delGrado = subtipos.filter((s) => s.desde <= ctx.efectivo && ctx.efectivo <= (s.hasta ?? 11));
  const nombrados = subtipos.filter((s) => s.claves.some((c) => texto.includes(c)));
  const nombradosDelGrado = nombrados.filter((s) => delGrado.includes(s));
  const posibles = nombradosDelGrado.length ? nombradosDelGrado : nombrados.length ? nombrados : delGrado;
  // Preferir los subtipos que pueden producir algún tipo admitido por el tema.
  const compatibles = posibles.filter((s) => !s.formatos || s.formatos.some((f) => ctx.tema.tipos.includes(f)));
  const candidatos = compatibles.length ? compatibles : posibles;
  if (candidatos.length) return ctx.azar.elegir(candidatos);
  return [...subtipos].sort((a, b) => Math.abs(a.desde - ctx.efectivo) - Math.abs(b.desde - ctx.efectivo))[0];
}

/** Arma un `Generador` a partir de sus subtipos. */
export function crearGenerador(id: string, version: number, subtipos: readonly Subtipo[]): Generador {
  const g = { id, version };
  return {
    id,
    version,
    area: "matematica",
    tipos: ["numerico", "fraccion", "opcion_multiple"],
    generar(tema: Tema, dificultad: Dificultad, semilla: number): EjercicioConSolucion {
      const azar = crearAzar(semilla);
      const ctx: ContextoProblema = { azar, efectivo: gradoEfectivo(tema), dificultad, tema };
      const subtipo = elegirSubtipo(subtipos, ctx);
      return materializar(g, ctx, semilla, subtipo.crear(ctx));
    },
  };
}

/** Contextos peruanos para problemas de enunciado. */
export const NOMBRES = ["Rosa", "Mateo", "Ana", "Luis", "Camila", "Diego", "Valeria", "Jorge", "Lucía", "Kevin", "Yaneth", "Wilmer"];
export const OBJETOS = [
  { singular: "cuaderno", plural: "cuadernos", femenino: false },
  { singular: "mango", plural: "mangos", femenino: false },
  { singular: "lápiz", plural: "lápices", femenino: false },
  { singular: "pan", plural: "panes", femenino: false },
  { singular: "chocolate", plural: "chocolates", femenino: false },
  { singular: "palta", plural: "paltas", femenino: true },
  { singular: "naranja", plural: "naranjas", femenino: true },
];
export const cuantos = (o: { femenino: boolean }) => (o.femenino ? "Cuántas" : "Cuántos");
