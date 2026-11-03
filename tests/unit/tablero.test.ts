import { describe, expect, it } from "vitest";
import {
  ausentismoCronico, avanceRegistro, conteoVacio, distribucionVacia, etiquetaNivel, inicioDiaEnZonaIso, logroEsperado, nivelDeValor,
  porcentajeDe, rankingSalones, resolverPeriodo, tendenciaSemanal, umbralValido, type AlumnoAsistencia, type PeriodoOpcion,
} from "@/lib/tablero";
import { logroDeColumna, resumenAlumno, tablaDeConsolidado, type Consolidado } from "@/lib/tablero-consolidado";

const periodos: PeriodoOpcion[] = [
  { id: "p1", nombre: "I Bimestre", inicio: "2026-03-09", fin: "2026-05-08" },
  { id: "p3", nombre: "III Bimestre", inicio: "2026-08-03", fin: "2026-10-02" },
  { id: "p4", nombre: "IV Bimestre", inicio: "2026-10-12", fin: "2026-12-18" },
];
const c = (llego: number, tarde = 0, falta = 0, problema = 0) => ({ ...conteoVacio(), llego, tarde, falta, problema });

describe("periodo del tablero", () => {
  it("por defecto es el mes actual hasta hoy y toma como referencia el bimestre vigente", () => {
    const p = resolverPeriodo(undefined, "2026-10-30", periodos);
    expect(p).toMatchObject({ clave: "mes", desde: "2026-10-01", hasta: "2026-10-30", referencia: { id: "p4" } });
  });
  it("un periodo académico usa sus fechas; el año va del 1 de enero a hoy", () => {
    expect(resolverPeriodo("p3", "2026-10-30", periodos)).toMatchObject({ clave: "p3", desde: "2026-08-03", hasta: "2026-10-02", referencia: { id: "p3" } });
    expect(resolverPeriodo("anio", "2026-10-30", periodos)).toMatchObject({ desde: "2026-01-01", hasta: "2026-10-30" });
  });
  it("un valor desconocido cae en el mes actual; entre bimestres la referencia es el último que empezó", () => {
    expect(resolverPeriodo("loquesea", "2026-10-30", periodos).clave).toBe("mes");
    expect(resolverPeriodo(null, "2026-10-05", periodos).referencia?.id).toBe("p3");
    expect(resolverPeriodo(null, "2026-01-15", periodos).referencia).toBeNull();
  });
  it("el umbral solo acepta enteros de 50 a 99", () => {
    expect(umbralValido("85")).toBe(85);
    for (const malo of [undefined, "", "abc", "49", "100", "89.5"]) expect(umbralValido(malo)).toBe(90);
  });
});

describe("asistencia", () => {
  it("el porcentaje es (llegó + tarde) sobre todos los registros, como los reportes", () => {
    expect(porcentajeDe(c(6, 2, 1, 1))).toBe(80);
    expect(porcentajeDe(conteoVacio())).toBeNull();
  });
  it("agrupa por semana, suma tardanzas y omite semanas sin registros", () => {
    const filas = [
      { fecha: "2026-03-02", estado: "llego" as const, n: 8 },
      { fecha: "2026-03-03", estado: "tarde" as const, n: 1 },
      { fecha: "2026-03-06", estado: "falta" as const, n: 1 },
      { fecha: "2026-03-16", estado: "llego" as const, n: 5 }, // semana del 16 (la del 9 no tiene registros)
    ];
    expect(tendenciaSemanal(filas)).toEqual([
      { semana: "2026-03-02", porcentaje: 90, tardanzas: 1, faltas: 1, registros: 10 },
      { semana: "2026-03-16", porcentaje: 100, tardanzas: 0, faltas: 0, registros: 5 },
    ]);
  });
  const alumnos: AlumnoAsistencia[] = [
    { alumnoId: "a", nombre: "A", salonId: "s1", salon: "3.° B", conteo: c(9, 0, 1) },
    { alumnoId: "b", nombre: "B", salonId: "s1", salon: "3.° B", conteo: c(5, 1, 4) },
    { alumnoId: "c", nombre: "C", salonId: "s2", salon: "5.° A", conteo: c(10) },
    { alumnoId: "d", nombre: "D", salonId: "s2", salon: "5.° A", conteo: c(0, 0, 2) }, // solo 2 registros: no se señala
    { alumnoId: "e", nombre: "E", salonId: "s2", salon: "5.° A", conteo: conteoVacio() },
  ];
  it("ausentismo crónico: estrictamente menor al umbral, con mínimo de días, del más bajo al más alto", () => {
    expect(ausentismoCronico(alumnos, 90).map((f) => [f.alumnoId, f.porcentaje])).toEqual([["b", 60]]);
    expect(ausentismoCronico(alumnos, 91).map((f) => f.alumnoId)).toEqual(["b", "a"]); // a = 90 %
    expect(ausentismoCronico(alumnos, 90).some((f) => f.alumnoId === "a")).toBe(false); // 90 no es menor que 90
  });
  it("ranking de salones: porcentaje sobre el total del salón, mayor primero y sin datos al final", () => {
    const r = rankingSalones([{ salonId: "s1", salon: "3.° B" }, { salonId: "s2", salon: "5.° A" }, { salonId: "s3", salon: "1.° A" }], alumnos);
    expect(r.map((s) => [s.salon, s.porcentaje])).toEqual([["5.° A", 83.3], ["3.° B", 75], ["1.° A", null]]);
    expect(r[1]).toMatchObject({ alumnos: 2, tardanzas: 1, faltas: 5 });
  });
});

