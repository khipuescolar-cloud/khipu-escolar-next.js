import { describe, expect, it } from "vitest";
import { leerCsvPersonal } from "@/lib/importar-personal";

const ENC = "nombres,apellidos,documento,correo,telefono,genero,cargo";

describe("leerCsvPersonal", () => {
  it("lee profesores con columnas opcionales y comillas", () => {
    const r = leerCsvPersonal(`${ENC}\nAna,"Ríos, Paz",12345678,ANA@x.pe,999,F,Docente\n`, "profesores");
    expect(r.errores).toEqual([]);
    expect(r.filas[0]).toMatchObject({ linea: 2, nombres: "Ana", apellidos: "Ríos, Paz", numeroDocumento: "12345678", email: "ana@x.pe", tipoDocumento: "dni", rol: "profesor", cargo: "Docente" });
  });

  it("pide la columna rol en el CSV de personal y valida su valor", () => {
    expect(leerCsvPersonal(`${ENC}\nA,B,12345678,a@x.pe,,,\n`, "personal").errores[0].mensaje).toContain("rol");
    const r = leerCsvPersonal(`${ENC},rol\nA,B,12345678,a@x.pe,,,,director\nC,D,12345679,c@x.pe,,,,porteria\n`, "personal");
    expect(r.errores).toEqual([{ linea: 2, mensaje: "El rol debe ser «administrativo» o «porteria»." }]);
    expect(r.filas).toHaveLength(1);
  });

  it("rechaza archivos vacíos y sin columnas obligatorias", () => {
    expect(leerCsvPersonal("", "profesores").errores[0].mensaje).toContain("vacío");
    expect(leerCsvPersonal("nombres,apellidos\nA,B\n", "profesores").errores[0].mensaje).toContain("documento, correo");
  });

  it("marca por línea datos faltantes y repetidos", () => {
    const r = leerCsvPersonal(`${ENC}\n,B,12345678,a@x.pe,,,\nA,B,,a@x.pe,,,\nA,B,11111111,a@x.pe,,,\nC,D,22222222,a@x.pe,,,\nE,F,11111111,e@x.pe,,,\n`, "profesores");
    expect(r.errores.map((e) => e.linea)).toEqual([2, 3, 5, 6]);
    expect(r.errores[2].mensaje).toContain("se repite");
    expect(r.filas.map((f) => f.linea)).toEqual([4]);
  });
});
