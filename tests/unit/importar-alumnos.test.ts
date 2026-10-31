import { describe, expect, it } from "vitest";
import { leerCsvAlumnos } from "@/lib/importar-alumnos";

describe("leerCsvAlumnos", () => {
  it("lee filas válidas con separador coma y comillas", () => {
    const r = leerCsvAlumnos('nombres,apellidos,codigo,salon\nMateo,"Quispe, Huamán",2026-001,3.° B\nAna,Ríos,,3.° B\n');
    expect(r.errores).toEqual([]);
    expect(r.filas).toEqual([
      { linea: 2, nombres: "Mateo", apellidos: "Quispe, Huamán", codigo: "2026-001", salon: "3.° B", documento: null },
      { linea: 3, nombres: "Ana", apellidos: "Ríos", codigo: null, salon: "3.° B", documento: null },
    ]);
  });

  it("acepta punto y coma, BOM y encabezados con tilde o mayúsculas", () => {
    const r = leerCsvAlumnos("﻿Nombres;Apellidos;Código;Salón\r\nLuis;Paz;A1;5.° A\r\n");
    expect(r.errores).toEqual([]);
    expect(r.filas[0]).toMatchObject({ nombres: "Luis", codigo: "A1", salon: "5.° A" });
  });

  it("rechaza archivos sin las columnas requeridas", () => {
    const r = leerCsvAlumnos("nombre,apellido\nA,B");
    expect(r.filas).toEqual([]);
    expect(r.errores[0].mensaje).toContain("Faltan las columnas");
  });

  it("reporta por línea los datos faltantes y los códigos repetidos", () => {
    const r = leerCsvAlumnos("nombres,apellidos,codigo,salon\n,Soto,1,A\nLeo,,2,A\nIvo,Gil,3,\nUna,Paz,9,A\nDos,Paz,9,A\n");
    expect(r.errores.map((e) => e.linea)).toEqual([2, 3, 4, 6]);
    expect(r.errores[3].mensaje).toContain("se repite");
    expect(r.filas).toHaveLength(1);
  });

  it("lee el documento opcional, completa los ceros del DNI y rechaza repetidos o inválidos", () => {
    const r = leerCsvAlumnos("nombres,apellidos,codigo,salon,dni\nAna,Paz,1,A,1234567\nBea,Paz,2,A,01234567\nCiro,Paz,3,A,12-34\nDino,Paz,4,A,\n");
    expect(r.filas.map((f) => f.documento)).toEqual(["01234567", null]);
    expect(r.errores.map((e) => e.linea)).toEqual([3, 4]);
    expect(r.errores[0].mensaje).toContain("se repite");
  });

  it("admite hasta 1 500 alumnos en un archivo", () => {
    const filas = Array.from({ length: 1501 }, (_, i) => `N${i},A${i},C${i},3.° B`).join("\n");
    const r = leerCsvAlumnos(`nombres,apellidos,codigo,salon\n${filas}\n`);
    expect(r.filas).toHaveLength(1500);
    expect(r.errores[0].mensaje).toContain("Máximo 1500");
  });

  it("un archivo vacío es un error", () => {
    expect(leerCsvAlumnos("  \n").errores).toHaveLength(1);
  });
});
