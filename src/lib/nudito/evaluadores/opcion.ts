// Responsable: B (specs/43). Opción múltiple: la opción elegida se compara con la correcta; si es un distractor, se
// informa el error típico que revela.
import type { EjercicioConSolucion, EnvioRespuesta, Evaluacion, Evaluador } from "../contratos";
import { conExplicacion, describirError, evaluacion, tipoEquivocado } from "./comun";

export function evaluarOpcion(ej: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  const otro = tipoEquivocado(ej, envio);
  if (otro) return otro;
  if (ej.publico.tipo !== "opcion_multiple" || ej.solucion.tipo !== "opcion_multiple" || envio.respuesta.tipo !== "opcion") throw new Error("evaluarOpcion: tipo");
  const sol = ej.solucion;
  const elegida = envio.respuesta.opcionId;
  const opcion = ej.publico.opciones.find((o) => o.id === elegida);
  if (!opcion) return evaluacion("incorrecto", 0, "Esa opción no está entre las alternativas. Elige una de las que aparecen.", "opcion_no_valida");
  if (elegida === sol.correcta) return evaluacion("correcto", 1, conExplicacion(`¡Bien! «${opcion.texto}» es la respuesta correcta.`, ej));
  const codigo = sol.distractores[elegida] ?? "opcion_incorrecta";
  // No revela la opción correcta: el alumno puede reintentar. La explicación (que sí la contiene) la agrega la sesión
  // solo al acertar o al agotar los intentos (sesiones.ts).
  return evaluacion("incorrecto", 0, conExplicacion(`Elegiste «${opcion.texto}». ${describirError(codigo)} Revisa el procedimiento y vuelve a intentarlo.`, ej), codigo);
}

export const evaluadorOpcion: Evaluador = { tipos: ["opcion_multiple"], evaluar: evaluarOpcion };
