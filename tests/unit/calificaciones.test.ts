import { describe, expect, it } from "vitest";
import {
  aprobado, ETIQUETA_LITERAL, interpretarValor, requiereConclusion, sugerirCalificacion, sugerirLiteral, sugerirVigesimal, textoValorLargo,
} from "@/lib/calificaciones";

describe("escalas de calificación", () => {
  it("etiqueta los niveles literales del CNEB", () => {
    expect(ETIQUETA_LITERAL).toEqual({ AD: "Logro destacado", A: "Logro esperado", B: "En proceso", C: "En inicio" });
  });

  it("aprueba desde 11 en vigesimal", () => {
    expect(aprobado(11)).toBe(true);
    expect(aprobado(10.99)).toBe(false);
    expect(aprobado(10, 10)).toBe(true);
  });

  it("interpreta lo escrito según la escala", () => {
    expect(interpretarValor("literal", " ad ")).toEqual({ ok: true, valor: { valorLiteral: "AD", valorNumerico: null } });
    expect(interpretarValor("literal", "D").ok).toBe(false);
    expect(interpretarValor("vigesimal", "14,5")).toEqual({ ok: true, valor: { valorLiteral: null, valorNumerico: 14.5 } });
    expect(interpretarValor("vigesimal", "21").ok).toBe(false);
    expect(interpretarValor("vigesimal", "-1").ok).toBe(false);
    expect(interpretarValor("vigesimal", "abc").ok).toBe(false);
    expect(interpretarValor("vigesimal", "")).toEqual({ ok: true, valor: null });
  });

  it("exige conclusión descriptiva en B y C", () => {
    expect(requiereConclusion("B")).toBe(true);
    expect(requiereConclusion("C")).toBe(true);
    expect(requiereConclusion("A")).toBe(false);
    expect(requiereConclusion(null)).toBe(false);
  });

  it("muestra valores con su significado", () => {
    expect(textoValorLargo({ valorLiteral: "AD", valorNumerico: null })).toBe("AD · Logro destacado");
    expect(textoValorLargo({ valorLiteral: null, valorNumerico: 9 })).toBe("9 · Por reforzar");
  });
});

describe("calificación sugerida", () => {
  it("vigesimal: promedio ponderado redondeado al entero", () => {
    expect(sugerirVigesimal([{ valor: 16, peso: 1 }, { valor: 12, peso: 1 }])).toBe(14);
    expect(sugerirVigesimal([{ valor: 10, peso: 1 }, { valor: 20, peso: 3 }])).toBe(18); // 17.5 → 18
    expect(sugerirVigesimal([{ valor: 13, peso: 2 }, { valor: 10, peso: 1 }])).toBe(12); // 12
    expect(sugerirVigesimal([])).toBeNull();
  });

  it("literal: el más frecuente", () => {
    const f = (valor: "AD" | "A" | "B" | "C", fecha: string) => ({ valor, fecha });
    expect(sugerirLiteral([f("A", "2026-10-01"), f("B", "2026-10-02"), f("A", "2026-10-03")])).toBe("A");
  });

  it("literal: empate hacia el más reciente", () => {
    const f = (valor: "AD" | "A" | "B" | "C", fecha: string) => ({ valor, fecha });
    expect(sugerirLiteral([f("A", "2026-10-01"), f("B", "2026-10-09"), f("A", "2026-10-02"), f("B", "2026-10-03")])).toBe("B");
    expect(sugerirLiteral([])).toBeNull();
  });

  it("elige la sugerencia según la escala e ignora notas de la otra", () => {
    const notas = [
      { valorLiteral: null, valorNumerico: 15, peso: 1, fecha: "2026-10-01" },
      { valorLiteral: null, valorNumerico: 17, peso: 1, fecha: "2026-10-02" },
    ];
    expect(sugerirCalificacion("vigesimal", notas)).toEqual({ valorLiteral: null, valorNumerico: 16 });
    expect(sugerirCalificacion("literal", notas)).toBeNull();
  });
});
