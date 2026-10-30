// Tema y dificultad de un mensaje del alumno (specs/29). Puro. Se guarda como metadato en `NuditoMensaje.intencion`
// («área|tema|dificultad» u «área|tema|ok») para los resúmenes semanales, sin tener que releer las conversaciones.
import { normalizar } from "./seguridad";

type ReglaTema = { re: RegExp; area: string; tema: string };

const REGLAS: ReglaTema[] = [
  { re: / (fraccion\w*|numerador|denominador|mitad|cuarto|tercio) /, area: "Matemática", tema: "Fracciones" },
  { re: / (multiplic\w*|tabla del|por \d+|\d+ x \d+|veces) /, area: "Matemática", tema: "Multiplicación" },
  { re: / (division\w*|dividir|divide|repartir|entre \d+) /, area: "Matemática", tema: "División" },
  { re: / (suma\w*|sumar|resta\w*|restar|mas \d+|menos \d+) /, area: "Matemática", tema: "Suma y resta" },
  { re: / (triangulo\w*|cuadrado\w*|rectangulo\w*|circulo\w*|perimetro|area|angulo\w*|figura\w*) /, area: "Matemática", tema: "Geometría" },
  { re: / (ecuacion\w*|incognita|algebra\w*) /, area: "Matemática", tema: "Ecuaciones" },
  { re: / (leer|lectura|cuento\w*|resumen|resumir|idea principal|comprension|texto\w*) /, area: "Comunicación", tema: "Comprensión lectora" },
  { re: / (escribir|redact\w*|ortografia|tilde\w*|parrafo\w*|oracion\w*) /, area: "Comunicación", tema: "Escritura" },
  { re: / (agua|ciclo del agua|planta\w*|animal\w*|cuerpo humano|energia|celula\w*|ecosistema\w*|experimento\w*) /, area: "Ciencia y Tecnología", tema: "Ciencias naturales" },
  { re: / (historia|peru antiguo|incas?|independencia|mapa\w*|region\w*) /, area: "Personal Social", tema: "Historia y geografía" },
  { re: / (ingles|english|vocabulary|verb\w*) /, area: "Inglés", tema: "Inglés" },
];

const RE_DIFICULTAD = / (no entiendo|no entendi|no le entiendo|no se como|no se hacer|no me sale|esta dificil|es dificil|me cuesta|no puedo|estoy confundid\w*|me confundo) /;

export type TemaDetectado = { area: string; tema: string; dificultad: boolean };

export function tieneDificultad(texto: string): boolean {
  return RE_DIFICULTAD.test(normalizar(texto));
}

/**
 * Área y tema del mensaje. Si nombra uno de sus cursos sin tema concreto, el tema es «General».
 * Sin pistas: null (no cuenta para el resumen salvo la dificultad).
 */
export function detectarTema(texto: string, cursos: readonly string[] = []): TemaDetectado | null {
  const t = normalizar(texto);
  const dificultad = RE_DIFICULTAD.test(t);
  const regla = REGLAS.find((r) => r.re.test(t));
  const area = regla?.area ?? cursos.find((c) => cursoNombrado(t, c));
  if (!area) return null;
  // Si el alumno tiene un curso con nombre parecido, se usa su nombre exacto.
  const propio = cursos.find((c) => normalizar(c) === normalizar(area)) ?? area;
  return { area: propio, tema: regla?.tema ?? "General", dificultad };
}

/** El texto (normalizado) nombra el curso por su primera palabra significativa («matematica», «comunicacion», «ciencia»). */
export function cursoNombrado(textoNormalizado: string, curso: string): boolean {
  const palabra = normalizar(curso).trim().split(" ").find((p) => p.length > 3);
  if (!palabra) return false;
  return textoNormalizado.includes(` ${palabra}`);
}

export function codificarTema(t: TemaDetectado | null, dificultad = t?.dificultad ?? false): string | null {
  if (!t) return dificultad ? "|General|dificultad" : null;
  return `${t.area}|${t.tema}|${t.dificultad ? "dificultad" : "ok"}`;
}

export function decodificarTema(intencion: string | null): { area: string; tema: string; dificultad: boolean } | null {
  if (!intencion) return null;
  const [area = "", tema = "", estado = ""] = intencion.split("|");
  if (!tema) return null;
  return { area: area || "General", tema, dificultad: estado === "dificultad" };
}
