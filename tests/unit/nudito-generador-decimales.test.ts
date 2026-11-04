import { describe, expect, it } from "vitest";
import { temaPorClave } from "@/lib/nudito/catalogo";
import type { Dificultad } from "@/lib/nudito/contratos";
import { ejercicioPara } from "@/lib/nudito/generadores/registro";

// «Números decimales» (5.° de primaria) usa `mat.operaciones`: debe practicar con decimales, no con enteros sueltos.
describe("mat.operaciones · subtipo decimales", () => {
  it("el tema de números decimales genera ejercicios con coma decimal y respuesta con hasta 2 decimales", () => {
    const tema = temaPorClave("mat.p5.numeros-decimales")!;
    for (let s = 0; s < 300; s++) {
      const d = (tema.dificultad.min + (s % (tema.dificultad.max - tema.dificultad.min + 1))) as Dificultad;
      const e = ejercicioPara(tema, d, s);
      expect(e.publico.enunciado, e.publico.enunciado).toMatch(/\d,\d/);
      const valor = e.solucion.tipo === "numerico" ? e.solucion.valor : null;
      if (valor !== null) expect(Math.abs(valor * 100 - Math.round(valor * 100))).toBeLessThan(1e-6);
    }
  });
});