describe("rendimiento académico", () => {
  it("vigesimal: 18–20 AD, 14–17 A, 11–13 B, 0–10 C; literal tal cual", () => {
    const n = (v: number) => nivelDeValor({ valorLiteral: null, valorNumerico: v });
    expect([n(20), n(18), n(17.5), n(14), n(13), n(11), n(10.9), n(0)]).toEqual(["AD", "AD", "A", "A", "B", "B", "C", "C"]);
    expect(nivelDeValor({ valorLiteral: "B", valorNumerico: null })).toBe("B");
    expect(nivelDeValor({ valorLiteral: null, valorNumerico: null })).toBeNull();
  });
  it("logro esperado = (AD + A) / total", () => {
    expect(logroEsperado({ ...distribucionVacia(), AD: 1, A: 2, B: 1, C: 0 })).toBe(75);
    expect(logroEsperado(distribucionVacia())).toBeNull();
  });
  it("las etiquetas siguen la escala del colegio", () => {
    expect(etiquetaNivel("A", "literal")).toBe("A");
    expect(etiquetaNivel("A", "vigesimal")).toBe("14–17");
  });
});

describe("avance de registro de notas", () => {
  it("notas registradas ÷ (evaluaciones × alumnos), con tope de 100 % y sin dato si no hay evaluaciones", () => {
    expect(avanceRegistro(3, 10, 15)).toMatchObject({ esperadas: 30, porcentaje: 50 });
    expect(avanceRegistro(2, 5, 12).porcentaje).toBe(100);
    expect(avanceRegistro(0, 10, 0).porcentaje).toBeNull();
  });
});

describe("zona horaria", () => {
  it("el día empieza a las 05:00 UTC en Lima", () => {
    expect(inicioDiaEnZonaIso("2026-10-30", "America/Lima").toISOString()).toBe("2026-10-30T05:00:00.000Z");
  });
});

describe("consolidado de notas", () => {
  const base: Consolidado = {
    colegio: "Colegio Demo", salon: { id: "s", nombre: "3.° B" }, periodo: { id: "p", nombre: "I Bimestre" }, escala: "literal",
    columnas: [
      { cursoId: "m", curso: "Matemática", competenciaId: "c1", competencia: "Resuelve problemas de cantidad" },
      { cursoId: "m", curso: "Matemática", competenciaId: "c2", competencia: "Resuelve problemas de forma" },
      { cursoId: "k", curso: "Comunicación", competenciaId: "c3", competencia: "Lee textos" },
    ],
    filas: [
      { alumnoId: "1", nombre: "Quispe, Mateo", valores: [{ valorLiteral: "C", valorNumerico: null }, { valorLiteral: "C", valorNumerico: null }, null] },
      { alumnoId: "2", nombre: "Ríos, Valentina", valores: [{ valorLiteral: "AD", valorNumerico: null }, { valorLiteral: "A", valorNumerico: null }, { valorLiteral: "B", valorNumerico: null }] },
    ],
  };
  it("agrupa columnas por curso, cuenta competencias en riesgo y calcula % de logro por competencia", () => {
    const t = tablaDeConsolidado(base);
    expect(t.grupos).toEqual([{ texto: "Matemática", columnas: 2 }, { texto: "Comunicación", columnas: 1 }]);
    expect(t.columnas.at(-1)).toBe("Competencias en riesgo");
    expect(t.filas[0]).toEqual(["Quispe, Mateo", "C", "C", null, 2]);
    expect(t.pie).toEqual(["% logro esperado", 50, 50, 0, null]);
    expect(t.archivo).toBe("consolidado-notas-3-b-i-bimestre");
  });
  it("vigesimal: sin promedio del alumno (no es una nota validada) y riesgo con menos de 11", () => {
    const v: Consolidado = {
      ...base, escala: "vigesimal", columnas: base.columnas.slice(0, 2),
      filas: [{ alumnoId: "1", nombre: "Quispe, Mateo", valores: [{ valorLiteral: null, valorNumerico: 9 }, { valorLiteral: null, valorNumerico: 10 }] }],
    };
    expect(resumenAlumno(v.filas[0].valores)).toEqual({ enRiesgo: 2 });
    const t = tablaDeConsolidado(v);
    expect(t.columnas).not.toContain("Promedio");
    expect(t.filas[0]).toEqual(["Quispe, Mateo", 9, 10, 2]);
    expect(logroDeColumna(v.filas.map((f) => f.valores[0]))).toBe(0);
  });
});
