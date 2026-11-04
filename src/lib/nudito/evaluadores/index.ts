// Responsable: B (specs/43). Evaluadores puros de ítems cerrados (opción, numérico, fracción, texto corto, lectura,
// relacionar, verdadero/falso) y rúbrica simulada para escritura. La escritura con IA usa `EvaluadorAbierto` (C la llama).
import type { EjercicioConSolucion, EnvioRespuesta, Evaluacion, Evaluador, EvaluadorAbierto, TipoEjercicio } from "../contratos";
import { evaluadorFraccion } from "./fraccion";
import { evaluadorLectura } from "./lectura";
import { evaluadorNumerico } from "./numerico";
import { evaluadorOpcion } from "./opcion";
import { evaluadorRelacionar } from "./relacionar";
import { evaluadorAbiertoRubrica, evaluarRubricaSimulada as rubricaSimulada } from "./rubrica-simulada";
import { evaluadorTextoCorto } from "./texto-corto";
import { evaluadorVf } from "./vf";

/** La escritura en `evaluar` (síncrono) usa la rúbrica SIMULADA → siempre `incierto`; con IA, usar `evaluadorAbierto()`. */
const evaluadorEscrituraSimulada: Evaluador = { tipos: ["escritura_rubrica"], evaluar: rubricaSimulada };

const EVALUADORES: Record<TipoEjercicio, Evaluador> = {
  opcion_multiple: evaluadorOpcion,
  numerico: evaluadorNumerico,
  fraccion: evaluadorFraccion,
  texto_corto: evaluadorTextoCorto,
  lectura: evaluadorLectura,
  escritura_rubrica: evaluadorEscrituraSimulada,
  relacionar: evaluadorRelacionar,
  verdadero_falso: evaluadorVf,
};

export function evaluadorDe(tipo: TipoEjercicio): Evaluador {
  return EVALUADORES[tipo];
}

/** Evalúa un ítem cerrado. Respuesta de tipo distinto al ejercicio → `incorrecto` con retro amable (no lanza). */
export function evaluar(ejercicio: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  return EVALUADORES[ejercicio.publico.tipo].evaluar(ejercicio, envio);
}

/** Rúbrica formativa SIMULADA (heurística documentada): extensión, mayúscula y punto, conectores, párrafos, consigna. */
export function evaluarRubricaSimulada(ejercicio: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  return rubricaSimulada(ejercicio, envio);
}

/** Escritura con rúbrica usando la IA; si la salida no valida o la confianza es baja → `incierto`. */
export function evaluadorAbierto(): EvaluadorAbierto {
  return evaluadorAbiertoRubrica;
}
