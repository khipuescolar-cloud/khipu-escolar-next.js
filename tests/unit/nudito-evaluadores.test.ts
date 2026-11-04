import { describe, expect, it } from "vitest";
import {
  esquemaEvaluacion,
  TIPOS_EJERCICIO,
  type EjercicioConSolucion,
  type EnvioRespuesta,
  type EvaluacionRubricaIA,
  type ProveedorTutorIA,
  type SalidaIA,
} from "@/lib/nudito/contratos";
import { evaluadorAbierto, evaluadorDe, evaluar, evaluarRubricaSimulada } from "@/lib/nudito/evaluadores";
import { compararTexto, leerNumero, normalizarFlexible } from "@/lib/nudito/evaluadores/comun";
import {
  CASOS_FIXTURE,
  ESCRITURA_OPINION,
  FRACCION_AMPLIFICAR,
  LECTURA_MERCADO,
  NUMERICO_ECUACION,
  OPCION_MULTIPLE_FRACCIONES,
  RELACIONAR_CELULA,
  TEXTO_CORTO_MERCADO,
  VERDADERO_FALSO_CELULA,
} from "../fixtures/nudito/ejercicios";

const conRespuesta = (respuesta: EnvioRespuesta["respuesta"]): EnvioRespuesta => ({ respuesta });
const valida = (e: unknown) => expect(esquemaEvaluacion.safeParse(e).error?.issues ?? []).toEqual([]);

/** Ejercicio de fracción que pide simplificar y acepta equivalentes. */
const SUMA_SIMPLIFICAR: EjercicioConSolucion = {
  publico: { tipo: "fraccion", temaClave: "mat.p5.prueba", dificultad: 4, fuenteId: "mat.fracciones@1", semilla: 1, enunciado: "Calcula 1/4 + 1/4 (simplificado)", pideSimplificar: true },
  solucion: { tipo: "fraccion", num: 1, den: 2, aceptarEquivalentes: true },
  pistas: ["a", "b", "c"],
  explicacion: "1/4 + 1/4 = 2/4 = 1/2.",
};
const NUM_DECIMAL: EjercicioConSolucion = {
  publico: { tipo: "numerico", temaClave: "mat.s1.prueba", dificultad: 3, fuenteId: "mat.geometria@1", semilla: 1, enunciado: "Área con π ≈ 3,14 y r = 1", unidad: "cm²", decimalesPermitidos: 2 },
  solucion: { tipo: "numerico", valor: 3.14, tolerancia: 0.01 },
  pistas: ["a", "b", "c"],
  explicacion: "3,14 × 1 × 1 = 3,14.",
};

