import { describe, expect, it } from "vitest";
import { anioEscolarSugerido, nivelesConOtroTipo, nombrePeriodo, organizacionDelAnio, periodosSugeridos } from "@/lib/periodos-academicos";

describe("organización del año escolar", () => {
  it("nombra los periodos con números romanos", () => {
    expect(nombrePeriodo("bimestre", 4)).toBe("IV Bimestre");
    expect(nombrePeriodo("trimestre", 2)).toBe("II Trimestre");
  });

  it("sugiere el año escolar del segundo lunes de marzo al tercer viernes de diciembre", () => {
    expect(anioEscolarSugerido(2027)).toEqual({ inicio: "2027-03-08", fin: "2027-12-17" });
    expect(anioEscolarSugerido(2026)).toEqual({ inicio: "2026-03-09", fin: "2026-12-18" });
  });

  it("parte el año en periodos seguidos, sin huecos", () => {
    const tri = periodosSugeridos(2027, "trimestre");
    expect(tri.map((p) => p.nombre)).toEqual(["I Trimestre", "II Trimestre", "III Trimestre"]);
    expect(tri[0].inicio).toBe("2027-03-08");
    expect(tri.at(-1)!.fin).toBe("2027-12-17");
    for (let i = 1; i < tri.length; i++) expect(Date.parse(tri[i].inicio) - Date.parse(tri[i - 1].fin)).toBe(86_400_000);
    expect(periodosSugeridos(2027, "bimestre")).toHaveLength(4);
    expect(periodosSugeridos(2027, "semestre")).toHaveLength(2);
  });

  it("cada nivel usa un solo tipo de periodo en el año", () => {
    const periodos = [
      { tipo: "trimestre" as const, niveles: ["primaria" as const] },
      { tipo: "bimestre" as const, niveles: ["secundaria" as const, "inicial" as const] },
    ];
    expect(organizacionDelAnio(periodos)).toEqual({ inicial: "bimestre", primaria: "trimestre", secundaria: "bimestre", academia: null });
    expect(nivelesConOtroTipo(periodos, "bimestre", ["primaria", "academia", "secundaria"])).toEqual(["primaria"]);
  });
});
