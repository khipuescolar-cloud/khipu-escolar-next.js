import { describe, expect, it } from "vitest";
import { evaluacionEliminable, motivoSuficiente } from "@/lib/integridad-notas";

const nota = (x: Partial<{ marca: string | null; vencidaAt: Date | null; recuperacion: string | null }> = {}) => ({ marca: null, vencidaAt: null, recuperacion: null, ...x });

describe("evaluacionEliminable", () => {
  const base = { estado: "programada", publicadaAt: null, historialBloqueante: false, eventosDelGrupo: false, notas: [] };
  it("nunca publicada y sin NSP, consecuencia ni recuperación: se elimina aunque tenga notas de borrador", () => {
    expect(evaluacionEliminable(base)).toBe(true);
    expect(evaluacionEliminable({ ...base, notas: [nota()] })).toBe(true);
  });
  it("publicada alguna vez o con NSP, consecuencia o recuperación: no", () => {
    expect(evaluacionEliminable({ ...base, estado: "publicada" })).toBe(false);
    expect(evaluacionEliminable({ ...base, publicadaAt: new Date() })).toBe(false);
    expect(evaluacionEliminable({ ...base, historialBloqueante: true })).toBe(false);
    expect(evaluacionEliminable({ ...base, eventosDelGrupo: true })).toBe(false);
    expect(evaluacionEliminable({ ...base, notas: [nota({ marca: "nsp" })] })).toBe(false);
    expect(evaluacionEliminable({ ...base, notas: [nota({ vencidaAt: new Date() })] })).toBe(false);
    expect(evaluacionEliminable({ ...base, notas: [nota({ recuperacion: "denegada" })] })).toBe(false);
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
