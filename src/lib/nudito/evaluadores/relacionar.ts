// Responsable: B (specs/43). Relacionar: puntaje parcial por par correcto; la retro nombra los elementos a revisar.
import type { EjercicioConSolucion, EnvioRespuesta, Evaluacion, Evaluador } from "../contratos";
import { evaluacion, tipoEquivocado } from "./comun";

export function evaluarRelacionar(ej: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  const otro = tipoEquivocado(ej, envio);
  if (otro) return otro;
  if (ej.publico.tipo !== "relacionar" || ej.solucion.tipo !== "relacionar" || envio.respuesta.tipo !== "relacionar") throw new Error("evaluarRelacionar: tipo");
  const pares = ej.solucion.pares;
  const dados = envio.respuesta.pares;
  const izquierda = ej.publico.izquierda;
  const malos = izquierda.filter((i) => dados[i.id] !== pares[i.id]);
  const puntaje = (izquierda.length - malos.length) / izquierda.length;
  if (!malos.length) return evaluacion("correcto", 1, `¡Muy bien! Todas las relaciones son correctas. ${ej.explicacion}`);
  const buenos = izquierda.length - malos.length;
  const retro =
    `${buenos ? `Acertaste ${buenos} de ${izquierda.length} relaciones. ` : ""}` +
    `Revisa: ${malos.map((m) => `«${m.texto}»`).join(", ")}. ${ej.explicacion}`;
  return evaluacion(buenos ? "parcial" : "incorrecto", puntaje, retro, "relacion_incorrecta");
}

export const evaluadorRelacionar: Evaluador = { tipos: ["relacionar"], evaluar: evaluarRelacionar };
