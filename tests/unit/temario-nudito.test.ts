import { describe, expect, it } from "vitest";
import { aceptacionesCompletas, areaPermitida } from "@/lib/server/plan-anual/temario";
import { clavesDeVersion } from "@/lib/nudito/plan-publicado-reglas";
describe("aceptación del temario", () => {
  it("un profesor activo basta y dos deben aceptar", () => {
    expect(aceptacionesCompletas(["a"],["a"])).toBe(true);
    expect(aceptacionesCompletas(["a","b"],["a"])).toBe(false);
    expect(aceptacionesCompletas(["a","b"],["a","b"])).toBe(true);
  });
  it("solo admite las tres áreas de Nudito", () => {
    expect(["matematica","comunicacion","ciencia-tecnologia"].every(areaPermitida)).toBe(true);
    expect(areaPermitida("personal-social")).toBe(false);
  });
  it("la foto habilitada conserva el orden independiente de la edición", () => {
    expect(clavesDeVersion([{temaClave:"b",orden:1},{temaClave:"a",orden:0}])).toEqual(["a","b"]);
  });
});
