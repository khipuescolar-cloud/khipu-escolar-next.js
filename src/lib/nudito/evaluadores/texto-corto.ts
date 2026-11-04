// Responsable: B (specs/43). Texto corto: normalización flexible (mayúsculas, tildes, puntuación, artículos) o estricta
// (conserva tildes). Una respuesta razonable que contiene lo esencial no se marca incorrecta por no ser literal.
import type { EjercicioConSolucion, EnvioRespuesta, Evaluacion, Evaluador } from "../contratos";
import { compararTexto, conExplicacion, evaluacion, tipoEquivocado } from "./comun";

export function evaluarTextoCorto(ej: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  const otro = tipoEquivocado(ej, envio);
  if (otro) return otro;
  if (ej.solucion.tipo !== "texto_corto" || envio.respuesta.tipo !== "texto") throw new Error("evaluarTextoCorto: tipo");
  const { aceptadas, normalizacion } = ej.solucion;
  const c = compararTexto(envio.respuesta.texto, aceptadas, normalizacion);
  switch (c) {
    case "exacta":
    case "flexible":
      return evaluacion("correcto", 1, conExplicacion("¡Correcto!", ej));
    case "casi":
      return evaluacion("correcto", 1, conExplicacion(`¡Correcto! Revisa cómo se escribe: «${aceptadas[0]}».`, ej), "ortografia_menor");
    case "parcial":
      return normalizacion === "estricta"
        ? evaluacion("parcial", 0.5, `Tu respuesta va bien, pero fíjate en la escritura (tildes o letras): se escribe «${aceptadas[0]}».`, "ortografia")
        : evaluacion("parcial", 0.5, conExplicacion("Vas por buen camino, pero a tu respuesta le falta una parte.", ej), "respuesta_incompleta");
    default:
      return evaluacion("incorrecto", 0, conExplicacion("Esa no es la respuesta. Vuelve a leer con calma la parte que trata de esto.", ej), "respuesta_incorrecta");
  }
}

export const evaluadorTextoCorto: Evaluador = { tipos: ["texto_corto"], evaluar: evaluarTextoCorto };
