import { describe, expect, it } from "vitest";
import {
  dentroDelPlazo, expiracionJustificacion, mensajePlazoVencido, normalizarPlazoDias, textoPlazoJustificacion, ultimoDiaJustificacion,
} from "@/lib/plazo-justificacion";

// Decisión del colegio (specs/07, specs/37): 15 días CALENDARIO; la falta es el día 0 y el día 15 vence a las 23:59:59 local.
describe("plazo de justificación (días calendario)", () => {
  it("usa 15 días por defecto y acepta de 1 a 30", () => {
    expect(normalizarPlazoDias(undefined)).toBe(15);
    expect(normalizarPlazoDias(null)).toBe(15);
    expect(normalizarPlazoDias(1)).toBe(1);
    expect(normalizarPlazoDias(30)).toBe(30);
    expect(normalizarPlazoDias(0)).toBe(15);
    expect(normalizarPlazoDias(31)).toBe(15);
    expect(normalizarPlazoDias(2.5)).toBe(15);
  });

  it("el día 15 es el último: cuenta fines de semana y feriados", () => {
    // Falta el jueves 05/11/2026 → día 15 = viernes 20/11/2026.
    expect(ultimoDiaJustificacion("2026-11-05", 15)).toBe("2026-11-20");
    // Cruza el 8 y 9 de diciembre (feriados) y el fin de semana: igual cuentan.
    expect(ultimoDiaJustificacion("2026-12-01", 15)).toBe("2026-12-16");
    // Cruce de año.
    expect(ultimoDiaJustificacion("2026-12-20", 15)).toBe("2027-01-04");
  });

  it("vence a las 23:59:59.999 del día 15 en la zona del colegio, no restando horas UTC", () => {
    expect(expiracionJustificacion("2026-11-05", 15).toISOString()).toBe("2026-11-21T04:59:59.999Z"); // Lima = UTC−5
    expect(expiracionJustificacion("2026-11-05", 15, "UTC").toISOString()).toBe("2026-11-20T23:59:59.999Z");
  });

  it("caso 3: presentada el día 15 (por la noche) está dentro; caso 4: el día 16 está fuera", () => {
    expect(dentroDelPlazo("2026-11-05", 15, new Date("2026-11-21T04:30:00Z"))).toBe(true); // 20/11 23:30 en Lima
    expect(dentroDelPlazo("2026-11-05", 15, new Date("2026-11-21T05:00:00Z"))).toBe(false); // 21/11 00:00 en Lima
  });

  it("muestra la fecha límite y el mensaje de plazo vencido", () => {
    expect(textoPlazoJustificacion("2026-11-05", 15)).toBe("Puedes justificar hasta el vie 20 nov");
    expect(mensajePlazoVencido(15)).toBe("El plazo para justificar venció (15 días calendario). Escribe a la tutora.");
    expect(mensajePlazoVencido(1)).toBe("El plazo para justificar venció (1 día calendario). Escribe a la tutora.");
  });
});
