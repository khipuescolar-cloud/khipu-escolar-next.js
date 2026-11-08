import { describe, expect, it } from "vitest";
import { CLAVE_ANIO, periodoElegido, periodosParaAsistencia, porcentajeCurso } from "@/lib/periodos-asistencia";

const BIMESTRES = [
  { numero: 1, nombre: "I Bimestre", inicio: "2026-03-09", fin: "2026-05-08" },
  { numero: 2, nombre: "II Bimestre", inicio: "2026-05-18", fin: "2026-07-17" },
  { numero: 3, nombre: "III Bimestre", inicio: "2026-08-03", fin: "2026-10-02" },
  { numero: 4, nombre: "IV Bimestre", inicio: "2026-10-12", fin: "2026-12-18" },
];

describe("periodos de «Mi asistencia»", () => {
  it("lista los periodos empezados, recorta el actual a hoy y termina con «Año» desde el inicio de clases", () => {
    const lista = periodosParaAsistencia(BIMESTRES, "2026-08-20");
    expect(lista.map((p) => p.nombre)).toEqual(["I Bimestre", "II Bimestre", "III Bimestre", "Año"]);
    expect(lista[2]).toMatchObject({ desde: "2026-08-03", hasta: "2026-08-20" });
    expect(lista.at(-1)).toEqual({ clave: CLAVE_ANIO, nombre: "Año", desde: "2026-03-09", hasta: "2026-08-20" });
  });

  it("sin periodos, «Año» va desde el 1.º de enero", () => {
    expect(periodosParaAsistencia([], "2026-04-02")).toEqual([{ clave: CLAVE_ANIO, nombre: "Año", desde: "2026-01-01", hasta: "2026-04-02" }]);
  });

  it("elige el pedido, si no el periodo de hoy, y «Año» en vacaciones o cuando se pide por defecto", () => {
    const lista = periodosParaAsistencia(BIMESTRES, "2026-11-08");
    expect(periodoElegido(lista, "2", "2026-11-08").nombre).toBe("II Bimestre");
    expect(periodoElegido(lista, "x", "2026-11-08").nombre).toBe("IV Bimestre");
    expect(periodoElegido(lista, null, "2026-11-08", "anio").nombre).toBe("Año");
    const enVacaciones = periodosParaAsistencia(BIMESTRES, "2026-07-25");
    expect(periodoElegido(enVacaciones, null, "2026-07-25").nombre).toBe("Año");
  });

  it("el % de un curso es clases sin falta entre clases con lista", () => {
    expect(porcentajeCurso(48, 3)).toBe(93.8);
    expect(porcentajeCurso(0, 0)).toBeNull();
  });
});
