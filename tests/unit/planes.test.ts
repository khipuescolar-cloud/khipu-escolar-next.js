import { describe, expect, it } from "vitest";
import { FEATURES, NOMBRE_PLAN, ORDEN_PLANES, planIncluye } from "@/lib/planes";

describe("planIncluye", () => {
  it("Khipu Base incluye asistencia, avisos, portería, justificaciones, mensajes, comunicados, gestión y soporte", () => {
    for (const f of ["asistencia", "avisos", "porteria", "justificaciones", "mensajes", "comunicados", "gestion", "soporte"] as const) {
      expect(planIncluye("base", f), f).toBe(true);
    }
    for (const f of ["notas", "libreta", "tareas", "agenda"] as const) expect(planIncluye("base", f), f).toBe(false);
  });

  it("Khipu Pro incluye todo", () => {
    for (const f of Object.keys(FEATURES) as (keyof typeof FEATURES)[]) expect(planIncluye("pro", f)).toBe(true);
  });

  it("solo hay dos planes, con sus nombres comerciales", () => {
    expect(Object.keys(ORDEN_PLANES)).toEqual(["base", "pro"]);
    expect(NOMBRE_PLAN).toEqual({ base: "Khipu Base", pro: "Khipu Pro" });
    expect(Object.keys(FEATURES)).not.toContain("nudito");
  });
});
