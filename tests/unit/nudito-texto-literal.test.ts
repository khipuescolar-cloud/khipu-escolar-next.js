import { describe, expect, it } from "vitest";
import { compararTexto } from "@/lib/nudito/evaluadores/comun";

describe("comparación de texto corto", () => {
  it("no acepta números ni palabras cortas con una letra distinta", () => {
    expect(compararTexto("2, 3, 6", ["2, 3, 5"], "flexible")).not.toMatch(/exacta|flexible|casi/);
    expect(compararTexto("2, 3, 6", ["2, 3, 5"], "literal")).toBe("ninguna");
    expect(compararTexto("menor que", ["mayor que"], "flexible")).not.toMatch(/exacta|flexible|casi/);
    expect(compararTexto("ABCC", ["ABBC"], "literal")).toBe("ninguna");
  });
  it("tolera un error de tipeo en una palabra larga", () => {
    expect(compararTexto("trianglo", ["triángulo"], "flexible")).toBe("casi");
    expect(compararTexto("Trianglo", ["triángulo"], "literal")).toBe("casi");
  });
  it("en modo literal conserva orden y signos pero ignora mayúsculas, tildes y espacios", () => {
    expect(compararTexto("30 ÷ 5", ["30÷5"], "literal")).toBe("exacta");
    expect(compararTexto("5÷30", ["30÷5"], "literal")).toBe("ninguna");
    expect(compararTexto("3+3+3", ["3+3+3+3"], "literal")).toBe("ninguna");
    expect(compararTexto("Siete y media.", ["siete y media"], "literal")).toBe("exacta");
  });
});
