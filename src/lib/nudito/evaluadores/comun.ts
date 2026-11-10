// Responsable: B (specs/43). Utilidades puras de los evaluadores: normalización de texto, lectura de números y fracciones
// escritos por el alumno, comparación flexible y retroalimentación de errores típicos.
import { RESPUESTA_DE_TIPO, type EjercicioConSolucion, type EnvioRespuesta, type Evaluacion, type ResultadoEvaluacion } from "../contratos";

export function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Flexible: minúsculas, sin tildes, sin signos de puntuación, espacios simples. («ñ» se conserva como «n».) */
export function normalizarFlexible(texto: string): string {
  return sinTildes(texto.toLowerCase())
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Estricta: solo ignora mayúsculas, espacios repetidos y el punto final (conserva tildes). */
export function normalizarEstricta(texto: string): string {
  return texto.toLowerCase().replace(/\s+/g, " ").replace(/[.!¡¿?]+$/u, "").replace(/^[¡¿]+/u, "").trim();
}

/** Literal: minúsculas, sin tildes, espacios simples; conserva números, orden y signos matemáticos; sin punto final. */
export function normalizarLiteral(texto: string): string {
  return sinTildes(texto.toLowerCase())
    .replace(/[−–]/g, "-").replace(/[*]/g, "×").replace(/[«»"“”'‘’]/g, "")
    .replace(/\s*([+\-×÷=/,:;])\s*/g, "$1")
    .replace(/\s+/g, " ").replace(/[.!¡¿?]+$/u, "").replace(/^[¡¿]+/u, "").trim();
}

/**
 * Error de tipeo tolerable: mismas palabras en el mismo orden y, como mucho, una palabra sin dígitos de 6+ letras con
 * 1 letra de diferencia (2 si tiene 9+). Así «triangulo» ≈ «trianglo», pero «menor» ≠ «mayor» y «236» ≠ «235».
 */
export function casiIguales(respuesta: string, aceptada: string): boolean {
  const r = respuesta.split(" "), a = aceptada.split(" ");
  if (r.length !== a.length || respuesta === aceptada) return false;
  let distintas = 0;
  for (let i = 0; i < a.length; i++) {
    if (r[i] === a[i]) continue;
    distintas++;
    const tol = /\d/.test(a[i]) || /\d/.test(r[i]) ? 0 : a[i].length >= 9 ? 2 : a[i].length >= 6 ? 1 : 0;
    if (distintas > 1 || !tol || levenshtein(r[i], a[i]) > tol) return false;
  }
  return distintas === 1;
}

const VACIAS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "con", "en", "y", "e", "o", "su", "sus", "mi", "mis",
  "que", "por", "para", "es", "son", "fue", "era", "lo", "se", "le", "les",
]);

export function palabrasDeContenido(texto: string): string[] {
  return normalizarFlexible(texto).split(" ").filter((p) => p && !VACIAS.has(p));
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let previo = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
      previo = tmp;
    }
  }
  return dp[b.length];
}

export type Coincidencia = "exacta" | "flexible" | "casi" | "parcial" | "ninguna";

/**
 * Compara una respuesta breve con las aceptadas.
 * - exacta: igual tras normalizar; flexible: contiene todas las palabras de contenido de una aceptada sin agregar demasiado
 *   («fue con su abuela» ⊇ «abuela»); casi: mismas palabras con una letra de diferencia en alguna palabra larga (nunca en
 *   números ni en palabras cortas: «menor» ≠ «mayor», «2, 3, 6» ≠ «2, 3, 5»); parcial: al menos la mitad de las palabras de
 *   contenido; ninguna.
 * - literal (banco de conocimiento): igual tras normalizar mayúsculas, tildes y espacios, conservando números, orden y
 *   signos (+ − × ÷ = / , :); admite «casi» con la misma regla por palabra. Las variantes válidas van en `aceptadas`.
 */
export function compararTexto(respuesta: string, aceptadas: readonly string[], modo: "estricta" | "flexible" | "literal"): Coincidencia {
  if (modo === "literal") {
    const r = normalizarLiteral(respuesta);
    if (aceptadas.some((a) => normalizarLiteral(a) === r)) return "exacta";
    return aceptadas.some((a) => casiIguales(r, normalizarLiteral(a))) ? "casi" : "ninguna";
  }
  if (modo === "estricta") {
    const r = normalizarEstricta(respuesta);
    if (aceptadas.some((a) => normalizarEstricta(a) === r)) return "exacta";
    // En modo estricto, coincidir solo sin tildes/puntuación es un acierto parcial (detalle de ortografía).
    return compararTexto(respuesta, aceptadas, "flexible") === "ninguna" ? "ninguna" : "parcial";
  }
  const r = normalizarFlexible(respuesta);
  // Respuestas que son solo signos («,» «¿?»): se comparan tal cual, sin espacios.
  if (!r) return aceptadas.some((a) => a.replace(/\s+/g, "") === respuesta.replace(/\s+/g, "")) ? "exacta" : "ninguna";
  if (aceptadas.some((a) => normalizarFlexible(a) === r)) return "exacta";
  const palabrasR = palabrasDeContenido(respuesta);
  const setR = new Set(palabrasR);
  let mejor: Coincidencia = "ninguna";
  for (const a of aceptadas) {
    const pa = palabrasDeContenido(a);
    if (pa.length && pa.every((p) => setR.has(p)) && palabrasR.length <= pa.length * 2 + 3) return "flexible";
    if (casiIguales(r, normalizarFlexible(a))) mejor = "casi";
    if (mejor === "ninguna" && pa.length >= 2 && pa.filter((p) => setR.has(p)).length * 2 >= pa.length) mejor = "parcial";
  }
  return mejor;
}

