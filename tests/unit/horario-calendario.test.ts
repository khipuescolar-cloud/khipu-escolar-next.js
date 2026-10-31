import { describe, expect, it } from "vitest";
import { carriles, coloresPorCurso, eventoDeSemana, fechasDeLaSemana, horasVisibles, jornadaDe } from "@/lib/horario-calendario";

const b = (id: string, horaInicio: string, horaFin: string) => ({ id, horaInicio, horaFin });

describe("vista de calendario del horario", () => {
  it("va siempre de 7:00 a 19:00 y se amplía a la hora en punto si algo cae fuera", () => {
    expect(horasVisibles([b("a", "08:45", "09:30"), b("b", "12:15", "13:00")])).toEqual({ inicio: 7 * 60, fin: 19 * 60 });
    expect(horasVisibles([])).toEqual({ inicio: 7 * 60, fin: 19 * 60 });
    expect(horasVisibles([b("a", "06:30", "07:15"), b("r", "18:30", "19:30")])).toEqual({ inicio: 6 * 60, fin: 20 * 60 });
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

describe("reuniones y eventos en la semana del horario", () => {
  const base = { id: "e", descripcion: null, ambito: "3.° B", titulo: "Reunión de padres" };
  it("ubica una reunión en su día y hora del colegio", () => {
    const e = eventoDeSemana({ ...base, tipo: "reunion", inicio: new Date("2026-11-04T23:00:00Z"), fin: new Date("2026-11-05T00:00:00Z"), lugar: "Aula 3.° B" }, "America/Lima");
    expect(e).toMatchObject({ dia: 3, horaInicio: "18:00", horaFin: "19:00", todoElDia: false, lugar: "Aula 3.° B" });
  });
  it("sin fin dura una hora; los feriados y eventos a las 00:00 van en «Todo el día»", () => {
    expect(eventoDeSemana({ ...base, tipo: "examen", inicio: new Date("2026-11-03T14:00:00Z"), fin: null }, "America/Lima")).toMatchObject({ dia: 2, horaInicio: "09:00", horaFin: "10:00" });
    expect(eventoDeSemana({ ...base, tipo: "evento", inicio: new Date("2026-11-03T05:00:00Z"), fin: null }, "America/Lima")?.todoElDia).toBe(true);
    expect(eventoDeSemana({ ...base, tipo: "feriado", inicio: new Date("2026-11-03T15:00:00Z"), fin: null }, "America/Lima")?.todoElDia).toBe(true);
  });
  it("no muestra lo que cae el fin de semana", () => {
    expect(eventoDeSemana({ ...base, tipo: "actividad", inicio: new Date("2026-11-07T15:00:00Z"), fin: null }, "America/Lima")).toBeNull();
  });
});

describe("jornada del profesor", () => {
  it("toma la entrada más temprana, la salida más tarde y los recreos sin repetir", () => {
    const j = jornadaDe([
      { horaEntrada: "08:00", horaSalida: "13:00", periodos: [{ horaInicio: "10:15", horaFin: "10:45", tipo: "recreo" }, { horaInicio: "08:00", horaFin: "08:45", tipo: "clase" }] },
      { horaEntrada: "07:45", horaSalida: "13:35", periodos: [{ horaInicio: "10:15", horaFin: "10:45", tipo: "recreo" }] },
    ]);
    expect(j).toEqual({ entrada: "07:45", salida: "13:35", recreos: [{ horaInicio: "10:15", horaFin: "10:45" }] });
    expect(jornadaDe([])).toBeNull();
  });
});
