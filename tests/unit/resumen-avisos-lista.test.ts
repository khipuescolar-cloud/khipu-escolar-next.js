import { describe, expect, it } from "vitest";
import { resumenAvisosLista, textoResumenAvisos, type AlumnoResumen } from "@/lib/resumen-avisos-lista";

const alumno = (id: string, extra: Partial<AlumnoResumen> = {}): AlumnoResumen => ({ id, registro: null, familiasConAviso: 1, llegadaAvisada: false, ...extra });

describe("resumen previo de avisos al pasar lista", () => {
  it("cuenta familias de presentes, tardanzas, faltas y problemas", () => {
    const alumnos = [alumno("a"), alumno("b", { familiasConAviso: 2 }), alumno("c"), alumno("d"), alumno("e", { familiasConAviso: 0 })];
    const r = resumenAvisosLista(alumnos, { a: "llego", b: "llego", c: "tarde", d: "falta", e: "llego" });
    expect(r).toEqual({ familias: 5, porEstado: { llego: 3, tarde: 1, falta: 1, problema: 0 }, llegadasYaAvisadas: 0 });
    expect(textoResumenAvisos(r)).toBe("Se avisará a 5 familias: 3 llegadas, 1 tardanza, 1 falta.");
  });

  it("no repite la llegada ya avisada hoy ni avisa lo que no cambió", () => {
    const alumnos = [
      alumno("a", { llegadaAvisada: true }),
      alumno("b", { registro: { estado: "llego" } }),
      alumno("c", { registro: { estado: "tarde" } }),
      alumno("d", { registro: { estado: "llego" } }),
    ];
    const r = resumenAvisosLista(alumnos, { a: "llego", b: "llego", c: "llego", d: "falta" });
    expect(r).toEqual({ familias: 1, porEstado: { llego: 0, tarde: 0, falta: 1, problema: 0 }, llegadasYaAvisadas: 2 });
    expect(textoResumenAvisos(r)).toBe("Se avisará a 1 familia: 1 falta.");
  });

  it("sin avisos nuevos lo dice", () => {
    expect(textoResumenAvisos(resumenAvisosLista([], {}))).toBe("No hay avisos nuevos para enviar.");
  });
});
