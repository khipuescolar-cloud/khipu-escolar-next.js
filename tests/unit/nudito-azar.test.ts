import { describe, expect, it } from "vitest";
import { crearAzar, derivarSemilla, nuevaSemilla } from "@/lib/nudito/azar";

describe("azar de Nudito (mulberry32)", () => {
  it("es determinista: misma semilla → misma secuencia", () => {
    const a = crearAzar(42);
    const b = crearAzar(42);
    const sa = Array.from({ length: 50 }, () => a.siguiente());
    expect(Array.from({ length: 50 }, () => b.siguiente())).toEqual(sa);
    expect(Array.from({ length: 50 }, () => crearAzar(43).siguiente())).not.toEqual(sa);
  });

  it("siguiente está en [0, 1) y entero respeta el rango con ambos extremos", () => {
    const azar = crearAzar(7);
    const vistos = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const x = azar.siguiente();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const n = azar.entero(-2, 3);
      expect(n).toBeGreaterThanOrEqual(-2);
      expect(n).toBeLessThanOrEqual(3);
      vistos.add(n);
    }
    expect([...vistos].sort((p, q) => p - q)).toEqual([-2, -1, 0, 1, 2, 3]);
    expect(() => azar.entero(5.2, 5.8)).toThrow();
  });

  it("elegir y barajar son deterministas y conservan los elementos", () => {
    const lista = ["a", "b", "c", "d", "e"];
    expect(crearAzar(1).barajar(lista)).toEqual(crearAzar(1).barajar(lista));
    expect([...crearAzar(1).barajar(lista)].sort()).toEqual(lista);
    expect(lista).toEqual(["a", "b", "c", "d", "e"]);
    expect(lista).toContain(crearAzar(9).elegir(lista));
    expect(() => crearAzar(9).elegir([])).toThrow();
  });

  it("acepta semillas negativas, decimales o no finitas sin romperse", () => {
    for (const s of [-1, 3.7, Number.NaN, 2 ** 40]) expect(crearAzar(s).siguiente()).toBeLessThan(1);
  });

  it("derivarSemilla es estable y nuevaSemilla da enteros de 31 bits", () => {
    expect(derivarSemilla(5, "ej", 1)).toBe(derivarSemilla(5, "ej", 1));
    expect(derivarSemilla(5, "ej", 1)).not.toBe(derivarSemilla(5, "ej", 2));
    const s = nuevaSemilla();
    expect(Number.isInteger(s) && s >= 0 && s < 2 ** 31).toBe(true);
  });
});
