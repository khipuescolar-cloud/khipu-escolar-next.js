import { describe, expect, it } from "vitest";
import { armarMesAsistencia, estadoDelDia, mesAnterior, mesPedido, mesSiguiente, parseClaveMes, rangoDelMes } from "@/lib/calendario-asistencia";
import { momentoEnZona } from "@/lib/fechas";

describe("calendario mensual de asistencia", () => {
  it("arma semanas de lunes a domingo con días de meses vecinos", () => {
    const m = armarMesAsistencia(2026, 10, [], "2026-10-27");
    expect(m.semanas[0][0].fecha).toBe("2026-09-28");
    expect(m.semanas[0][3]).toMatchObject({ fecha: "2026-10-01", delMes: true, dia: 1 });
    expect(m.semanas.at(-1)!.at(-1)!.fecha).toBe("2026-11-01");
    expect(m.semanas.every((s) => s.length === 7)).toBe(true);
    expect(m.semanas[0][0].delMes).toBe(false);
  });

  it("marca hoy, futuro y fin de semana", () => {
    const dias = armarMesAsistencia(2026, 10, [], "2026-10-27").semanas.flat();
    expect(dias.find((d) => d.fecha === "2026-10-27")).toMatchObject({ esHoy: true, esFuturo: false, esFinDeSemana: false });
    expect(dias.find((d) => d.fecha === "2026-10-28")?.esFuturo).toBe(true);
    expect(dias.find((d) => d.fecha === "2026-10-24")?.esFinDeSemana).toBe(true);
  });

  it("asigna el estado por día y cuenta solo los días del mes", () => {
    const m = armarMesAsistencia(
      2026, 10,
      [
        { fecha: "2026-10-26", estado: "falta", esDia: true },
        { fecha: "2026-10-27", estado: "tarde", esDia: true },
        { fecha: "2026-09-30", estado: "llego", esDia: true },
      ],
      "2026-10-27",
    );
    const dias = m.semanas.flat();
    expect(dias.find((d) => d.fecha === "2026-10-26")?.estado).toBe("falta");
    expect(dias.find((d) => d.fecha === "2026-09-30")?.estado).toBeNull();
    expect(m.conteo).toEqual({ llego: 0, tarde: 1, falta: 1, problema: 0 });
  });

  it("manda el ingreso al colegio; sin él, el curso más grave", () => {
    expect(estadoDelDia([{ estado: "falta", esDia: false }, { estado: "llego", esDia: true }])).toBe("llego");
    expect(estadoDelDia([{ estado: "llego", esDia: false }, { estado: "falta", esDia: false }])).toBe("falta");
    expect(estadoDelDia([{ estado: "tarde", esDia: false }, { estado: "problema", esDia: false }])).toBe("problema");
    expect(estadoDelDia([])).toBeNull();
  });

  it("navega entre meses y cruza el año", () => {
    expect(mesAnterior(2026, 1)).toEqual({ anio: 2025, mes: 12 });
    expect(mesSiguiente(2026, 12)).toEqual({ anio: 2027, mes: 1 });
    expect(rangoDelMes(2026, 2)).toEqual({ desde: "2026-02-01", hasta: "2026-02-28" });
    expect(rangoDelMes(2028, 2).hasta).toBe("2028-02-29");
    expect(rangoDelMes(2026, 12).hasta).toBe("2026-12-31");
  });

  it("acota el mes pedido a un rango razonable", () => {
    expect(parseClaveMes("2026-13")).toBeNull();
    expect(mesPedido(undefined, "2026-10-27")).toEqual({ anio: 2026, mes: 10 });
    expect(mesPedido("2026-09", "2026-10-27")).toEqual({ anio: 2026, mes: 9 });
    expect(mesPedido("2027-01", "2026-10-27")).toEqual({ anio: 2026, mes: 10 });
    expect(mesPedido("2010-01", "2026-10-27")).toEqual({ anio: 2026, mes: 10 });
    expect(mesPedido("basura", "2026-10-27")).toEqual({ anio: 2026, mes: 10 });
  });

  it("usa la fecha de Lima para «hoy» (UTC ya es el día siguiente)", () => {
    const hoy = momentoEnZona(new Date("2026-11-01T03:00:00Z"), "America/Lima").isoFecha; // 22:00 del 31 de octubre
    expect(hoy).toBe("2026-10-31");
    expect(mesPedido(undefined, hoy)).toEqual({ anio: 2026, mes: 10 });
    const m = armarMesAsistencia(2026, 10, [], hoy);
    expect(m.semanas.flat().find((d) => d.esHoy)?.fecha).toBe("2026-10-31");
  });
});