describe("evaluadores de ítems cerrados", () => {
  it("hay un evaluador por cada tipo y los fixtures: correcta → correcto, incorrecta → no correcto", () => {
    for (const t of TIPOS_EJERCICIO) expect(evaluadorDe(t).tipos).toContain(t);
    for (const caso of CASOS_FIXTURE) {
      if (caso.ejercicio.publico.tipo === "escritura_rubrica") continue;
      const bien = evaluar(caso.ejercicio, caso.correcta);
      const mal = evaluar(caso.ejercicio, caso.incorrecta);
      valida(bien);
      valida(mal);
      expect(bien.resultado, caso.ejercicio.publico.fuenteId).toBe("correcto");
      expect(bien.puntaje).toBe(1);
      expect(mal.resultado).not.toBe("correcto");
      expect(mal.retro.length).toBeGreaterThan(30);
      expect(bien.evaluadoPor).toBe("codigo");
    }
  });

  it("respuesta de otro tipo → incorrecto amable, sin lanzar", () => {
    const e = evaluar(NUMERICO_ECUACION.ejercicio, conRespuesta({ tipo: "opcion", opcionId: "a" }));
    expect(e).toMatchObject({ resultado: "incorrecto", errorDetectado: "tipo_de_respuesta" });
  });

  it("opción múltiple: informa el error típico del distractor y la respuesta correcta", () => {
    const e = evaluar(OPCION_MULTIPLE_FRACCIONES.ejercicio, conRespuesta({ tipo: "opcion", opcionId: "c" }));
    expect(e.errorDetectado).toBe("solo_numerador");
    expect(e.retro).toContain("4/6");
    expect(evaluar(OPCION_MULTIPLE_FRACCIONES.ejercicio, conRespuesta({ tipo: "opcion", opcionId: "z" })).errorDetectado).toBe("opcion_no_valida");
  });

  it("numérico: coma o punto decimal, signo, unidades y tolerancia", () => {
    for (const v of ["3,14", "3.14", "3,145", " 3,14 cm² ", "3.13"]) expect(evaluar(NUM_DECIMAL, conRespuesta({ tipo: "numero", valor: v })).resultado, v).toBe("correcto");
    expect(evaluar(NUM_DECIMAL, conRespuesta({ tipo: "numero", valor: "3,2" })).resultado).toBe("incorrecto");
    expect(evaluar(NUM_DECIMAL, conRespuesta({ tipo: "numero", valor: "31,4" })).errorDetectado).toBe("error_de_posicion_decimal");
    expect(evaluar(NUMERICO_ECUACION.ejercicio, conRespuesta({ tipo: "numero", valor: "−4" })).errorDetectado).toBe("error_de_signo");
    expect(evaluar(NUMERICO_ECUACION.ejercicio, conRespuesta({ tipo: "numero", valor: "cuatro" })).errorDetectado).toBe("formato_no_numerico");
    expect(leerNumero("1 200")).toBe(1200);
    expect(leerNumero("1.200,5")).toBe(1200.5);
    expect(leerNumero("S/ 25")).toBe(25);
    expect(leerNumero("1/4")).toBe(0.25);
    expect(leerNumero("1/0")).toBeNull();
  });

  it("fracción: equivalentes, simplificación parcial, exactitud pedida y errores", () => {
    const f = (num: string, den: string) => evaluar(SUMA_SIMPLIFICAR, conRespuesta({ tipo: "fraccion", num, den }));
    expect(f("1", "2").resultado).toBe("correcto");
    expect(f("2", "4")).toMatchObject({ resultado: "parcial", puntaje: 0.5, errorDetectado: "no_simplifica" });
    expect(f("2", "1").errorDetectado).toBe("invierte_fraccion");
    expect(f("1", "0").errorDetectado).toBe("denominador_cero");
    expect(f("2", "8").resultado).toBe("incorrecto");
    // Sin pedir simplificar y aceptando equivalentes: 2/4 = 1/2 es correcto.
    const libre = { ...SUMA_SIMPLIFICAR, publico: { ...SUMA_SIMPLIFICAR.publico, pideSimplificar: false } } as EjercicioConSolucion;
    expect(evaluar(libre, conRespuesta({ tipo: "fraccion", num: "2", den: "4" })).resultado).toBe("correcto");
    // «3/5 = ?/10» no acepta equivalentes: 3/5 vale lo mismo pero no es lo pedido → parcial.
    expect(evaluar(FRACCION_AMPLIFICAR.ejercicio, conRespuesta({ tipo: "fraccion", num: "3", den: "5" })).errorDetectado).toBe("equivalente_no_pedida");
    expect(evaluar(FRACCION_AMPLIFICAR.ejercicio, conRespuesta({ tipo: "fraccion", num: "3", den: "10" })).errorDetectado).toBe("error_en_numerador");
  });

  it("texto corto flexible: tildes, mayúsculas, espacios, artículos y respuestas razonables no literales", () => {
    const t = (texto: string) => evaluar(TEXTO_CORTO_MERCADO.ejercicio, conRespuesta({ tipo: "texto", texto })).resultado;
    for (const r of ["  CON SU ABUELA ", "abuela.", "Fue con su abuela", "su Abuela!", "abuel"]) expect(t(r), r).toBe("correcto");
    expect(t("Con su mamá")).toBe("incorrecto");
    expect(normalizarFlexible("¡Piña, MANGO!")).toBe("pina mango");
    expect(compararTexto(" , ", [",", "coma"], "flexible")).toBe("exacta");
    expect(compararTexto(".", [",", "coma"], "flexible")).toBe("ninguna");
    expect(compararTexto("árbol", ["arbol"], "estricta")).toBe("parcial");
    expect(compararTexto("Árbol", ["árbol"], "estricta")).toBe("exacta");
    expect(compararTexto("la ciudad de lima", ["ciudad de lima"], "flexible")).toBe("flexible");
    expect(compararTexto("en el mercado de Surquillo con su prima", ["abuela"], "flexible")).toBe("ninguna");
  });

  it("lectura: puntaje parcial por pregunta y retro por tipo de pregunta", () => {
    const e = evaluar(LECTURA_MERCADO.ejercicio, conRespuesta({ tipo: "lectura", respuestas: { q1: "a", q2: "La piña", q3: "a" } }));
    expect(e.resultado).toBe("parcial");
    expect(e.puntaje).toBeCloseTo(2 / 3, 3);
    expect(e.retro).toMatch(/pregunta 3 \(inferencial\)/);
    expect(e.errorDetectado).toBe("lectura_inferencial");
    const vacia = evaluar(LECTURA_MERCADO.ejercicio, conRespuesta({ tipo: "lectura", respuestas: {} }));
    expect(vacia).toMatchObject({ resultado: "incorrecto", puntaje: 0 });
    expect(vacia.retro).toMatch(/sin responder/);
  });

  it("relacionar y verdadero/falso: parciales con detalle de lo que falló", () => {
    const r = evaluar(RELACIONAR_CELULA.ejercicio, conRespuesta({ tipo: "relacionar", pares: { nucleo: "f1", membrana: "f3", cloroplasto: "f2" } }));
    expect(r.resultado).toBe("parcial");
    expect(r.puntaje).toBeCloseTo(1 / 3, 3);
    expect(r.retro).toContain("Membrana celular");
    const vf = evaluar(VERDADERO_FALSO_CELULA.ejercicio, VERDADERO_FALSO_CELULA.incorrecta);
    expect(vf).toMatchObject({ resultado: "parcial", puntaje: 0.5 });
    expect(vf.retro).toContain("Los cloroplastos son propios de las células vegetales.");
    expect(evaluar(VERDADERO_FALSO_CELULA.ejercicio, conRespuesta({ tipo: "vf", valores: { a1: false, a2: true } })).resultado).toBe("incorrecto");
  });
});

