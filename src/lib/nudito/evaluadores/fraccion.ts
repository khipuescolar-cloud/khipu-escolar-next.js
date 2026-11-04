// Responsable: B (specs/43). Fracción: equivalencias (2/4 = 1/2) si `aceptarEquivalentes`; si se pide simplificar y no
// está simplificada → `parcial`; detecta fracción invertida, denominador 0 y numerador/denominador correctos por separado.
import type { EjercicioConSolucion, EnvioRespuesta, Evaluacion, Evaluador } from "../contratos";
import { conExplicacion, evaluacion, leerEntero, tipoEquivocado } from "./comun";

const mcd = (a: number, b: number): number => (b ? mcd(b, a % b) : Math.abs(a));

export function evaluarFraccion(ej: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  const otro = tipoEquivocado(ej, envio);
  if (otro) return otro;
  if (ej.publico.tipo !== "fraccion" || ej.solucion.tipo !== "fraccion" || envio.respuesta.tipo !== "fraccion") throw new Error("evaluarFraccion: tipo");
  const n = leerEntero(envio.respuesta.num);
  const d = leerEntero(envio.respuesta.den);
  if (n === null || d === null) return evaluacion("incorrecto", 0, "Escribe el numerador y el denominador como números enteros.", "formato_no_valido");
  if (d === 0) return evaluacion("incorrecto", 0, "El denominador no puede ser 0: indica en cuántas partes se divide el todo.", "denominador_cero");
  const { num, den, aceptarEquivalentes } = ej.solucion;
  const pide = ej.publico.pideSimplificar;
  const exacta = n === num && d === den;
  const equivalente = n * den === num * d;
  const irreducible = mcd(n, d) === 1;
  if (exacta || (equivalente && aceptarEquivalentes && (!pide || irreducible))) {
    return evaluacion("correcto", 1, conExplicacion(exacta ? "¡Correcto!" : `¡Correcto! ${n}/${d} es equivalente a la respuesta esperada.`, ej));
  }
  if (equivalente && pide && !irreducible) {
    const g = mcd(n, d);
    return evaluacion("parcial", 0.5, `Tu fracción ${n}/${d} tiene el valor correcto, pero todavía se puede simplificar: divide ambos entre ${g}.`, "no_simplifica");
  }
  if (equivalente) {
    return evaluacion("parcial", 0.5, `${n}/${d} vale lo mismo, pero aquí se pedía ${num}/${den} (con denominador ${den}).`, "equivalente_no_pedida");
  }
  if (n * num === d * den && n !== d) return evaluacion("incorrecto", 0, conExplicacion("Parece que invertiste la fracción: el numerador va arriba y el denominador abajo.", ej), "invierte_fraccion");
  if (d === den) return evaluacion("incorrecto", 0, conExplicacion("El denominador está bien; revisa el numerador.", ej), "error_en_numerador");
  if (n === num) return evaluacion("incorrecto", 0, conExplicacion("El numerador está bien; revisa el denominador.", ej), "error_en_denominador");
  return evaluacion("incorrecto", 0, conExplicacion("Esa fracción no es la correcta. Revisa los pasos.", ej), "resultado_incorrecto");
}

export const evaluadorFraccion: Evaluador = { tipos: ["fraccion"], evaluar: evaluarFraccion };
