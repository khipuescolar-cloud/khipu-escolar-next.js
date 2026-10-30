import { describe, expect, it } from "vitest";
import { motivoSinCuentaPorGrado } from "@/lib/cuenta-alumno";

describe("cuenta propia del alumno según su grado", () => {
  it("inicial nunca tiene cuenta propia", () => {
    expect(motivoSinCuentaPorGrado("inicial", null, 1)).toMatch(/inicial/);
  });

  it("primaria desde el grado mínimo del colegio", () => {
    expect(motivoSinCuentaPorGrado("primaria", 4, 5)).toBe("Este colegio da cuenta propia desde 5.° de primaria.");
    expect(motivoSinCuentaPorGrado("primaria", 5, 5)).toBeNull();
    expect(motivoSinCuentaPorGrado("primaria", 1, 1)).toBeNull();
    expect(motivoSinCuentaPorGrado("primaria", 2, 3)).toBe("Este colegio da cuenta propia desde 3.° de primaria.");
  });

  it("secundaria y academia siempre; primaria sin grado registrado no se bloquea", () => {
    expect(motivoSinCuentaPorGrado("secundaria", 1, 6)).toBeNull();
    expect(motivoSinCuentaPorGrado("academia", null, 6)).toBeNull();
    expect(motivoSinCuentaPorGrado("primaria", null, 6)).toBeNull();
  });
});
