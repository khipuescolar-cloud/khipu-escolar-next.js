import { describe, expect, it } from "vitest";
import {
  expiracionJustificacion, mensajePlazoVencido, normalizarPlazoDias, textoPlazoJustificacion, ultimoDiaJustificacion,
} from "@/lib/plazo-justificacion";

describe("plazo de justificación del reglamento (días hábiles)", () => {
  it("usa 15 días hábiles por defecto", () => {
    expect(normalizarPlazoDias(undefined)).toBe(15);
    expect(normalizarPlazoDias(null)).toBe(15);
  });

  it("acepta de 1 a 30 días y descarta lo demás", () => {
    expect(normalizarPlazoDias(1)).toBe(1);
    expect(normalizarPlazoDias(30)).toBe(30);
    expect(normalizarPlazoDias(0)).toBe(15);
    expect(normalizarPlazoDias(31)).toBe(15);
    expect(normalizarPlazoDias(2.5)).toBe(15);
  });

  it("vence al fin del 15.º día hábil después de la falta (hora de Lima)", () => {
    // Falta el jueves 30/10/2025: 15 días hábiles → jueves 20/11/2025 (sábado 1/11 no cuenta).
    expect(ultimoDiaJustificacion("2025-10-30", 15)).toBe("2025-11-20");
    expect(expiracionJustificacion("2025-10-30", 15).toISOString()).toBe("2025-11-21T04:59:59.999Z");
  });

  it("muestra la fecha límite y el mensaje de plazo vencido", () => {
    // Falta el viernes 24/10/2025 → 15 días hábiles = viernes 14/11/2025.
    expect(textoPlazoJustificacion("2025-10-24", 15)).toBe("Puedes justificar hasta el vie 14 nov");
    expect(mensajePlazoVencido(15)).toBe("El plazo para justificar venció (15 días hábiles). Escribe a la tutora.");
    expect(mensajePlazoVencido(1)).toBe("El plazo para justificar venció (1 día hábil). Escribe a la tutora.");
  });
});
