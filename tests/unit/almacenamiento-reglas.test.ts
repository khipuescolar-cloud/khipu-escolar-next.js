import { describe, expect, it } from "vitest";
import { limitePorDefecto, segundosUrl, tiposDe, umbralDe, umbralRearmado } from "@/lib/almacenamiento";
describe("reglas de almacenamiento", () => {
  it("asigna la cuota provisional por rango", () => {
    expect(limitePorDefecto(100)).toBe(BigInt(20) * BigInt(1024) ** BigInt(3));
    expect(limitePorDefecto(101)).toBe(BigInt(60) * BigInt(1024) ** BigInt(3));
    expect(limitePorDefecto(1001)).toBeNull();
  });
  it("aplica histéresis a los avisos", () => {
    expect(umbralDe(86)).toBe(85);
    expect(umbralRearmado(85, 81)).toBe(85);
    expect(umbralRearmado(85, 79)).toBe(70);
  });
  it("acorta enlaces sensibles y restringe tipos", () => {
    expect(segundosUrl("entrega")).toBe(60);
    expect(segundosUrl("material_clase")).toBe(300);
    expect(tiposDe("documento").has("application/vnd.oasis.opendocument.text")).toBe(false);
  });
});
