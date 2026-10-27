import { describe, expect, it } from "vitest";
import { domingoDePascua, esDiaHabil, feriadosNacionales, finDelDia, sumarDiasHabiles, venceJustificacion } from "@/lib/dias-habiles";

describe("días hábiles del Perú", () => {
  it("sábado y domingo no son hábiles", () => {
    expect(esDiaHabil("2026-10-24")).toBe(false); // sábado
    expect(esDiaHabil("2026-10-25")).toBe(false); // domingo
    expect(esDiaHabil("2026-10-26")).toBe(true); // lunes
    expect(esDiaHabil("2026-10-30")).toBe(true); // viernes
  });

  it("calcula la Pascua (Gauss/Meeus)", () => {
    expect(domingoDePascua(2024)).toBe("2024-03-31");
    expect(domingoDePascua(2025)).toBe("2025-04-20");
    expect(domingoDePascua(2026)).toBe("2026-04-05");
    expect(domingoDePascua(2027)).toBe("2027-03-28");
    expect(domingoDePascua(2038)).toBe("2038-04-25");
  });

  it("Jueves y Viernes Santo no son hábiles (2026 y 2027)", () => {
    expect(esDiaHabil("2026-04-02")).toBe(false);
    expect(esDiaHabil("2026-04-03")).toBe(false);
    expect(esDiaHabil("2026-04-01")).toBe(true);
    expect(esDiaHabil("2026-04-06")).toBe(true); // lunes de Pascua sí es hábil
    expect(esDiaHabil("2027-03-25")).toBe(false);
    expect(esDiaHabil("2027-03-26")).toBe(false);
    // Falta el miércoles 1/4/2026: el siguiente hábil es el lunes 6/4.
    expect(sumarDiasHabiles("2026-04-01", 1)).toBe("2026-04-06");
  });

  it("lista los 16 feriados nacionales del año", () => {
    const f = feriadosNacionales(2026);
    expect(f).toHaveLength(16);
    for (const d of ["2026-01-01", "2026-05-01", "2026-06-07", "2026-06-29", "2026-07-23", "2026-07-28", "2026-07-29", "2026-08-06", "2026-08-30", "2026-10-08", "2026-11-01", "2026-12-08", "2026-12-09", "2026-12-25"]) {
      expect(f).toContain(d);
    }
  });

  it("fiestas patrias: 23, 28 y 29 de julio no cuentan", () => {
    expect(esDiaHabil("2026-07-23")).toBe(false); // jueves
    expect(esDiaHabil("2026-07-28")).toBe(false); // martes
    expect(esDiaHabil("2026-07-29")).toBe(false); // miércoles
    // Falta el miércoles 22/7/2026: 24 (vie), 27 (lun), 30 (jue), 31 (vie).
    expect(sumarDiasHabiles("2026-07-22", 4)).toBe("2026-07-31");
  });

  it("feriados de fin de año y cruce de año", () => {
    // Falta el lunes 7/12/2026: 8 y 9 feriados → 10, 11, 14 … 24, (25 feriado), 28 … 31 (15.º), (1/1 feriado), 4/1.
    expect(sumarDiasHabiles("2026-12-07", 1)).toBe("2026-12-10");
    expect(sumarDiasHabiles("2026-12-07", 15)).toBe("2026-12-31");
    expect(sumarDiasHabiles("2026-12-07", 16)).toBe("2027-01-04");
  });

  it("acepta feriados extra (días no laborables decretados)", () => {
    expect(esDiaHabil("2026-10-28", ["2026-10-28"])).toBe(false);
    expect(sumarDiasHabiles("2026-10-27", 1, ["2026-10-28"])).toBe("2026-10-29");
  });

  it("15 días hábiles desde una falta típica", () => {
    // Martes 27/10/2026: 28, 29, 30, 2/11 (1/11 domingo), 3 … 6, 9 … 13, 16, 17.
    expect(sumarDiasHabiles("2026-10-27", 15)).toBe("2026-11-17");
    expect(sumarDiasHabiles("2026-10-27", 0)).toBe("2026-10-27");
  });

  it("vence al fin del día en hora de Lima", () => {
    expect(finDelDia("2026-11-17").toISOString()).toBe("2026-11-18T04:59:59.999Z");
    expect(venceJustificacion("2026-10-27", 15).toISOString()).toBe("2026-11-18T04:59:59.999Z");
    expect(venceJustificacion("2026-10-27", 15, "UTC").toISOString()).toBe("2026-11-17T23:59:59.999Z");
  });
});
