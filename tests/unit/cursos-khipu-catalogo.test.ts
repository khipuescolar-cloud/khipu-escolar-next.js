import { describe, expect, it } from "vitest";
import { CURSOS_KHIPU, cursoKhipu, detectarCursoKhipu, disciplinasCedidas } from "@/lib/cursos-khipu/catalogo";
import { areaPorClave } from "@/lib/cneb/catalogo";
import { DISCIPLINAS } from "@/lib/nudito/conocimiento/disciplinas";
import { AREAS_NUDITO } from "@/lib/nudito/contratos";

describe("catálogo de cursos de Khipu", () => {
  it("tiene claves y prefijos únicos, y cada curso apunta a un área CNEB", () => {
    expect(new Set(CURSOS_KHIPU.map(c => c.clave)).size).toBe(CURSOS_KHIPU.length);
    const prefijos = CURSOS_KHIPU.flatMap(c => (c.prefijo ? [c.prefijo] : []));
    expect(new Set(prefijos).size).toBe(prefijos.length);
    for (const c of CURSOS_KHIPU) expect(areaPorClave(c.area), c.clave).toBeTruthy();
  });
  it("los cursos con Nudito tienen prefijo y solo ceden disciplinas de su área", () => {
    for (const c of CURSOS_KHIPU.filter(c => c.nudito)) {
      expect(c.prefijo, c.clave).toBeTruthy();
      expect(AREAS_NUDITO).toContain(c.area);
      for (const d of c.disciplinas) expect(DISCIPLINAS[c.area as keyof typeof DISCIPLINAS]).toContain(d);
    }
    expect(cursoKhipu("arte-cultura")?.nudito).toBe(false);
  });
  it("detecta el curso especializado antes que el área", () => {
    expect(detectarCursoKhipu("Álgebra", "secundaria")?.clave).toBe("algebra");
    expect(detectarCursoKhipu("Química", "primaria")?.clave).toBe("quimica");
    expect(detectarCursoKhipu("Razonamiento Verbal")?.clave).toBe("razonamiento-verbal");
    expect(detectarCursoKhipu("Matemática", "primaria")?.clave).toBe("matematica");
    expect(detectarCursoKhipu("Ciencia y Tecnología", "secundaria")?.clave).toBe("ciencia-tecnologia");
    expect(detectarCursoKhipu("Taller de robótica")).toBeNull();
  });
  it("calcula las disciplinas que el área cede en un grado", () => {
    expect([...disciplinasCedidas("ciencia-tecnologia", ["ciencia-tecnologia", "quimica", "fisica", "algebra"])].sort()).toEqual(["fisica", "quimica"]);
    expect(disciplinasCedidas("matematica", ["matematica"]).size).toBe(0);
  });
});