describe("escritura con rúbrica", () => {
  it("la rúbrica SIMULADA siempre devuelve incierto, con criterios y retro formativa", () => {
    for (const envio of [ESCRITURA_OPINION.correcta, ESCRITURA_OPINION.incorrecta]) {
      const e = evaluarRubricaSimulada(ESCRITURA_OPINION.ejercicio, envio);
      valida(e);
      expect(e.resultado).toBe("incierto");
      expect(e.evaluadoPor).toBe("rubrica_simulada");
      expect(e.criterios?.map((c) => c.id)).toEqual(["postura", "razones", "conectores"]);
      expect(e.retro).toMatch(/orientativa/);
    }
    const buena = evaluarRubricaSimulada(ESCRITURA_OPINION.ejercicio, ESCRITURA_OPINION.correcta);
    const corta = evaluarRubricaSimulada(ESCRITURA_OPINION.ejercicio, ESCRITURA_OPINION.incorrecta);
    expect(buena.puntaje).toBeGreaterThan(corta.puntaje);
    expect(buena.criterios?.find((c) => c.id === "conectores")?.nivel).toBeGreaterThanOrEqual(2);
    expect(corta.retro).toMatch(/palabras/);
    // `evaluar` síncrono usa la misma rúbrica simulada.
    expect(evaluar(ESCRITURA_OPINION.ejercicio, ESCRITURA_OPINION.correcta).resultado).toBe("incierto");
  });

  const consumo = { proveedor: "x", modelo: "m", tokensEntrada: 10, tokensSalida: 5, latenciaMs: 3, cache: false, simulado: false };
  const proveedor = (salidas: unknown[], simulado = false): ProveedorTutorIA => {
    let i = 0;
    const no = () => Promise.reject(new Error("no usado"));
    return {
      nombre: "prueba",
      simulado,
      responder: no,
      explicar: no,
      pista: no,
      interpretarImagen: no,
      retroalimentarAbierta: async () => ({ datos: salidas[Math.min(i++, salidas.length - 1)], consumo }) as SalidaIA<EvaluacionRubricaIA>,
    };
  };
  const criterios = (nivel: 0 | 1 | 2 | 3) => ["postura", "razones", "conectores"].map((id) => ({ id, nivel, comentario: "ok" }));

  it("con proveedor simulado usa la heurística simulada (incierto)", async () => {
    const r = await evaluadorAbierto().evaluar(ESCRITURA_OPINION.ejercicio, ESCRITURA_OPINION.correcta, proveedor([], true));
    expect(r.evaluacion).toMatchObject({ resultado: "incierto", evaluadoPor: "rubrica_simulada" });
    expect(r.consumo.simulado).toBe(true);
  });

  it("con IA: confianza alta → resultado según la rúbrica; baja → incierto; salida inválida 2 veces → incierto", async () => {
    const ok = await evaluadorAbierto().evaluar(ESCRITURA_OPINION.ejercicio, ESCRITURA_OPINION.correcta, proveedor([{ criterios: criterios(3), retroGeneral: "Muy bien", confianza: 0.9 }]));
    expect(ok.evaluacion).toMatchObject({ resultado: "correcto", evaluadoPor: "rubrica_ia", puntaje: 1 });
    const baja = await evaluadorAbierto().evaluar(ESCRITURA_OPINION.ejercicio, ESCRITURA_OPINION.correcta, proveedor([{ criterios: criterios(2), retroGeneral: "Bien", confianza: 0.3 }]));
    expect(baja.evaluacion.resultado).toBe("incierto");
    const reintento = await evaluadorAbierto().evaluar(ESCRITURA_OPINION.ejercicio, ESCRITURA_OPINION.correcta, proveedor([{ basura: 1 }, { criterios: criterios(1), retroGeneral: "Puedes mejorar", confianza: 0.8 }]));
    expect(reintento.evaluacion).toMatchObject({ resultado: "parcial", evaluadoPor: "rubrica_ia" });
    expect(reintento.consumo.tokensEntrada).toBe(20);
    const invalida = await evaluadorAbierto().evaluar(ESCRITURA_OPINION.ejercicio, ESCRITURA_OPINION.correcta, proveedor([{ basura: 1 }]));
    expect(invalida.evaluacion.resultado).toBe("incierto");
  });
});
