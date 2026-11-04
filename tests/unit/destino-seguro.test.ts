import { describe, expect, it } from "vitest";
import { destinoSeguro } from "@/lib/destino-seguro";

describe("destinoSeguro (redirección abierta)", () => {
  it("acepta rutas propias con query y hash", () => {
    expect(destinoSeguro("/restablecer", "/x")).toBe("/restablecer");
    expect(destinoSeguro("/entrando?colegio=nuevohorizonte", "/x")).toBe("/entrando?colegio=nuevohorizonte");
    expect(destinoSeguro("/inicio#hoy", "/x")).toBe("/inicio#hoy");
  });

  it("rechaza destinos que escapan a otro origen", () => {
    for (const malo of [
      "//evil.example", "/\\evil.example", "\\\\evil.example", "/\\/evil.example", "https://evil.example", "evil.example",
      "javascript:alert(1)", "/\t/evil.example", "/\n/evil.example", " /evil", "",
    ]) {
      expect(destinoSeguro(malo, "/restablecer"), malo).toBe("/restablecer");
    }
    expect(destinoSeguro(null, "/restablecer")).toBe("/restablecer");
    expect(destinoSeguro(undefined)).toBe("/");
  });
});
