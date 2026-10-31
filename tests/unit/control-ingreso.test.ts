import { describe, expect, it } from "vitest";
import { faseControlIngreso, horasControlValidas, saludoFamilia } from "@/lib/control-ingreso";

describe("control de ingreso: fases y saludo", () => {
  it("antes de la tardanza nada; desde la tardanza «aún no llega»; desde la hora límite, falta", () => {
    expect(faseControlIngreso("07:59", "08:00", "09:00")).toBe("antes");
    expect(faseControlIngreso("08:00", "08:00", "09:00")).toBe("no_llega");
    expect(faseControlIngreso("08:59", "08:00", "09:00")).toBe("no_llega");
    expect(faseControlIngreso("09:00", "08:00", "09:00")).toBe("falta");
    expect(faseControlIngreso("13:00", "08:00", "09:00")).toBe("falta");
  });

  it("la hora de falta debe ser posterior a la de tardanza", () => {
    expect(horasControlValidas("08:00", "09:00")).toBe(true);
    expect(horasControlValidas("08:00", "08:00")).toBe(false);
    expect(horasControlValidas("09:00", "08:30")).toBe(false);
  });

  it("saludo según la hora, con el primer nombre", () => {
    expect(saludoFamilia("Rosa María", "08:05")).toBe("Buenos días, Rosa.");
    expect(saludoFamilia("Rosa", "14:10")).toBe("Buenas tardes, Rosa.");
    expect(saludoFamilia("Rosa", "19:30")).toBe("Buenas noches, Rosa.");
    expect(saludoFamilia(null, "08:05")).toBe("Buenos días.");
  });
});
