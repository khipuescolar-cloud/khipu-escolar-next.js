// Responsable: B (specs/43). Verdadero/falso: puntaje parcial por afirmación; en las falladas se muestra la justificación.
import type { EjercicioConSolucion, EnvioRespuesta, Evaluacion, Evaluador } from "../contratos";
import { evaluacion, tipoEquivocado } from "./comun";

export function evaluarVf(ej: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  const otro = tipoEquivocado(ej, envio);
  if (otro) return otro;
  if (ej.publico.tipo !== "verdadero_falso" || ej.solucion.tipo !== "verdadero_falso" || envio.respuesta.tipo !== "vf") throw new Error("evaluarVf: tipo");
  const { valores, justificacion } = ej.solucion;
  const dados = envio.respuesta.valores;
  const afirmaciones = ej.publico.afirmaciones;
  const malas = afirmaciones.filter((a) => dados[a.id] !== valores[a.id]);
  const puntaje = (afirmaciones.length - malas.length) / afirmaciones.length;
  if (!malas.length) return evaluacion("correcto", 1, `¡Correcto! Clasificaste bien todas las afirmaciones. ${ej.explicacion}`);
  const detalle = malas
    .map((a) => `«${a.texto}» es ${valores[a.id] ? "verdadera" : "falsa"}${justificacion?.[a.id] ? `: ${justificacion[a.id]}` : "."}`)
    .join(" ");
  const buenas = afirmaciones.length - malas.length;
  return evaluacion(buenas ? "parcial" : "incorrecto", puntaje, `${buenas ? `Acertaste ${buenas} de ${afirmaciones.length}. ` : ""}${detalle} ${ej.explicacion}`, "afirmacion_mal_clasificada");
}

export const evaluadorVf: Evaluador = { tipos: ["verdadero_falso"], evaluar: evaluarVf };
