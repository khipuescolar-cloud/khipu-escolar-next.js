import { describe, expect, it } from "vitest";
import { leerCsvAlumnos } from "@/lib/importar-alumnos";

describe("leerCsvAlumnos", () => {
  it("lee filas válidas con separador coma y comillas", () => {
    const r = leerCsvAlumnos('nombres,apellidos,codigo,salon\nMateo,"Quispe, Huamán",2026-001,3.° B\nAna,Ríos,,3.° B\n');
    expect(r.errores).toEqual([]);
    expect(r.filas).toEqual([
      { linea: 2, nombres: "Mateo", apellidos: "Quispe, Huamán", codigo: "2026-001", salon: "3.° B" },
      { linea: 3, nombres: "Ana", apellidos: "Ríos", codigo: null, salon: "3.° B" },
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

  it("un archivo vacío es un error", () => {
    expect(leerCsvAlumnos("  \n").errores).toHaveLength(1);
  });
});
