import { describe, expect, it } from "vitest";
import { MODULO_ESENCIAL, modulosDeCodigo, resolverModulos, rolPuedeVer, rolSoporta } from "@/lib/modulos";

describe("resolverModulos", () => {
  it("usa los módulos de la BD y, si el plan no tiene filas, el respaldo en código", () => {
    expect([...resolverModulos("basico", ["asistencia", "gestion"]).activos].sort()).toEqual(["asistencia", "gestion"]);
    expect(resolverModulos("fase2", []).activos).toEqual(modulosDeCodigo("fase2"));
    expect(resolverModulos("fase2", null).activos.has("notas")).toBe(true);
  });

  it("aplica extras y quitados del colegio, ignora claves desconocidas y siempre deja gestion", () => {
    const r = resolverModulos("basico", ["asistencia", "comunicados"], [
      { modulo: "notas", habilitado: true },
      { modulo: "comunicados", habilitado: false },
      { modulo: "gestion", habilitado: false },
      { modulo: "inventado", habilitado: true },
    ]);
    expect(r.activos.has("notas")).toBe(true);
    expect(r.extras.has("notas")).toBe(true);
    expect(r.activos.has("comunicados")).toBe(false);
    expect(r.quitados.has("comunicados")).toBe(true);
    expect(r.activos.has(MODULO_ESENCIAL)).toBe(true);
    expect(r.activos.size).toBe(3);
  });
});

describe("roles por módulo", () => {
  it("el código fija qué roles soporta cada módulo", () => {
    expect(rolSoporta("alumno", "mensajes")).toBe(false);
    expect(rolSoporta("alumno", "nudito")).toBe(false);
    expect(rolSoporta("apoderado", "avisos")).toBe(true); // preferencias de avisos
    expect(rolSoporta("porteria", "porteria")).toBe(true);
  });

  it("un rol desactivado deja de ver el módulo, salvo gestion", () => {
    expect(rolPuedeVer("profesor", "agenda", new Set(["agenda"]))).toBe(false);
    expect(rolPuedeVer("profesor", "agenda")).toBe(true);
    expect(rolPuedeVer("direccion", "gestion", new Set(["gestion"]))).toBe(true);
  });
});
