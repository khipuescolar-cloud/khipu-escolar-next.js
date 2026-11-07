import { describe, expect, it } from "vitest";
import { tablaDesdeCsv } from "@/lib/carga-masiva/tabla";
import { analizarArchivoNotas, exportarRegistroCsv, plantillaCsv } from "@/lib/notas-plantilla";

const alumnos = [{ id: "11111111-1111-4111-8111-111111111111", nombres: "Ana", apellidos: "Uno" }, { id: "22222222-2222-4222-8222-222222222222", nombres: "Beto", apellidos: "Dos" }];

describe("plantilla y archivo de notas", () => {
  it("la plantilla CSV lleva BOM, «;» y una fila por alumno", () => {
    const csv = plantillaCsv(alumnos);
    expect(csv.startsWith("﻿alumno_id;apellidos_nombres;nota;observacion\r\n")).toBe(true);
    expect(csv).toContain(`${alumnos[0].id};"Uno, Ana";;`.replace('"Uno, Ana"', "Uno, Ana"));
  });
  it("lee por id o por nombre y separa válidas, errores y pendientes", () => {
    const t = tablaDesdeCsv(`alumno_id;apellidos_nombres;nota;observacion\n${alumnos[0].id};;ad;Muy bien\n;Dos, Beto;;\n;Nadie;A;\n${alumnos[0].id};;B;\n`)!;
    const r = analizarArchivoNotas(t, { escala: "literal", alumnos });
    expect(r.filas).toEqual([{ linea: 2, alumnoId: alumnos[0].id, alumno: "Uno, Ana", nota: "AD", observacion: "Muy bien" }]);
    expect(r.pendientes).toBe(1);
    expect(r.errores.map((e) => e.mensaje)).toEqual([expect.stringContaining("Alumno desconocido"), expect.stringContaining("dos veces")]);
  });
  it("valida la escala y exige nota para la observación", () => {
    const t = tablaDesdeCsv(`alumno_id;nota;observacion\n${alumnos[0].id};25;\n${alumnos[1].id};;Solo texto\n`)!;
    const r = analizarArchivoNotas(t, { escala: "vigesimal", alumnos });
    expect(r.filas).toHaveLength(0);
    expect(r.errores[0].mensaje).toContain("entre 0 y 20");
    expect(r.errores[1].mensaje).toContain("Pon una nota para guardar la observación.");
  });
  it("sin columnas obligatorias pide la plantilla", () => {
    expect(analizarArchivoNotas(tablaDesdeCsv("foo;bar\n1;2")!, { escala: "literal", alumnos }).errores[0].mensaje).toContain("Descarga la plantilla");
  });
  it("exporta dos filas de encabezado, marca privadas y evita fórmulas", () => {
    const csv = exportarRegistroCsv({ alumnos, actividades: [{ id: "e", titulo: "Práctica", fecha: "2026-11-01", competencia: "Resuelve", notas: [{ alumnoId: alumnos[0].id, texto: "A", observacion: "=SUMA(1;2)", privada: true }] }] });
    expect(csv).toContain("Resuelve");
    expect(csv).toContain("Alumno;Práctica (2026-11-01);Observación");
    expect(csv).toContain("[Privada] =SUMA(1;2)");
  });
});
