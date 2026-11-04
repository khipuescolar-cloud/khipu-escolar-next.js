import { describe, expect, it } from "vitest";
import { evaluacionEliminable, motivoSuficiente } from "@/lib/integridad-notas";

const nota = (x: Partial<{ marca: string | null; vencidaAt: Date | null; recuperacion: string | null }> = {}) => ({ marca: null, vencidaAt: null, recuperacion: null, ...x });

describe("evaluacionEliminable", () => {
  it("solo el borrador sin historial, NSP, consecuencia ni recuperación", () => {
    expect(evaluacionEliminable({ estado: "programada", tieneHistorial: false, notas: [] })).toBe(true);
    expect(evaluacionEliminable({ estado: "programada", tieneHistorial: false, notas: [nota()] })).toBe(true);
    expect(evaluacionEliminable({ estado: "publicada", tieneHistorial: false, notas: [] })).toBe(false);
    expect(evaluacionEliminable({ estado: "programada", tieneHistorial: true, notas: [] })).toBe(false);
    expect(evaluacionEliminable({ estado: "programada", tieneHistorial: false, notas: [nota({ marca: "nsp" })] })).toBe(false);
    expect(evaluacionEliminable({ estado: "programada", tieneHistorial: false, notas: [nota({ vencidaAt: new Date() })] })).toBe(false);
    expect(evaluacionEliminable({ estado: "programada", tieneHistorial: false, notas: [nota({ recuperacion: "denegada" })] })).toBe(false);
  });
});

describe("motivoSuficiente", () => {
  it("exige 5 caracteres que no sean espacios", () => {
    expect(motivoSuficiente(undefined)).toBe(false);
    expect(motivoSuficiente("     ")).toBe(false);
    expect(motivoSuficiente("a b c d")).toBe(false);
    expect(motivoSuficiente("abcde")).toBe(true);
    expect(motivoSuficiente(" Error de tipeo ")).toBe(true);
  });
});
