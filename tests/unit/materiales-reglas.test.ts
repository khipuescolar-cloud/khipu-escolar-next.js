import { describe, expect, it } from "vitest";
import { agruparMateriales, nombreMaterial } from "@/lib/materiales";

describe("organización de materiales", () => {
  it("agrupa por año, curso y sección sin duplicar la fila", () => {
    const m = { id: "m1", secciones: [
      { anio: 2026, cursoId: "c1", curso: "Matemática", salonId: "s1", salon: "3.° B" },
      { anio: 2026, cursoId: "c2", curso: "Matemática", salonId: "s2", salon: "5.° A" },
    ] };
    const arbol = agruparMateriales([m]);
    expect(arbol).toHaveLength(1);
    expect(arbol[0].cursos[0].secciones).toHaveLength(2);
    expect(arbol[0].cursos[0].secciones[0].materiales[0]).toBe(m);
  });
  it("normaliza y limita el título", () => {
    expect(nombreMaterial("  Fracciones   equivalentes ")).toBe("Fracciones equivalentes");
    expect(() => nombreMaterial("x")).toThrow();
  });
});
