// Responsable: B (specs/43). Lectura: cada pregunta se corrige por separado (opción o texto flexible) y el puntaje es
// el promedio; la retro dice qué tipo de pregunta (literal, inferencial, crítica) estuvo bien y cuál revisar.
import type { EjercicioConSolucion, EnvioRespuesta, Evaluacion, Evaluador } from "../contratos";
import { compararTexto, evaluacion, tipoEquivocado } from "./comun";

const NOMBRE_TIPO = { literal: "literal", inferencial: "inferencial", critica: "crítica" } as const;

export function evaluarLectura(ej: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  const otro = tipoEquivocado(ej, envio);
  if (otro) return otro;
  if (ej.publico.tipo !== "lectura" || ej.solucion.tipo !== "lectura" || envio.respuesta.tipo !== "lectura") throw new Error("evaluarLectura: tipo");
  const respuestas = envio.respuesta.respuestas;
  let suma = 0;
  const bien: string[] = [];
  const revisar: string[] = [];
  const tiposFallados = new Set<string>();
  ej.publico.preguntas.forEach((q, i) => {
    const esperada = ej.solucion.tipo === "lectura" ? ej.solucion.respuestas[q.id] : undefined;
    const dada = respuestas[q.id]?.trim() ?? "";
    let puntos = 0;
    if (dada && esperada !== undefined) {
      if (typeof esperada === "string") puntos = q.opciones ? (dada === esperada ? 1 : 0) : compararTexto(dada, [esperada], "flexible") === "ninguna" ? 0 : 1;
      else {
        const c = compararTexto(dada, esperada.aceptadas, "flexible");
        puntos = c === "exacta" || c === "flexible" || c === "casi" ? 1 : c === "parcial" ? 0.5 : 0;
      }
    }
    suma += puntos;
    const etiqueta = `pregunta ${i + 1} (${NOMBRE_TIPO[q.tipo]})`;
    if (puntos === 1) bien.push(etiqueta);
    else {
      revisar.push(dada ? etiqueta : `${etiqueta}, sin responder`);
      tiposFallados.add(q.tipo);
    }
  });
  const total = ej.publico.preguntas.length;
  const puntaje = suma / total;
  const consejo = tiposFallados.has("inferencial")
    ? "Para las inferenciales, busca pistas en lo que hacen o dicen los personajes."
    : tiposFallados.has("critica")
      ? "Para las críticas, piensa qué opinas y apóyate en lo que dice el texto."
      : "Para las literales, la respuesta está escrita en el texto: vuelve a buscarla.";
  if (puntaje === 1) return evaluacion("correcto", 1, `¡Muy bien! Respondiste bien las ${total} preguntas. ${ej.explicacion}`);
  const partes = [
    bien.length ? `Respondiste bien: ${bien.join(", ")}.` : "",
    `Revisa: ${revisar.join(", ")}.`,
    consejo,
  ].filter(Boolean);
  const codigo = tiposFallados.has("literal") ? "lectura_literal" : tiposFallados.has("inferencial") ? "lectura_inferencial" : "lectura_critica";
  return evaluacion(puntaje === 0 ? "incorrecto" : "parcial", puntaje, `${partes.join(" ")} ${ej.explicacion}`, codigo);
}

export const evaluadorLectura: Evaluador = { tipos: ["lectura"], evaluar: evaluarLectura };
