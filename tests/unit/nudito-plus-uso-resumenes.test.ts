import { describe, expect, it } from "vitest";
import { agregarTemas, semanaAnterior, textoResumen } from "@/lib/server/nudito-plus/resumenes";
import { codificarTema, decodificarTema, detectarTema } from "@/lib/server/nudito-plus/temas";
import { costoEstimadoUsd, mesLima, topeAlcanzado, USO_VACIO } from "@/lib/server/nudito-plus/uso";

const LIMITES = { mensajesPorMes: 300, tokensPorMes: 300_000, costoMaxUsdPorMes: 1.5 };

describe("Nudito+ · topes y costo", () => {
  it("el mes se cuenta en hora de Lima", () => {
    expect(mesLima(new Date("2026-11-01T03:00:00Z"))).toBe("2026-10"); // 31-oct 22:00 en Lima
    expect(mesLima(new Date("2026-11-01T06:00:00Z"))).toBe("2026-11");
  });

  it("corta al llegar a cualquiera de los topes", () => {
    expect(topeAlcanzado(USO_VACIO, LIMITES)).toBe(false);
    expect(topeAlcanzado({ ...USO_VACIO, mensajes: 300 }, LIMITES)).toBe(true);
    expect(topeAlcanzado({ ...USO_VACIO, tokensEntrada: 200_000, tokensSalida: 100_000 }, LIMITES)).toBe(true);
    expect(topeAlcanzado({ ...USO_VACIO, costoEstimadoUsd: 1.5 }, LIMITES)).toBe(true);
    expect(topeAlcanzado({ mensajes: 299, tokensEntrada: 1000, tokensSalida: 1000, costoEstimadoUsd: 1.49 }, LIMITES)).toBe(false);
  });

  it("estima el costo con los precios por millón del proveedor", () => {
    expect(costoEstimadoUsd(1_000_000, 500_000, { costoEntradaUsdPorMillon: 0.5, costoSalidaUsdPorMillon: 2 })).toBe(1.5);
    expect(costoEstimadoUsd(1234, 99, { costoEntradaUsdPorMillon: 0, costoSalidaUsdPorMillon: 0 })).toBe(0);
  });
});

describe("Nudito+ · temas y resúmenes (sin textos de la conversación)", () => {
  it("detecta área, tema y dificultad", () => {
    expect(detectarTema("no entiendo las fracciones", ["Matemática"])).toEqual({ area: "Matemática", tema: "Fracciones", dificultad: true });
    expect(detectarTema("quiero practicar comunicación", ["Comunicación"])).toEqual({ area: "Comunicación", tema: "General", dificultad: false });
    expect(detectarTema("hola")).toBeNull();
    expect(decodificarTema(codificarTema({ area: "Matemática", tema: "Fracciones", dificultad: true }))).toEqual({ area: "Matemática", tema: "Fracciones", dificultad: true });
  });

  it("agrupa por tema y marca para reforzar con 2+ dificultades", () => {
    const a = agregarTemas(["Matemática|Fracciones|dificultad", "Matemática|Fracciones|dificultad", "Matemática|Fracciones|ok", "Comunicación|Escritura|ok", null]);
    expect(a.temas).toEqual([{ area: "Matemática", tema: "Fracciones", mensajes: 3 }, { area: "Comunicación", tema: "Escritura", mensajes: 1 }]);
    expect(a.dificultades).toEqual(["Fracciones"]);
    const texto = textoResumen("Lucas", 2, a);
    expect(texto).toContain("Lucas practicó con Nudito+ en 2 conversaciones (5 mensajes)");
    expect(texto).toContain("Para reforzar en casa: Fracciones.");
  });

  it("la semana es de los 7 días hasta ayer (Lima)", () => {
    expect(semanaAnterior(new Date("2026-11-02T15:00:00Z"))).toEqual({ desde: "2026-10-26", hasta: "2026-11-01" });
  });
});
