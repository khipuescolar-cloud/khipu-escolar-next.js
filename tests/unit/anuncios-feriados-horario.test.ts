import { describe, expect, it } from "vitest";
import { anuncioAplica, estadoAnuncio, instanteDeLima, localDeLima } from "@/lib/anuncios-plataforma";
import { esDiaHabil, feriadosNacionalesConNombre, sumarDiasHabiles } from "@/lib/dias-habiles";
import { esHorarioEscolar, horarioDesdeConfig } from "@/lib/nudito/estado";
import { ultimoDiaJustificacion } from "@/lib/plazo-justificacion";
import { motivoNoDesactivar } from "@/lib/server/plataforma-equipo";

describe("anuncioAplica", () => {
  it("filtra por audiencia", () => {
    const a = { planes: [] as never[] };
    expect(anuncioAplica({ ...a, audiencia: "direccion" }, { rol: "direccion", plan: "base" })).toBe(true);
    expect(anuncioAplica({ ...a, audiencia: "direccion" }, { rol: "profesor", plan: "base" })).toBe(false);
    expect(anuncioAplica({ ...a, audiencia: "personal" }, { rol: "porteria", plan: "base" })).toBe(true);
    expect(anuncioAplica({ ...a, audiencia: "personal" }, { rol: "apoderado", plan: "base" })).toBe(false);
    expect(anuncioAplica({ ...a, audiencia: "todos" }, { rol: "apoderado", plan: "base" })).toBe(true);
  });
  it("filtra por plan (vacío = todos)", () => {
    expect(anuncioAplica({ audiencia: "todos", planes: ["pro"] }, { rol: "direccion", plan: "base" })).toBe(false);
    expect(anuncioAplica({ audiencia: "todos", planes: ["pro", "base"] }, { rol: "direccion", plan: "base" })).toBe(true);
  });
});

describe("vigencia", () => {
  const a = { desde: instanteDeLima("2026-11-02T08:00"), hasta: instanteDeLima("2026-11-03T08:00") };
  it("programado, vigente y terminado", () => {
    expect(estadoAnuncio(a, new Date("2026-11-02T12:00:00Z"))).toBe("programado"); // 07:00 Lima
    expect(estadoAnuncio(a, new Date("2026-11-02T18:00:00Z"))).toBe("vigente");
    expect(estadoAnuncio(a, new Date("2026-11-03T13:00:00Z"))).toBe("terminado");
  });
  it("hora de Lima ida y vuelta", () => {
    expect(localDeLima(instanteDeLima("2026-11-02T08:30"))).toBe("2026-11-02T08:30");
  });
});

describe("feriados", () => {
  it("los nacionales traen su nombre", () => {
    const f = feriadosNacionalesConNombre(2026);
    expect(f).toHaveLength(16);
    expect(f.find((x) => x.fecha === "2026-07-28")?.nombre).toBe("Fiestas Patrias");
    expect(f.some((x) => x.nombre === "Jueves Santo")).toBe(true);
  });
  it("un feriado extra solo afecta los días hábiles, no el plazo de justificación (días calendario)", () => {
    expect(esDiaHabil("2026-11-04", ["2026-11-04"])).toBe(false);
    expect(sumarDiasHabiles("2026-11-02", 1, ["2026-11-03"])).toBe("2026-11-04");
    expect(ultimoDiaJustificacion("2026-11-02", 5)).toBe("2026-11-07");
  });
});

describe("horario de Nudito", () => {
  it("lee el valor guardado o vuelve al horario por defecto", () => {
    expect(horarioDesdeConfig({ inicio: "08:00", fin: "15:00" })).toEqual({ inicio: 8, fin: 15 });
    expect(horarioDesdeConfig({ inicio: "15:00", fin: "08:00" })).toEqual({ inicio: 7, fin: 17 });
    expect(horarioDesdeConfig(null)).toEqual({ inicio: 7, fin: 17 });
  });
  it("el horario editado cambia cuándo duerme", () => {
    const once = new Date("2026-11-02T16:00:00Z"); // 11:00 Lima
    expect(esHorarioEscolar(once)).toBe(true);
    expect(esHorarioEscolar(once, horarioDesdeConfig({ inicio: "13:00", fin: "18:00" }))).toBe(false);
  });
});

describe("equipo: quién puede desactivarse", () => {
  it("no a uno mismo ni al último activo", () => {
    expect(motivoNoDesactivar({ esYo: true, otrosActivos: 3 })).toMatch(/ti mismo/);
    expect(motivoNoDesactivar({ esYo: false, otrosActivos: 0 })).toMatch(/al menos un super administrador/);
    expect(motivoNoDesactivar({ esYo: false, otrosActivos: 1 })).toBeNull();
  });
});
