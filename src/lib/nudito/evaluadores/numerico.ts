// Responsable: B (specs/43). Numérico: acepta coma o punto decimal, signo «−», unidades al final y fracciones («1/4»);
// compara con tolerancia y detecta errores de signo y de posición decimal.
import type { EjercicioConSolucion, EnvioRespuesta, Evaluacion, Evaluador } from "../contratos";
import { conExplicacion, evaluacion, leerNumero, tipoEquivocado } from "./comun";

const EPS = 1e-9;

export function evaluarNumerico(ej: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  const otro = tipoEquivocado(ej, envio);
  if (otro) return otro;
  if (ej.solucion.tipo !== "numerico" || envio.respuesta.tipo !== "numero") throw new Error("evaluarNumerico: tipo");
  const v = leerNumero(envio.respuesta.valor);
  if (v === null) {
    return evaluacion("incorrecto", 0, "No reconocí un número en tu respuesta. Escribe solo el número, por ejemplo «12» o «3,5».", "formato_no_numerico");
  }
  const { valor, tolerancia } = ej.solucion;
  if (Math.abs(v - valor) <= tolerancia + EPS) return evaluacion("correcto", 1, conExplicacion("¡Correcto!", ej));
  if (valor !== 0 && Math.abs(v + valor) <= tolerancia + EPS) {
    return evaluacion("incorrecto", 0, conExplicacion("Llegaste al número correcto, pero el signo no es el adecuado. Revisa si el resultado es positivo o negativo.", ej), "error_de_signo");
  }
  if (valor !== 0 && [10, 100, 0.1, 0.01].some((k) => Math.abs(v - valor * k) <= Math.abs(valor * k) * 1e-9 + tolerancia)) {
    return evaluacion("incorrecto", 0, conExplicacion("Tus cifras son correctas, pero la coma decimal (o un cero) está en otro lugar.", ej), "error_de_posicion_decimal");
  }
  const cerca = Math.abs(v - valor) <= Math.max(1, Math.abs(valor) * 0.1);
  return evaluacion(
    "incorrecto",
    0,
    conExplicacion(cerca ? "Estás cerca: revisa el último cálculo." : "Ese no es el resultado. Revisa el procedimiento paso a paso.", ej),
    cerca ? "error_de_calculo" : "resultado_incorrecto",
  );
}

export const evaluadorNumerico: Evaluador = { tipos: ["numerico"], evaluar: evaluarNumerico };