/** Lee un número escrito por el alumno: «3,5», «3.5», «−2», «1 200», «24 cm», «1/4». null si no se entiende. */
export function leerNumero(texto: string): number | null {
  let t = texto.trim().replace(/[−–]/g, "-").replace(/\s*(soles|sol|s\/|cm²|m²|cm2|m2|cm|m|kg|g|km|días|dias|%|°c)\.?$/i, "").replace(/^s\/\s*/i, "");
  t = t.replace(/(\d)\s+(?=\d{3}\b)/g, "$1");
  const f = /^(-?\d+)\s*\/\s*(\d+)$/.exec(t);
  if (f) return Number(f[2]) === 0 ? null : Number(f[1]) / Number(f[2]);
  if (t.includes(",") && t.includes(".")) {
    // El último separador es el decimal; el otro, de miles.
    t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else {
    t = t.replace(",", ".");
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function leerEntero(texto: string): number | null {
  const t = texto.trim().replace(/[−–]/g, "-");
  return /^-?\d+$/.test(t) ? Number(t) : null;
}

/** Mensajes amables para los códigos de error típicos más comunes (el resto se describe en genérico). */
const MENSAJES_ERROR: Record<string, string> = {
  suma_denominadores: "Parece que sumaste también los denominadores. Al sumar fracciones, el denominador común se mantiene.",
  resta_denominadores: "Parece que restaste también los denominadores. El denominador común se mantiene.",
  no_iguala_denominadores: "Parece que operaste sin igualar antes los denominadores.",
  solo_denominador: "Cambiaste el denominador, pero el numerador debe multiplicarse por el mismo número.",
  solo_numerador: "Cambiaste el numerador, pero el denominador debe multiplicarse por el mismo número.",
  invierte_fraccion: "Parece que invertiste la fracción: revisa cuál número va arriba y cuál abajo.",
  confunde_area_y_perimetro: "Parece que confundiste el área con el perímetro: el perímetro es el borde; el área, lo de adentro.",
  olvida_llevar: "Parece que olvidaste «llevar» al pasar a la siguiente columna.",
  resta_menor_de_mayor: "Parece que en alguna columna restaste el número menor del mayor sin pedir prestado.",
  error_de_signo: "El valor es correcto, pero revisa el signo.",
  ignora_jerarquia: "Recuerda: primero se multiplica y luego se suma.",
  no_cambia_signo_al_transponer: "Cuando un número pasa al otro lado de la igualdad, cambia su operación (sumar ↔ restar).",
  confunde_cociente_y_residuo: "Parece que confundiste el cociente con el residuo.",
  olvida_dividir_entre_2: "Para el triángulo falta dividir entre 2.",
  directa_en_vez_de_inversa: "Aquí, si una cantidad aumenta, la otra disminuye: es inversamente proporcional.",
  inversa_en_vez_de_directa: "Aquí, si una cantidad aumenta, la otra también: es directamente proporcional.",
  error_de_calculo: "El procedimiento va bien encaminado, pero hay un error de cálculo.",
};

export function describirError(codigo: string): string {
  return MENSAJES_ERROR[codigo] ?? `Esa respuesta suele salir de este error: ${codigo.replace(/_/g, " ")}.`;
}

export function evaluacion(resultado: ResultadoEvaluacion, puntaje: number, retro: string, errorDetectado?: string, evaluadoPor: Evaluacion["evaluadoPor"] = "codigo"): Evaluacion {
  return {
    resultado,
    puntaje: Math.max(0, Math.min(1, Math.round(puntaje * 1000) / 1000)),
    retro: retro.trim().slice(0, 1200),
    ...(errorDetectado ? { errorDetectado: errorDetectado.slice(0, 60) } : {}),
    evaluadoPor,
  };
}

/** Respuesta de otro tipo: no lanza; `incorrecto` con retro amable. */
export function tipoEquivocado(ej: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion | null {
  if (RESPUESTA_DE_TIPO[ej.publico.tipo] === envio.respuesta.tipo) return null;
  return evaluacion("incorrecto", 0, "No pude leer tu respuesta en el formato que pide este ejercicio. Intenta de nuevo usando el espacio de respuesta.", "tipo_de_respuesta");
}

export const conExplicacion = (texto: string, ej: EjercicioConSolucion) => `${texto} ${ej.explicacion}`;
