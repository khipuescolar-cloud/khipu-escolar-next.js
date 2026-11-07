import { describe, expect, it } from "vitest";
import { ddmm, faltantesDelPeriodo, hoyEnZona, periodoTerminado } from "@/lib/calificacion-periodo";

const alumnos = [{ id: "a1", nombre: "Quispe, Mateo" }, { id: "a2", nombre: "Ríos, Valentina" }];
const competencias = [{ id: "c1", nombre: "Resuelve" }, { id: "c2", nombre: "Comunica" }];

describe("disponibilidad de la calificación del periodo", () => {
  it("usa el día del colegio, no el UTC", () => {
    expect(hoyEnZona("America/Lima", new Date("2026-05-16T03:00:00Z"))).toBe("2026-05-15");
  });
  it("se habilita el último día del periodo", () => {
    expect(periodoTerminado("2026-05-15", "2026-05-14")).toBe(false);
    expect(periodoTerminado("2026-05-15", "2026-05-15")).toBe(true);
    expect(periodoTerminado("2026-05-15", "2026-06-01")).toBe(true);
  });
  it("da la fecha como dd/mm", () => expect(ddmm("2026-12-18")).toBe("18/12"));
});

describe("qué falta para enviar", () => {
  it("pide calificación en cada celda y conclusión en B y C, sin promediar nada", () => {
    const celdas = { "a1:c1": { valor: "AD", conclusion: "" }, "a1:c2": { valor: "B", conclusion: "" }, "a2:c1": { valor: "C", conclusion: "Refuerza." } };
    expect(faltantesDelPeriodo(alumnos, competencias, celdas, "literal").map((f) => `${f.alumnoId}:${f.competenciaId}:${f.falta}`)).toEqual(["a1:c2:conclusion", "a2:c2:calificacion"]);
  });
  it("en escala vigesimal no exige conclusión", () => {
    const celdas = { "a1:c1": { valor: "5", conclusion: "" }, "a1:c2": { valor: "20", conclusion: "" } };
    expect(faltantesDelPeriodo([alumnos[0]], competencias, celdas, "vigesimal")).toEqual([]);
  });
});
