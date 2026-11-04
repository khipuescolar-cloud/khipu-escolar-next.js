import { afterEach, describe, expect, it, vi } from "vitest";
import { accesoModulosDeCodigo, modulosDeCodigo, resolverModulos } from "@/lib/modulos";
import {
  licenciasFamiliaresNudito, NUDITO_LICENCIAS_FAMILIARES, NUDITO_PLUS_DISPONIBLE, NUDITO_TUTOR_DISPONIBLE, nuditoPlusDisponible,
} from "@/lib/planes";

// Nudito es el tutor de Khipu Pro (specs/44): el módulo `nudito_plus` va fijo con el plan Pro; las licencias familiares
// con Yape (specs/28) quedan inertes.
describe("interruptores de Nudito", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("el tutor está disponible y el nombre antiguo apunta al nuevo", () => {
    expect(NUDITO_TUTOR_DISPONIBLE).toBe(true);
    expect(NUDITO_PLUS_DISPONIBLE).toBe(true);
    expect(nuditoPlusDisponible()).toBe(true);
  });

  it("Khipu Pro trae el módulo; Base nunca, aunque la BD o los ajustes del colegio lo pidan", () => {
    expect(modulosDeCodigo("pro").has("nudito_plus")).toBe(true);
    expect(resolverModulos("pro", null).activos.has("nudito_plus")).toBe(true);
    expect(accesoModulosDeCodigo("pro").modulos.has("nudito_plus")).toBe(true);
    expect(resolverModulos("base", null).activos.has("nudito_plus")).toBe(false);
    const r = resolverModulos("base", ["asistencia", "nudito_plus"], [{ modulo: "nudito_plus", habilitado: true }]);
    expect(r.activos.has("nudito_plus")).toBe(false);
    // Un colegio Pro no puede quitárselo desde los ajustes (es fijo por plan; lo apaga su configuración de Nudito).
    expect(resolverModulos("pro", null, [{ modulo: "nudito_plus", habilitado: false }]).activos.has("nudito_plus")).toBe(true);
  });

  it("las licencias familiares están apagadas; la variable de tests solo vale con NODE_ENV=test", () => {
    vi.stubEnv("KHIPU_TEST_NUDITO_LICENCIAS", "");
    expect(NUDITO_LICENCIAS_FAMILIARES).toBe(false);
    expect(licenciasFamiliaresNudito()).toBe(false);
    vi.stubEnv("KHIPU_TEST_NUDITO_LICENCIAS", "1");
    expect(licenciasFamiliaresNudito()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(licenciasFamiliaresNudito()).toBe(false);
  });
});
