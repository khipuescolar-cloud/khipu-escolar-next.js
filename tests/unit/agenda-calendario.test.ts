import { describe, expect, it } from "vitest";
import {
  diasNoLectivos, fechasEntre, itemCalendarioDe, leerEstadoAgenda, porFecha, proyectarClases, rangoDeVista, resumenCelda, urlAgenda,
} from "@/lib/agenda-calendario";

const lunes = { id: "b1", dia: 1, horaInicio: "08:00", horaFin: "08:45" };
const martes = { id: "b2", dia: 2, horaInicio: "10:15", horaFin: "11:00" };

describe("proyección de clases por fecha", () => {
  it("ubica cada bloque en las fechas de su día de la semana, en la hora del colegio", () => {
    const fechas = fechasEntre("2026-11-02", "2026-11-08"); // lunes a domingo
    const r = proyectarClases([lunes, martes], fechas, new Set(), "America/Lima");
    expect(r.map((c) => c.id)).toEqual(["b1:2026-11-02", "b2:2026-11-03"]);
    expect(r[0].inicio.toISOString()).toBe("2026-11-02T13:00:00.000Z");
    expect(r[0].fin.toISOString()).toBe("2026-11-02T13:45:00.000Z");
  });

  it("respeta la zona horaria del colegio", () => {
    const r = proyectarClases([lunes], ["2026-11-02"], new Set(), "America/Mexico_City"); // UTC−6
    expect(r[0].inicio.toISOString()).toBe("2026-11-02T14:00:00.000Z");
  });

  it("no proyecta clases en feriados nacionales ni en los días no lectivos extra", () => {
    const fechas = fechasEntre("2026-12-07", "2026-12-11"); // 8 y 9 de diciembre son feriados nacionales
    const noLectivos = diasNoLectivos(fechas, ["2026-12-11"]);
    expect([...noLectivos].sort()).toEqual(["2026-12-08", "2026-12-09", "2026-12-11"]);
    const todos = [1, 2, 3, 4, 5].map((dia) => ({ id: `d${dia}`, dia, horaInicio: "08:00", horaFin: "08:45" }));
    expect(proyectarClases(todos, fechas, noLectivos, "America/Lima").map((c) => c.fecha)).toEqual(["2026-12-07", "2026-12-10"]);
  });

  it("cruza el borde de mes sin saltarse días", () => {
    const fechas = fechasEntre("2026-11-30", "2026-12-02");
    expect(fechas).toEqual(["2026-11-30", "2026-12-01", "2026-12-02"]);
    expect(proyectarClases([lunes, martes], fechas, new Set(), "America/Lima").map((c) => c.id)).toEqual(["b1:2026-11-30", "b2:2026-12-01"]);
  });
});

describe("vistas y estado en la URL", () => {
  it("cada vista calcula sus días y la navegación", () => {
    expect(rangoDeVista("dia", "2026-11-04")).toEqual({ dias: ["2026-11-04"], anterior: "2026-11-03", siguiente: "2026-11-05" });
    const semana = rangoDeVista("semana", "2026-11-04");
    expect(semana.dias[0]).toBe("2026-11-02");
    expect(semana.dias).toHaveLength(7);
    expect([semana.anterior, semana.siguiente]).toEqual(["2026-10-26", "2026-11-09"]);
    const mes = rangoDeVista("mes", "2026-12-15");
    expect(mes.dias.length % 7).toBe(0);
    expect(mes.dias.length).toBeLessThanOrEqual(42);
    expect([mes.anterior, mes.siguiente]).toEqual(["2026-11-01", "2027-01-01"]);
    expect(rangoDeVista("lista", "2026-11-04").dias).toHaveLength(30);
  });

  it("lee la URL con valores por defecto seguros", () => {
    expect(leerEstadoAgenda({}, "2026-11-04")).toEqual({ vista: "semana", fecha: "2026-11-04", filtro: "todo", salon: undefined });
    expect(leerEstadoAgenda({ vista: "mes", fecha: "2026-02-31", filtro: "nada", salon: "x" }, "2026-11-04")).toEqual({ vista: "mes", fecha: "2026-11-04", filtro: "todo", salon: undefined });
    expect(urlAgenda({ vista: "dia", fecha: "2026-11-04", filtro: "academico" })).toBe("/agenda?vista=dia&fecha=2026-11-04&filtro=academico");
  });
});

describe("ítems del calendario", () => {
  it("convierte reuniones, evaluaciones y entregas a fecha y hora del colegio", () => {
    const reunion = itemCalendarioDe(
      { id: "r", tipo: "reunion", categoria: "mi-reunion", titulo: "Padres", descripcion: null, ambito: "3.° B", inicio: new Date("2026-11-04T23:00:00Z"), fin: null },
      "America/Lima",
    );
    expect(reunion).toMatchObject({ tipo: "reunion", fecha: "2026-11-04", horaInicio: "18:00", horaFin: "19:00", todoElDia: false });
    const evaluacion = itemCalendarioDe(
      { id: "e", tipo: "examen", categoria: "academico", titulo: "Evaluación: X", descripcion: null, ambito: "", inicio: new Date("2026-11-04T05:00:00Z"), fin: null, sinHora: true },
      "America/Lima",
    );
    expect(evaluacion).toMatchObject({ tipo: "evaluacion", todoElDia: true });
    const evento = itemCalendarioDe({ id: "v", tipo: "actividad", titulo: "Feria", descripcion: null, ambito: "", inicio: new Date("2026-11-04T15:00:00Z"), fin: null }, "America/Lima");
    expect(evento).toMatchObject({ tipo: "evento", subtipo: "actividad", horaInicio: "10:00" });
  });

  it("agrupa por día con lo de todo el día primero y resume las celdas del mes", () => {
    const it = (id: string, fecha: string, horaInicio: string, todoElDia = false) => ({ id, fecha, horaInicio, todoElDia });
    const m = porFecha([it("b", "2026-11-04", "10:00"), it("a", "2026-11-04", "08:00"), it("t", "2026-11-04", "00:00", true), it("c", "2026-11-05", "09:00")]);
    expect(m.get("2026-11-04")!.map((x) => x.id)).toEqual(["t", "a", "b"]);
    expect(resumenCelda([1, 2, 3, 4, 5])).toEqual({ visibles: [1, 2, 3], mas: 2 });
    expect(resumenCelda([1])).toEqual({ visibles: [1], mas: 0 });
  });
});
