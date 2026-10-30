import { describe, expect, it } from "vitest";
import { seAvisaCambio } from "@/lib/asistencia-por-curso";
import { notasResumenAvisos, resumenAvisosLista, textoResumenAvisos, type AlumnoResumen } from "@/lib/resumen-avisos-lista";

const alumno = (id: string, extra: Partial<AlumnoResumen> = {}): AlumnoResumen => ({ id, registro: null, familiasConAviso: 1, ...extra });

describe("resumen previo de avisos al pasar lista", () => {
  it("cuenta familias de presentes, tardanzas, faltas y problemas", () => {
    const alumnos = [alumno("a"), alumno("b", { familiasConAviso: 2 }), alumno("c"), alumno("d"), alumno("e", { familiasConAviso: 0 })];
    const r = resumenAvisosLista(alumnos, { a: "llego", b: "llego", c: "tarde", d: "falta", e: "llego" });
    expect(r).toEqual({ familias: 5, porEstado: { llego: 3, tarde: 1, falta: 1, problema: 0 }, llegadasYaAvisadas: 0, faltasSinIngreso: 0, esCurso: false });
    expect(textoResumenAvisos(r)).toBe("Se avisará a 5 familias: 3 llegadas, 1 tardanza, 1 falta.");
  });

  it("no repite la llegada de quien ya estaba «Tarde» ni avisa lo que no cambió", () => {
    const alumnos = [
      alumno("b", { registro: { estado: "llego" } }),
      alumno("c", { registro: { estado: "tarde" } }),
      alumno("d", { registro: { estado: "llego" } }),
    ];
    const r = resumenAvisosLista(alumnos, { b: "llego", c: "llego", d: "falta" });
    expect(r).toMatchObject({ familias: 1, porEstado: { llego: 0, tarde: 0, falta: 1, problema: 0 }, llegadasYaAvisadas: 1 });
    expect(textoResumenAvisos(r)).toBe("Se avisará a 1 familia: 1 falta.");
    expect(notasResumenAvisos(r)).toEqual(["La llegada de 1 alumno ya se avisó hoy."]);
  });

  it("sin avisos nuevos lo dice", () => {
    expect(textoResumenAvisos(resumenAvisosLista([], {}))).toBe("No hay avisos nuevos para enviar.");
  });

  it("los alumnos sin marca (al corregir) no cuentan", () => {
    expect(resumenAvisosLista([alumno("a")], { a: null }).familias).toBe(0);
  });
});

describe("resumen previo en una lista de curso", () => {
  const conIngreso = { ingreso: { estado: "llego" as const } };
  it("nunca avisa la llegada; avisa tardanzas, problemas y faltas a clase de quien ingresó al colegio", () => {
    const alumnos = [
      alumno("a", conIngreso),
      alumno("b", conIngreso),
      alumno("c", { ingreso: { estado: "tarde" } }),
      alumno("d", conIngreso),
    ];
    const r = resumenAvisosLista(alumnos, { a: "llego", b: "tarde", c: "falta", d: "problema" }, true);
    expect(r).toMatchObject({ familias: 3, porEstado: { llego: 0, tarde: 1, falta: 1, problema: 1 }, faltasSinIngreso: 0, llegadasYaAvisadas: 0 });
    expect(textoResumenAvisos(r)).toBe("Se avisará a 3 familias: 1 tardanza, 1 falta a clase, 1 problema.");
  });

  it("la falta de quien no ingresó al colegio (o tiene falta en el día) no se avisa aparte", () => {
    const alumnos = [alumno("a"), alumno("b", { ingreso: { estado: "falta" } }), alumno("c", conIngreso)];
    const r = resumenAvisosLista(alumnos, { a: "falta", b: "falta", c: "falta" }, true);
    expect(r).toMatchObject({ familias: 1, faltasSinIngreso: 2 });
    expect(textoResumenAvisos(r)).toBe("Se avisará a 1 familia: 1 falta a clase.");
    expect(notasResumenAvisos(r)[0]).toMatch(/^2 faltas no se avisan aparte/);
  });
});

describe("regla de avisos de una lista (seAvisaCambio)", () => {
  it("asistencia del día: todo cambio se avisa, salvo la llegada de quien ya estaba «Tarde»", () => {
    expect(seAvisaCambio({ esCurso: false, estado: "llego", anterior: null })).toBe(true);
    expect(seAvisaCambio({ esCurso: false, estado: "llego", anterior: "tarde" })).toBe(false);
    expect(seAvisaCambio({ esCurso: false, estado: "llego", anterior: "falta" })).toBe(true);
    expect(seAvisaCambio({ esCurso: false, estado: "falta", anterior: "llego" })).toBe(true);
    expect(seAvisaCambio({ esCurso: false, estado: "falta", anterior: "falta" })).toBe(false);
  });

  it("curso: nunca «llegó»; la falta solo con ingreso al colegio (llegó o tarde)", () => {
    expect(seAvisaCambio({ esCurso: true, estado: "llego", anterior: "falta", ingreso: { estado: "llego" } })).toBe(false);
    expect(seAvisaCambio({ esCurso: true, estado: "tarde", anterior: null, ingreso: null })).toBe(true);
    expect(seAvisaCambio({ esCurso: true, estado: "problema", anterior: null, ingreso: null })).toBe(true);
    expect(seAvisaCambio({ esCurso: true, estado: "falta", anterior: null, ingreso: { estado: "tarde" } })).toBe(true);
    expect(seAvisaCambio({ esCurso: true, estado: "falta", anterior: null, ingreso: { estado: "falta" } })).toBe(false);
    expect(seAvisaCambio({ esCurso: true, estado: "falta", anterior: null, ingreso: null })).toBe(false);
  });
});
