// Responsable: B (specs/43). Evaluadores puros de ítems cerrados (opción, numérico, fracción, texto corto, lectura,
// relacionar, verdadero/falso) y rúbrica simulada para escritura. La escritura con IA usa `EvaluadorAbierto` (C la llama).
import type { EjercicioConSolucion, EnvioRespuesta, Evaluacion, Evaluador, EvaluadorAbierto, TipoEjercicio } from "../contratos";
import { pendiente } from "../pendiente";

export function evaluadorDe(tipo: TipoEjercicio): Evaluador {
  return pendiente("B", "evaluadorDe", tipo);
}

/** Evalúa un ítem cerrado. Respuesta de tipo distinto al ejercicio → `incorrecto` con retro amable (no lanza). */
export function evaluar(ejercicio: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  return pendiente("B", "evaluar", ejercicio, envio);
}

/** Rúbrica formativa SIMULADA (heurística documentada): extensión, mayúscula y punto, conectores, párrafos, consigna. */
export function evaluarRubricaSimulada(ejercicio: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  return pendiente("B", "evaluarRubricaSimulada", ejercicio, envio);
}

/** Escritura con rúbrica usando la IA; si la salida no valida o la confianza es baja → `incierto`. */
export function evaluadorAbierto(): EvaluadorAbierto {
  return pendiente("B", "evaluadorAbierto");
}
