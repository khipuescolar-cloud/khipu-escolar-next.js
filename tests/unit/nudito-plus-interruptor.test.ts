import { afterEach, describe, expect, it, vi } from "vitest";
import { accesoModulosDeCodigo, modulosDeCodigo, resolverModulos } from "@/lib/modulos";
import { NUDITO_PLUS_DISPONIBLE, nuditoPlusDisponible } from "@/lib/planes";

// Interruptor de Nudito+ (specs/29): apagado, ningún colegio lo tiene, ni siquiera Khipu Pro.
describe("Nudito+ apagado (NUDITO_PLUS_DISPONIBLE)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("la constante está apagada y sin la variable de tests no está disponible", () => {
    vi.stubEnv("KHIPU_TEST_NUDITO_PLUS", "");
    expect(NUDITO_PLUS_DISPONIBLE).toBe(false);
    expect(nuditoPlusDisponible()).toBe(false);
  });

  it("un colegio Khipu Pro NO tiene nudito_plus, aunque la BD o los ajustes del colegio lo pidan", () => {
    vi.stubEnv("KHIPU_TEST_NUDITO_PLUS", "");
    expect(modulosDeCodigo("pro").has("nudito_plus")).toBe(false);
    expect(resolverModulos("pro", null).activos.has("nudito_plus")).toBe(false);
    const r = resolverModulos("pro", ["asistencia", "notas", "nudito_plus"], [{ modulo: "nudito_plus", habilitado: true }]);
    expect(r.activos.has("nudito_plus")).toBe(false);
    expect(r.delPlan.has("nudito_plus")).toBe(false);
    expect(accesoModulosDeCodigo("pro").modulos.has("nudito_plus")).toBe(false);
  });

  it("la variable solo vale en tests (NODE_ENV=test), nunca en producción ni en desarrollo", () => {
    vi.stubEnv("KHIPU_TEST_NUDITO_PLUS", "1");
    expect(nuditoPlusDisponible()).toBe(true);
    expect(resolverModulos("pro", null).activos.has("nudito_plus")).toBe(true);
    expect(resolverModulos("base", null).activos.has("nudito_plus")).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    expect(nuditoPlusDisponible()).toBe(false);
    expect(resolverModulos("pro", null).activos.has("nudito_plus")).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(nuditoPlusDisponible()).toBe(false);
  });
});
