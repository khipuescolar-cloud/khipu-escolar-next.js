import { describe, expect, it } from "vitest";
import { expiracionJustificacion, normalizarPlazoHoras } from "@/lib/plazo-justificacion";

describe("plazo de justificación del reglamento", () => {
  it("usa 48 horas por defecto", () => {
    expect(normalizarPlazoHoras(undefined)).toBe(48);
    expect(normalizarPlazoHoras(null)).toBe(48);
  });

  it("acepta de 24 a 168 horas y descarta lo demás", () => {
    expect(normalizarPlazoHoras(24)).toBe(24);
    expect(normalizarPlazoHoras(168)).toBe(168);
    expect(normalizarPlazoHoras(23)).toBe(48);
    expect(normalizarPlazoHoras(169)).toBe(48);
    expect(normalizarPlazoHoras(36.5)).toBe(48);
  });

  it("calcula el vencimiento desde el aviso", () => {
    const ahora = new Date("2026-10-27T13:00:00Z");
    expect(expiracionJustificacion(ahora, undefined).toISOString()).toBe("2026-10-29T13:00:00.000Z");
    expect(expiracionJustificacion(ahora, 72).toISOString()).toBe("2026-10-30T13:00:00.000Z");
  });
});
