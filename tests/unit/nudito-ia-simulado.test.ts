// Proveedor de IA simulado del tutor y validación de salidas (specs/41): determinista, sin red, salidas válidas con zod.
import { describe, expect, it } from "vitest";
import { esquemaEvaluacionRubrica, esquemaExplicacion, esquemaLecturaImagen, esquemaPista, type ProveedorTutorIA } from "@/lib/nudito/contratos";
import { claveCache, guardarCache, leerCache, limpiarCache } from "@/lib/server/nudito/ia/consumo";
import { conValidacion, extraerJson } from "@/lib/server/nudito/ia/esquemas";
import { proveedorSimulado } from "@/lib/server/nudito/ia/proveedor";
import { ESCRITURA_OPINION, NUMERICO_ECUACION, RUBRICA_OPINION_S2 } from "../fixtures/nudito/ejercicios";
import { TEMA_MAT_FRACCIONES } from "../fixtures/nudito/temas";

const ia = proveedorSimulado();

describe("proveedor simulado", () => {
  it("explica con el repaso revisado, determinista y con variación por duda", async () => {
    const a = await ia.explicar({ tema: TEMA_MAT_FRACCIONES });
    const b = await ia.explicar({ tema: TEMA_MAT_FRACCIONES });
    expect(esquemaExplicacion.parse(a.datos)).toEqual(b.datos);
    expect(a.datos.texto).toContain(TEMA_MAT_FRACCIONES.repaso.idea);
    expect(a.datos.ejemplo).toBe(TEMA_MAT_FRACCIONES.repaso.ejemplo);
    expect(a.consumo).toMatchObject({ proveedor: "simulado", simulado: true });
    const c = await ia.explicar({ tema: TEMA_MAT_FRACCIONES, duda: "no entiendo cómo amplificar" });
    expect(c.datos.texto).toContain("Sobre lo que preguntas");
  });

  it("pista: usa la pista revisada del nivel y no marca revelación", async () => {
    for (const nivel of [1, 2, 3] as const) {
      const p = await ia.pista({ ejercicio: NUMERICO_ECUACION.ejercicio.publico, nivel, pistaBase: NUMERICO_ECUACION.ejercicio.pistas[nivel - 1] });
      expect(esquemaPista.parse(p.datos).revelaRespuesta).toBe(false);
      expect(p.datos.texto).toContain(NUMERICO_ECUACION.ejercicio.pistas[nivel - 1]);
      expect(p.datos.texto).not.toMatch(/x = 4/);
    }
  });

  it("rúbrica: salida válida y confianza baja (la usa solo como orientación)", async () => {
    const r = await ia.retroalimentarAbierta({ consigna: "Opina", texto: (ESCRITURA_OPINION.correcta.respuesta as { texto: string }).texto, rubrica: RUBRICA_OPINION_S2 });
    expect(esquemaEvaluacionRubrica.parse(r.datos).criterios.map((c) => c.id)).toEqual(["postura", "razones", "conectores"]);
    expect(r.datos.confianza).toBeLessThan(0.6);
  });

  it("imagen: no se lee salvo con una transcripción fija de prueba", async () => {
    const bytes = new Uint8Array(10);
    expect(esquemaLecturaImagen.parse((await ia.interpretarImagen({ mime: "image/png", bytes, proposito: "ejercicio" })).datos)).toMatchObject({ legible: false });
    const fija = proveedorSimulado({ transcripcionFija: "2x = 8" });
    expect((await fija.interpretarImagen({ mime: "image/png", bytes, proposito: "procedimiento" })).datos).toMatchObject({ legible: true, transcripcion: "2x = 8" });
  });

  it("responder: socrático, sin dar el resultado", async () => {
    const r = await ia.responder({ sistema: "", mensajes: [{ rol: "usuario", texto: "¿cuánto es 6 x 7?" }] });
    expect(r.texto).toContain("?");
    expect(r.texto).not.toContain("42");
  });
});

describe("validación de salidas (zod + 1 reintento + respaldo)", () => {
  const nombre = { nombre: "x", simulado: true };
  const consumo = { proveedor: "x", modelo: null, tokensEntrada: 5, tokensSalida: 5, latenciaMs: 1, cache: false, simulado: true };

  it("válida al primer intento", async () => {
    const r = await conValidacion(esquemaPista, async () => ({ datos: { texto: "hola", revelaRespuesta: false }, consumo }), () => ({ texto: "respaldo", revelaRespuesta: false }), nombre);
    expect(r).toMatchObject({ respaldo: false, datos: { texto: "hola" } });
  });

  it("inválida y luego válida → usa el reintento y suma los tokens", async () => {
    let n = 0;
    const r = await conValidacion(esquemaPista, async () => ({ datos: n++ === 0 ? { texto: "" } : { texto: "ok", revelaRespuesta: false }, consumo }), () => ({ texto: "respaldo", revelaRespuesta: false }), nombre);
    expect(r).toMatchObject({ respaldo: false, datos: { texto: "ok" }, consumo: { tokensEntrada: 10 } });
  });

  it("falla dos veces (excepción o esquema) → respaldo determinista con el error", async () => {
    let llamadas = 0;
    const r = await conValidacion(esquemaPista, async () => {
      llamadas++;
      throw new Error("caído");
    }, () => ({ texto: "respaldo", revelaRespuesta: false }), nombre);
    expect(llamadas).toBe(2);
    expect(r).toMatchObject({ respaldo: true, datos: { texto: "respaldo" }, error: "caído" });
  });

  it("extrae JSON envuelto en ```json", () => {
    expect(extraerJson('```json\n{"claves":["a"]}\n```')).toEqual({ claves: ["a"] });
    expect(() => extraerJson("sin json")).toThrow();
  });

  it("el proveedor simulado cumple la interfaz completa", () => {
    const p: ProveedorTutorIA = ia;
    expect(p.simulado).toBe(true);
  });
});

describe("caché de explicaciones", () => {
  it("clave sin datos personales y con versión", () => {
    limpiarCache();
    const k = claveCache("mat.p4.fracciones-equivalentes", 4, 1);
    expect(k).toBe("mat.p4.fracciones-equivalentes|4|v1");
    guardarCache(k, { texto: "t" });
    expect(leerCache(k)).toEqual({ texto: "t" });
    expect(leerCache(claveCache("mat.p4.fracciones-equivalentes", 4, 2))).toBeUndefined();
  });
});
