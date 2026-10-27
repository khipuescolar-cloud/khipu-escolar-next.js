import { describe, expect, it } from "vitest";
import { analizarNotasCsv, exportarNotasCsv } from "@/lib/notas-csv";
import { CORTE_LIBRETA_PUBLICADA, libretaVisibleParaFamilia, puedePublicarLibreta } from "@/lib/libreta-publicacion";

const alumnos = [
  { id: "a1", nombres: "Ana María", apellidos: "Uno Pérez", codigo: "A001" },
  { id: "a2", nombres: "Beto", apellidos: "Dos", codigo: null },
];
const evaluaciones = [{ id: "e1", titulo: "Práctica 1" }, { id: "e2", titulo: "Examen" }];

describe("exportar notas a CSV", () => {
  it("UTF-8 con BOM, separador «;», una fila por alumno y celdas vacías sin nota", () => {
    const csv = exportarNotasCsv({
      alumnos, evaluaciones,
      notas: [
        { evaluacionId: "e1", alumnoId: "a1", valorLiteral: null, valorNumerico: 15.5 },
        { evaluacionId: "e2", alumnoId: "a2", valorLiteral: null, valorNumerico: 8 },
      ],
    });
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.split("\r\n").slice(0, 3)).toEqual(["﻿Código;Alumno;Práctica 1;Examen", "A001;Uno Pérez, Ana María;15,5;", ";Dos, Beto;;8"]);
  });

  it("escapa comillas, separadores y fórmulas", () => {
    const csv = exportarNotasCsv({ alumnos: [{ ...alumnos[0], apellidos: "=SUMA(1;2)" }], evaluaciones: [{ id: "e1", titulo: 'Ensayo "final"; parte 1' }], notas: [] });
    expect(csv).toContain('"Ensayo ""final""; parte 1"');
    expect(csv).toContain("'=SUMA(1;2), Ana María");
  });

  it("lo exportado se puede volver a importar", () => {
    const csv = exportarNotasCsv({ alumnos, evaluaciones, notas: [{ evaluacionId: "e1", alumnoId: "a1", valorLiteral: null, valorNumerico: 14 }] });
    const r = analizarNotasCsv(csv, { escala: "vigesimal", alumnos, evaluaciones });
    expect(r.errores).toEqual([]);
    expect(r.cambios).toHaveLength(1);
    expect(r.cambios[0]).toMatchObject({ alumnoId: "a1", evaluacionId: "e1", valor: { valorNumerico: 14 } });
  });
});

describe("importar notas desde CSV", () => {
  const ctx = (escala: "literal" | "vigesimal") => ({ escala, alumnos, evaluaciones });

  it("reconoce alumno por código o por nombre (sin tildes ni mayúsculas) y acepta coma decimal", () => {
    const r = analizarNotasCsv("codigo;alumno;practica 1;EXAMEN\nA001;;12,5;\n;beto dos;;17\n", ctx("vigesimal"));
    expect(r.errores).toEqual([]);
    expect(r.cambios.map((c) => [c.alumnoId, c.evaluacionId, c.valor.valorNumerico])).toEqual([["a1", "e1", 12.5], ["a2", "e2", 17]]);
    expect(r.vacias).toBe(2);
  });

  it("acepta separador «,» y tabulación", () => {
    expect(analizarNotasCsv("Código,Alumno,Examen\nA001,x,10", ctx("vigesimal")).cambios).toHaveLength(1);
    expect(analizarNotasCsv("Código\tAlumno\tExamen\nA001\tx\t10", ctx("vigesimal")).cambios).toHaveLength(1);
  });

  it("valida el valor según la escala: AD/A/B/C o 0–20", () => {
    const lit = analizarNotasCsv("Código;Examen\nA001;ad\nA001x;B", ctx("literal"));
    expect(lit.cambios[0].valor.valorLiteral).toBe("AD");
    const vig = analizarNotasCsv("Código;Examen;Práctica 1\nA001;21;A", ctx("vigesimal"));
    expect(vig.cambios).toHaveLength(0);
    expect(vig.errores.map((e) => e.mensaje).join(" ")).toContain("entre 0 y 20");
    const l2 = analizarNotasCsv("Código;Examen\nA001;15", ctx("literal"));
    expect(l2.errores[0].mensaje).toContain("Usa AD, A, B o C.");
  });

  it("reporta alumnos desconocidos, repetidos y columnas ignoradas sin frenar las filas válidas", () => {
    const r = analizarNotasCsv("Código;Alumno;Examen;Otro\nA001;;10;1\nZZZ;Nadie;5;1\nA001;;11;1", ctx("vigesimal"));
    expect(r.cambios).toHaveLength(1);
    expect(r.errores.map((e) => e.mensaje).join("|")).toMatch(/No encontramos al alumno «Nadie»[\s\S]*aparece dos veces/);
    expect(r.columnasIgnoradas).toEqual(["Otro"]);
  });

  it("rechaza archivos sin columnas de alumno o sin evaluaciones conocidas", () => {
    expect(analizarNotasCsv("", ctx("vigesimal")).errores[0].mensaje).toContain("vacío");
    expect(analizarNotasCsv("Foo;Bar\n1;2", ctx("vigesimal")).errores[0].mensaje).toContain("Código");
    expect(analizarNotasCsv("Código;Zzz\nA001;1", ctx("vigesimal")).errores[0].mensaje).toContain("Ninguna columna");
  });
});

describe("visibilidad de la libreta para las familias", () => {
  const base = { cerrado: false, libretaPublicadaAt: null as Date | null, fin: new Date("2026-12-18") };
  it("un periodo publicado es visible; uno abierto o cerrado nuevo sin publicar, no", () => {
    expect(libretaVisibleParaFamilia({ ...base, libretaPublicadaAt: new Date() })).toBe(true);
    expect(libretaVisibleParaFamilia(base)).toBe(false);
    expect(libretaVisibleParaFamilia({ ...base, cerrado: true })).toBe(false);
  });
  it(`los periodos cerrados que terminaron antes del ${CORTE_LIBRETA_PUBLICADA} siguen visibles`, () => {
    expect(libretaVisibleParaFamilia({ ...base, cerrado: true, fin: new Date("2026-09-30") })).toBe(true);
    expect(libretaVisibleParaFamilia({ ...base, cerrado: false, fin: new Date("2026-09-30") })).toBe(false);
  });
  it("se puede publicar con el periodo cerrado o con todos los cursos cerrados", () => {
    expect(puedePublicarLibreta(true, 3, 0)).toBe(true);
    expect(puedePublicarLibreta(false, 3, 3)).toBe(true);
    expect(puedePublicarLibreta(false, 3, 2)).toBe(false);
    expect(puedePublicarLibreta(false, 0, 0)).toBe(false);
  });
});
