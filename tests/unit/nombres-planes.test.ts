import { describe, expect, it } from "vitest";
import { nombresDeCatalogo, ofrecidosDeCatalogo, type CatalogoModulos } from "@/lib/server/modulos";

const catalogo = (planes: CatalogoModulos["planes"]): CatalogoModulos => ({ planes, desactivadosPorRol: new Map() });

describe("nombres comerciales de planes", () => {
  it("sin catálogo usa los nombres de código", () => {
    expect(nombresDeCatalogo(catalogo([]))).toEqual({ base: "Khipu Base", pro: "Khipu Pro" });
    expect(ofrecidosDeCatalogo(catalogo([])).map((p) => p.plan)).toEqual(["base", "pro"]);
  });

  it("el catálogo manda y los planes que faltan usan el respaldo", () => {
    const n = nombresDeCatalogo(catalogo([{ plan: "pro", nombre: "Comunidad", orden: 2, activo: true, modulos: [] }]));
    expect(n).toEqual({ base: "Khipu Base", pro: "Comunidad" });
  });

  it("planesOfrecidos deja fuera los inactivos y ordena por orden, pero nombres los incluye", () => {
    const c = catalogo([
      { plan: "pro", nombre: "Total", orden: 1, activo: true, modulos: [] },
      { plan: "base", nombre: "Inicial", orden: 2, activo: false, modulos: [] },
    ]);
    expect(ofrecidosDeCatalogo(c)).toEqual([{ plan: "pro", nombre: "Total" }]);
    expect(nombresDeCatalogo(c).base).toBe("Inicial");
  });
});
