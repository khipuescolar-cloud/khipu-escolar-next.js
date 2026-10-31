import { describe, expect, it } from "vitest";
import { CLASES_POR_BLOQUE, tablaDeReporte } from "@/lib/reportes-asistencia-tabla";
import { resumirCurso } from "@/lib/reportes-curso";
import type { ReporteCurso } from "@/lib/server/reportes-asistencia";

const alumnos = [
  { id: "a", nombres: "Mateo", apellidos: "Quispe", codigo: "M1" },
  { id: "b", nombres: "Valentina", apellidos: "Ríos", codigo: null },
];

describe("historial de un curso", () => {
  it("las fechas de clase son las que tienen registro; cuenta por alumno, por clase y total", () => {
    const m = resumirCurso(alumnos, [
      { alumnoId: "a", fecha: "2026-10-28", estado: "llego" },
      { alumnoId: "b", fecha: "2026-10-28", estado: "falta" },
      { alumnoId: "a", fecha: "2026-10-26", estado: "tarde" },
    ]);
    expect(m.fechas).toEqual(["2026-10-26", "2026-10-28"]);
    expect(m.filas[0]).toMatchObject({ estados: ["tarde", "llego"], resumen: { clases: 2, llego: 1, tarde: 1, falta: 0, porcentaje: 100 } });
    // Valentina no tiene registro el 26: no cuenta en su porcentaje.
    expect(m.filas[1]).toMatchObject({ estados: [null, "falta"], resumen: { falta: 1, sinRegistro: 1, porcentaje: 0 } });
    expect(m.total).toMatchObject({ clases: 2, llego: 1, tarde: 1, falta: 1, sinRegistro: 1, porcentaje: 66.7 });
    expect(m.porFecha).toEqual([
      { fecha: "2026-10-26", llego: 0, tarde: 1, falta: 0, problema: 0, sinRegistro: 1 },
      { fecha: "2026-10-28", llego: 1, tarde: 0, falta: 1, problema: 0, sinRegistro: 0 },
    ]);
  });

  it("sin clases en el rango, sin fechas y sin porcentaje", () => {
    expect(resumirCurso(alumnos, [])).toMatchObject({ fechas: [], total: { clases: 0, porcentaje: null } });
  });

  it("Excel/PDF: resumen por alumno y la matriz en bloques de 20 clases con letras", () => {
    const fechas = Array.from({ length: 23 }, (_, i) => `2026-09-${String(i + 1).padStart(2, "0")}`);
    const m = resumirCurso(alumnos, fechas.map((fecha) => ({ alumnoId: "a", fecha, estado: "llego" as const })));
    const r: ReporteCurso = {
      tipo: "curso", colegio: "Colegio", salon: { id: "s", nombre: "3.° B" }, curso: { id: "c", nombre: "Arte y Cultura" }, profesor: "Lucía García",
      desde: "2026-09-01", hasta: "2026-09-30", hastaEfectivo: "2026-09-30", ...m,
    };
    const t = tablaDeReporte(r);
    expect(t.titulo).toBe("Arte y Cultura · 3.° B");
    expect(t.archivo).toBe("asistencia-arte-y-cultura-3-b-2026-09-01-2026-09-30");
    expect(t.secciones.map((s) => s.titulo)).toEqual(["Resumen por alumno", "Clases del 01/09 al 20/09", "Clases del 21/09 al 23/09"]);
    expect(t.secciones[0].total).toEqual(["Total del curso", "", "", 23, 23, 0, 0, 0, 23, 100]); // sin registro no cuenta
    expect(t.secciones[1].columnas).toHaveLength(1 + CLASES_POR_BLOQUE);
    expect(t.secciones[1].filas[0].slice(0, 3)).toEqual(["Quispe, Mateo", "L", "L"]);
    expect(t.secciones[2].filas[1]).toEqual(["Ríos, Valentina", "—", "—", "—"]);
  });
});
