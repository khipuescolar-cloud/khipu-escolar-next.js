import { describe, expect, it } from "vitest";
import { leerArchivoFamilias, MAX_FILAS_FAMILIAS } from "@/lib/carga-masiva/familias";
import { plantillaCarga, plantillaCsv } from "@/lib/carga-masiva/plantillas";
import { gradoDe, leerArchivoSalones, nivelDe, nombreSalonSugerido } from "@/lib/carga-masiva/salones";
import { enLotes, normalizarDocumento, normalizarEncabezado, referenciaPersona, tablaDesdeCsv, type Tabla } from "@/lib/carga-masiva/tabla";

const tabla = (csv: string): Tabla => tablaDesdeCsv(csv)!;

describe("tabla de la carga masiva", () => {
  it("normaliza encabezados con tildes, ñ y espacios", () => {
    expect(normalizarEncabezado(" Año ")).toBe("anio");
    expect(normalizarEncabezado("Correo electrónico")).toBe("correo_electronico");
    expect(normalizarEncabezado("Sección")).toBe("seccion");
  });

  it("lee CSV con punto y coma, BOM y líneas vacías, conservando el número de línea", () => {
    const t = tabla("﻿Nivel;Grado\r\n\r\nprimaria;3\r\n");
    expect(t.encabezado).toEqual(["nivel", "grado"]);
    expect(t.filas).toEqual([{ linea: 3, celdas: ["primaria", "3"] }]);
  });

  it("completa los ceros del DNI que Excel quita y valida CE/pasaporte", () => {
    expect(normalizarDocumento("1234567")).toEqual({ ok: true, valor: "01234567", completado: true });
    expect(normalizarDocumento("12.345.678")).toMatchObject({ ok: true, valor: "12345678" });
    expect(normalizarDocumento("123")).toMatchObject({ ok: false });
    expect(normalizarDocumento("ce1234567", "ce")).toMatchObject({ ok: true, valor: "CE1234567" });
  });

  it("reconoce al profesor por correo o documento", () => {
    expect(referenciaPersona("Ana@Colegio.PE")).toEqual({ tipo: "correo", valor: "ana@colegio.pe" });
    expect(referenciaPersona("40000001")).toEqual({ tipo: "documento", valor: "40000001" });
    expect(referenciaPersona("Juan Pérez")).toBeNull();
  });

  it("parte en lotes por debajo del límite de parámetros", () => {
    expect(enLotes(Array.from({ length: 2500 }, (_, i) => i), 1000).map((l) => l.length)).toEqual([1000, 1000, 500]);
  });
});

describe("archivo de salones y cursos", () => {
  it("interpreta nivel y grado y arma el nombre como en el colegio", () => {
    expect(nivelDe("Secundaria")).toBe("secundaria");
    expect(nivelDe("Sec.")).toBe("secundaria");
    expect(nivelDe("colegio")).toBeNull();
    expect(gradoDe("3.°")).toBe(3);
    expect(gradoDe("4 años")).toBe(4);
    expect(gradoDe("tercero")).toBe("invalido");
    expect(nombreSalonSugerido("inicial", 3, "A")).toBe("3 años A");
    expect(nombreSalonSugerido("primaria", 3, "B")).toBe("3.° B");
    expect(nombreSalonSugerido("secundaria", 1, "A")).toBe("1.° A Sec.");
  });

  it("junta las filas del mismo salón (un curso por fila)", () => {
    const r = leerArchivoSalones(tabla("nivel,grado,seccion,tutor,curso,profesor\nprimaria,3,b,40000001,Matemática,40000001\nprimaria,3,B,,Inglés,ana@x.pe\nprimaria,3,B,,Arte,\n"), 2027);
    expect(r.errores).toEqual([]);
    expect(r.salones).toHaveLength(1);
    const s = r.salones[0];
    expect(s).toMatchObject({ nombre: "3.° B", nivel: "primaria", grado: 3, seccion: "B", anio: 2027, tutor: { tipo: "documento", valor: "40000001" } });
    expect(s.cursos.map((c) => [c.nombre, c.profesor?.valor ?? null])).toEqual([["Matemática", "40000001"], ["Inglés", "ana@x.pe"], ["Arte", null]]);
  });

  it("acepta los cursos como columnas (x = sin profesor, vacío = no lo tiene) e ignora columnas de apoyo", () => {
    const r = leerArchivoSalones(tabla("nro,nivel,grado,seccion,tutor_nombre,Matemática,Comunicación,Arte\n1,secundaria,1,A,Ana,40000001,x,\n"), 2027);
    expect(r.errores).toEqual([]);
    expect(r.cursosEnColumnas).toEqual(["Matemática", "Comunicación", "Arte"]);
    expect(r.salones[0].cursos.map((c) => [c.nombre, c.profesor?.valor ?? null])).toEqual([["Matemática", "40000001"], ["Comunicación", null]]);
  });

  it("reporta por línea niveles, grados y tutores en conflicto", () => {
    const r = leerArchivoSalones(
      tabla("nivel,grado,seccion,tutor,curso,profesor\ncolegio,3,A,,,\nprimaria,,A,,,\nprimaria,3,A,40000001,,\nprimaria,3,A,40000002,,\nprimaria,3,A,,Arte,40000001\nprimaria,3,A,,Arte,40000002\n"),
      2027,
    );
    expect(r.errores.map((e) => e.linea)).toEqual([2, 3, 5, 7]);
    expect(r.errores[0].mensaje).toContain("Nivel «colegio» no válido");
    expect(r.errores[2].mensaje).toContain("otro tutor");
    expect(r.errores[3].mensaje).toContain("otro profesor");
  });

  it("avisa del profesor que no es DNI ni correo y exige la columna nivel", () => {
    const r = leerArchivoSalones(tabla("nivel,grado,curso,profesor\nprimaria,2,Arte,Juan Pérez\n"), 2027);
    expect(r.salones[0].cursos[0]).toMatchObject({ profesor: null, profesorIlegible: "Juan Pérez" });
    expect(leerArchivoSalones(tabla("grado\n3\n"), 2027).errores[0].mensaje).toContain("Falta la columna «nivel»");
  });

  it("no deja que dos salones distintos terminen con el mismo nombre", () => {
    const r = leerArchivoSalones(tabla("nivel,grado,seccion,nombre\nprimaria,3,A,Aula Azul\nprimaria,4,A,Aula Azul\n"), 2027);
    expect(r.errores.map((e) => e.linea)).toEqual([3]);
    expect(r.salones).toHaveLength(1);
  });
});

