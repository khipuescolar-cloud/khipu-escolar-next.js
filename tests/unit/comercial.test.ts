import { describe, expect, it } from "vitest";
import { estadoRenovacion, finDePeriodo, ingresoMensualRecurrente, montoMensual, textoRenovacion } from "@/lib/comercial";

describe("ingreso mensual recurrente", () => {
  it("normaliza los anuales a /12 y suma solo las suscripciones activas", () => {
    const total = ingresoMensualRecurrente([
      { estado: "activa", ciclo: "mensual", monto: 300 },
      { estado: "activa", ciclo: "anual", monto: 3600 },
      { estado: "prueba", ciclo: "mensual", monto: 999 },
      { estado: "suspendida", ciclo: "anual", monto: 1200 },
      { estado: "cancelada", ciclo: "mensual", monto: 500 },
    ]);
    expect(total).toBe(600);
  });

  it("redondea a céntimos", () => {
    expect(ingresoMensualRecurrente([{ estado: "activa", ciclo: "anual", monto: 1000 }])).toBe(83.33);
    expect(montoMensual(120, "anual")).toBe(10);
  });

  it("sin suscripciones es cero", () => {
    expect(ingresoMensualRecurrente([])).toBe(0);
  });
});

describe("estado de la renovación (fecha de Lima)", () => {
  const hoy = "2026-10-28";
  it("vence hoy, en 30 días y en 31 días", () => {
    expect(estadoRenovacion("2026-10-28", hoy)).toEqual({ tipo: "por_vencer", dias: 0 });
    expect(estadoRenovacion("2026-11-27", hoy)).toEqual({ tipo: "por_vencer", dias: 30 });
    expect(estadoRenovacion("2026-11-28", hoy)).toEqual({ tipo: "vigente", dias: 31 });
  });
  it("ayer ya está vencida", () => {
    expect(estadoRenovacion("2026-10-27", hoy)).toEqual({ tipo: "vencida", dias: -1 });
  });
  it("las etiquetas llevan palabra", () => {
    expect(textoRenovacion(estadoRenovacion("2026-11-02", hoy))).toBe("Vence en 5 días");
    expect(textoRenovacion(estadoRenovacion("2026-11-29", hoy))).toBe("Vence en 32 días");
    expect(textoRenovacion(estadoRenovacion("2026-10-28", hoy))).toBe("Vence hoy");
    expect(textoRenovacion(estadoRenovacion("2026-10-20", hoy))).toBe("Vencida hace 8 días");
  });
});

describe("fin de periodo", () => {
  it("un mes o un año menos un día, con meses cortos", () => {
    expect(finDePeriodo("2026-10-28", "mensual")).toBe("2026-11-27");
    expect(finDePeriodo("2026-01-31", "mensual")).toBe("2026-02-27");
    expect(finDePeriodo("2026-03-01", "anual")).toBe("2027-02-28");
  });
});
