import { describe, expect, it } from "vitest";
import { cuadriculaMes, diasDeSemana, fechaLima, grupoEntrega, lunesDeSemana, sumarDias } from "@/lib/fechas";

describe("fechas en America/Lima", () => {
  it("usa la fecha de Lima, no la UTC", () => {
    expect(fechaLima(new Date("2026-10-27T03:30:00Z"))).toBe("2026-10-26"); // 22:30 en Lima
    expect(fechaLima(new Date("2026-10-27T05:00:00Z"))).toBe("2026-10-27");
  });

  it("agrupa las entregas para las familias", () => {
    const ahora = new Date("2026-10-26T15:00:00-05:00");
    const en = (iso: string) => new Date(`${iso}T08:00:00-05:00`);
    expect(grupoEntrega(en("2026-10-25"), ahora)).toBe("vencida");
    expect(grupoEntrega(en("2026-10-26"), ahora)).toBe("manana");
    expect(grupoEntrega(en("2026-10-27"), ahora)).toBe("manana");
    expect(grupoEntrega(en("2026-10-28"), ahora)).toBe("semana");
    expect(grupoEntrega(en("2026-11-02"), ahora)).toBe("semana");
    expect(grupoEntrega(en("2026-11-03"), ahora)).toBe("despues");
  });

  it("arma semanas de lunes a domingo", () => {
    expect(lunesDeSemana("2026-10-26")).toBe("2026-10-26"); // lunes
    expect(lunesDeSemana("2026-11-01")).toBe("2026-10-26"); // domingo
    expect(diasDeSemana("2026-10-28")).toHaveLength(7);
    expect(sumarDias("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("cuadrícula del mes cubre todos los días", () => {
    const semanas = cuadriculaMes(2026, 10);
    expect(semanas.every((s) => s.length === 7)).toBe(true);
    expect(semanas.flat()).toContain("2026-10-01");
    expect(semanas.flat()).toContain("2026-10-31");
    expect(semanas[0][0]).toBe("2026-09-28");
  });
});
