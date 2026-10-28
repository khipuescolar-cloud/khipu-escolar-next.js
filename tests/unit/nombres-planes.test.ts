import { describe, expect, it } from "vitest";
import { nombresDeCatalogo, ofrecidosDeCatalogo, type CatalogoModulos } from "@/lib/server/modulos";

const catalogo = (planes: CatalogoModulos["planes"]): CatalogoModulos => ({ planes, desactivadosPorRol: new Map() });

describe("nombres comerciales de planes", () => {
  it("sin catálogo usa los nombres de código", () => {
    expect(nombresDeCatalogo(catalogo([]))).toEqual({ basico: "Básico", fase2: "Familia", promax: "Pro Max" });
    expect(ofrecidosDeCatalogo(catalogo([])).map((p) => p.plan)).toEqual(["basico", "fase2", "promax"]);
  });

  it("el catálogo manda y los planes que faltan usan el respaldo", () => {
    const n = nombresDeCatalogo(catalogo([{ plan: "fase2", nombre: "Comunidad", orden: 2, activo: true, modulos: [] }]));
    expect(n).toEqual({ basico: "Básico", fase2: "Comunidad", promax: "Pro Max" });
  });

  it("planesOfrecidos deja fuera los inactivos y ordena por orden, pero nombres los incluye", () => {
    const c = catalogo([
      { plan: "promax", nombre: "Total", orden: 1, activo: true, modulos: [] },
      { plan: "fase2", nombre: "Comunidad", orden: 3, activo: false, modulos: [] },
      { plan: "basico", nombre: "Inicial", orden: 2, activo: true, modulos: [] },
    ]);
    expect(ofrecidosDeCatalogo(c)).toEqual([{ plan: "promax", nombre: "Total" }, { plan: "basico", nombre: "Inicial" }]);
    expect(nombresDeCatalogo(c).fase2).toBe("Comunidad");
  });
});
