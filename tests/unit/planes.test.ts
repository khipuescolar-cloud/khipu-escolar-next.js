import { describe, expect, it } from "vitest";
import { FEATURES, planIncluye } from "@/lib/planes";

describe("planIncluye", () => {
  it("el plan Básico solo incluye funciones básicas", () => {
    expect(planIncluye("basico", "asistencia")).toBe(true);
    expect(planIncluye("basico", "mensajes")).toBe(true);
    expect(planIncluye("basico", "notas")).toBe(false);
    expect(planIncluye("basico", "nudito")).toBe(false);
  });

  it("Fase 2 incluye notas, libreta, tareas y agenda pero no Nudito", () => {
    for (const f of ["notas", "libreta", "tareas", "agenda"] as const) expect(planIncluye("fase2", f)).toBe(true);
    expect(planIncluye("fase2", "nudito")).toBe(false);
  });

  it("Pro Max incluye todo", () => {
    for (const f of Object.keys(FEATURES) as (keyof typeof FEATURES)[]) expect(planIncluye("promax", f)).toBe(true);
  });
});