describe("archivo de familias", () => {
  const encabezado = "alumno_codigo,alumno_dni,apoderado_dni,tipo_documento,nombres,apellidos,correo,celular,parentesco";

  it("lee hermanos como filas del mismo apoderado y completa ceros del DNI", () => {
    const r = leerArchivoFamilias(tabla(`${encabezado}\nA1,,1000001,dni,Rosa,Pérez,ROSA@x.pe,987654321,Madre\nA2,,01000001,,Rosa,Pérez,rosa@x.pe,,madre\n`));
    expect(r.errores).toEqual([]);
    expect(r.filas.map((f) => [f.alumnoCodigo, f.documento, f.correo, f.parentesco])).toEqual([["A1", "01000001", "rosa@x.pe", "madre"], ["A2", "01000001", "rosa@x.pe", "madre"]]);
    expect(r.avisos).toHaveLength(1);
  });

  it("valida cada fila con mensajes en español", () => {
    const r = leerArchivoFamilias(
      tabla(
        `${encabezado}\n,,41000001,dni,A,B,a@x.pe,,madre\nA1,,123,dni,A,B,a@x.pe,,madre\nA1,,41000001,dni,A,B,no-es-correo,,madre\nA1,,41000001,dni,A,B,a@x.pe,abc,madre\nA1,,41000001,dni,A,B,a@x.pe,,\nA1,,41000001,xx,A,B,a@x.pe,,madre\n`,
      ),
    );
    expect(r.filas).toEqual([]);
    expect(r.errores.map((e) => e.mensaje)).toEqual([
      "Falta el código o el DNI del alumno.",
      "Documento del apoderado no válido: El DNI debe tener 8 dígitos.",
      "El correo «no-es-correo» no es válido.",
      "El celular solo puede tener números (de 6 a 20).",
      "Falta el parentesco (madre, padre, tutor legal…).",
      "El tipo de documento debe ser dni, ce o pasaporte.",
    ]);
  });

  it("detecta correo con dos documentos, documento con dos correos y filas repetidas", () => {
    const r = leerArchivoFamilias(
      tabla(`${encabezado}\nA1,,41000001,,A,B,a@x.pe,,madre\nA2,,41000002,,A,B,a@x.pe,,madre\nA3,,41000001,,A,B,b@x.pe,,madre\nA1,,41000001,,A,B,a@x.pe,,padre\n`),
    );
    expect(r.filas).toHaveLength(1);
    expect(r.errores.map((e) => e.linea)).toEqual([3, 4, 5]);
    expect(r.errores[2].mensaje).toContain("se repiten");
  });

  it("exige las columnas y limita el tamaño", () => {
    expect(leerArchivoFamilias(tabla("nombres,apellidos\nA,B\n")).errores[0].mensaje).toContain("Faltan las columnas: alumno_codigo o alumno_dni, apoderado_dni, correo, parentesco");
    const muchas = Array.from({ length: MAX_FILAS_FAMILIAS + 1 }, (_, i) => `A${i},,${String(40000000 + i)},,N,A,p${i}@x.pe,,madre`).join("\n");
    const r = leerArchivoFamilias(tabla(`${encabezado}\n${muchas}\n`));
    expect(r.filas).toHaveLength(MAX_FILAS_FAMILIAS);
    expect(r.errores[0].mensaje).toContain("Máximo 3000");
  });
});

describe("plantillas", () => {
  it("las plantillas CSV se leen sin errores con sus propios lectores", () => {
    expect(leerArchivoSalones(tabla(plantillaCsv("salones", 2027)), 2027).errores).toEqual([]);
    const f = leerArchivoFamilias(tabla(plantillaCsv("familias", 2027)));
    expect(f.errores).toEqual([]);
    expect(f.filas).toHaveLength(plantillaCarga("familias", 2027).ejemplos.length);
  });
});
