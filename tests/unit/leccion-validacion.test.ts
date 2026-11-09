import { describe, expect, it } from "vitest";
import { esquemaLeccion, validarLeccion, hashContenido, puedeTransicionarLeccion, mapearEstadoProgreso } from "@/lib/nudito/leccion";

const contenido = { titulo: "Fracciones", idea: "Una fracción representa partes iguales.", explicacion: "Divide el entero en partes iguales.", ejemplos: [{ enunciado: "¿Cuánto es 1/2?", desarrollo: "Una de dos partes." }], recursos: [], ejerciciosMuestra: [{ enunciado: "1 + 1", respuesta: "2", pistas: ["Suma uno más."] }] };
describe("lecciones de Nudito", () => {
  it("valida contenido y respuestas con el evaluador", () => {
    expect(esquemaLeccion.safeParse(contenido).success).toBe(true);
    expect(validarLeccion(contenido, { evaluar: m => m.respuesta === "2" }).ok).toBe(true);
    expect(validarLeccion(contenido, { evaluar: () => false }).errores).toContain("Una respuesta de muestra no coincide con el evaluador.");
    expect(validarLeccion({ ...contenido, idea: "x".repeat(401) }).ok).toBe(false);
    expect(validarLeccion({ ...contenido, explicacion: "Escribe a persona@test.com" }).ok).toBe(false);
    expect(validarLeccion({ ...contenido, recursos: [{ tipo: "enlace", titulo: "fuente", valor: "http://ejemplo.test" }] }).ok).toBe(false);
    expect(validarLeccion({ ...contenido, recursos: [{ tipo: "enlace", titulo: "fuente", valor: "https://ejemplo.test" }] }).ok).toBe(false);
    expect(validarLeccion({ ...contenido, recursos: [{ tipo: "enlace", titulo: "fuente", valor: "https://ejemplo.test" }] }, { permitirEnlace: url => url.hostname === "ejemplo.test" }).ok).toBe(true);
  });
  it("calcula un hash estable con distinto orden de propiedades", () => {
    expect(hashContenido({ a: 1, b: 2 })).toBe(hashContenido({ b: 2, a: 1 }));
    expect(hashContenido({ a: 1 })).not.toBe(hashContenido({ a: 2 }));
  });
  it("exige validación y edición docente de IA simulada", () => {
    expect(puedeTransicionarLeccion("borrador", "enviar_revision", { origen: "catalogo", valida: false }).ok).toBe(false);
    expect(puedeTransicionarLeccion("borrador", "enviar_revision", { origen: "catalogo", valida: true })).toEqual({ ok: true, siguiente: "en_revision" });
    expect(puedeTransicionarLeccion("en_revision", "aprobar", { origen: "ia_simulada" }).ok).toBe(false);
    expect(puedeTransicionarLeccion("en_revision", "aprobar", { origen: "docente" })).toEqual({ ok: true, siguiente: "aprobada" });
    expect(puedeTransicionarLeccion("aprobada", "publicar", { origen: "docente" })).toEqual({ ok: true, siguiente: "publicada" });
    expect(puedeTransicionarLeccion("retirada", "publicar", { origen: "docente" }).ok).toBe(false);
  });
  it.each([
    [null, "pendiente"], ["no_iniciado", "pendiente"], ["en_progreso", "en_progreso"], ["en_comprobacion", "en_progreso"], ["reforzar", "necesita_refuerzo"], ["dominado", "dominado"],
  ] as const)("mapea %s a %s", (estado, esperado) => expect(mapearEstadoProgreso(estado)).toBe(esperado));
});
