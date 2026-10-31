import { describe, expect, it } from "vitest";
import { carriles, coloresPorCurso, fechasDeLaSemana, horasVisibles } from "@/lib/horario-calendario";

const b = (id: string, horaInicio: string, horaFin: string) => ({ id, horaInicio, horaFin });

describe("vista de calendario del horario", () => {
  it("muestra de la hora en punto anterior a la primera clase a la posterior a la última", () => {
    expect(horasVisibles([b("a", "08:45", "09:30"), b("b", "12:15", "13:00")])).toEqual({ inicio: 8 * 60, fin: 13 * 60 });
    expect(horasVisibles([b("a", "07:50", "08:35"), b("b", "12:50", "13:35")])).toEqual({ inicio: 7 * 60, fin: 14 * 60 });
    expect(horasVisibles([])).toEqual({ inicio: 480, fin: 780 });
  });

  it("los bloques que no se cruzan ocupan todo el ancho; los que se cruzan se lo reparten", () => {
    const r = carriles([b("a", "08:00", "08:45"), b("b", "08:45", "09:30"), b("c", "09:00", "09:45"), b("d", "10:00", "10:45")]);
    expect(r.get("a")).toEqual({ carril: 0, carriles: 1 });
    expect(r.get("b")).toEqual({ carril: 0, carriles: 2 });
    expect(r.get("c")).toEqual({ carril: 1, carriles: 2 });
    expect(r.get("d")).toEqual({ carril: 0, carriles: 1 });
  });

  it("reutiliza un carril libre dentro del mismo grupo de cruces", () => {
    const r = carriles([b("largo", "08:00", "10:00"), b("x", "08:00", "08:45"), b("y", "09:00", "09:45")]);
    expect(r.get("largo")).toEqual({ carril: 0, carriles: 2 });
    expect(r.get("x")).toEqual({ carril: 1, carriles: 2 });
    expect(r.get("y")).toEqual({ carril: 1, carriles: 2 });
  });

  it("da el mismo color al mismo curso y ninguno a los bloques sin curso", () => {
    const c = coloresPorCurso([
      { titulo: "Matemática", cursoId: "1" }, { titulo: "Arte y Cultura", cursoId: "2" }, { titulo: "Matemática", cursoId: "3" }, { titulo: "Tutoría", cursoId: null },
    ]);
    expect(c.get("Arte y Cultura")).toBe("turquesa");
    expect(c.get("Matemática")).toBe("indigo-cielo");
    expect(c.has("Tutoría")).toBe(false);
  });

  it("muestra la semana actual de lunes a viernes, o la siguiente si es fin de semana", () => {
    expect(fechasDeLaSemana("2026-10-28")).toEqual({ 1: "2026-10-26", 2: "2026-10-27", 3: "2026-10-28", 4: "2026-10-29", 5: "2026-10-30" });
    expect(fechasDeLaSemana("2026-10-31")[1]).toBe("2026-11-02");
    expect(fechasDeLaSemana("2026-11-01")[5]).toBe("2026-11-06");
  });
});
