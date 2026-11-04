import { describe, expect, it } from "vitest";
import {
  agregarPorDia, diasHabilesDelRango, elegirRegistroDelDia, filtrosDeBusqueda, MAX_DIAS_RANGO, nombreArchivoReporte,
  porcentajeAsistencia, rangoSchema, resumirAlumno, sumarResumenes, textoJustificacion, textoPorcentaje, type RegistroDia,
} from "@/lib/reportes-asistencia";
import { tablaDeReporte } from "@/lib/reportes-asistencia-tabla";

const reg = (fecha: string, estado: RegistroDia["estado"], extra: Partial<RegistroDia> = {}): RegistroDia => ({ fecha, estado, ambito: "dia", hora: "07:50", ...extra });

describe("días hábiles del rango", () => {
  it("excluye fines de semana y feriados nacionales (28 y 29 de julio) y los extra", () => {
    // Semana del 27 al 31 de julio de 2026: lun 27, mar 28 (feriado), mié 29 (feriado), jue 30, vie 31.
    expect(diasHabilesDelRango("2026-07-27", "2026-08-02")).toEqual(["2026-07-27", "2026-07-30", "2026-07-31"]);
    expect(diasHabilesDelRango("2026-07-27", "2026-08-02", ["2026-07-30"])).toEqual(["2026-07-27", "2026-07-31"]);
  });
  it("un solo día de fin de semana no tiene días hábiles", () => {
    expect(diasHabilesDelRango("2026-10-31", "2026-10-31")).toEqual([]);
  });
});

describe("registro que cuenta cada día", () => {
  it("prevalece el ingreso al colegio sobre los cursos", () => {
    const e = elegirRegistroDelDia([
      { ambito: "curso-1", hora: "08:00", estado: "falta" },
      { ambito: "dia", hora: "09:00", estado: "llego" },
    ]);
    expect(e?.estado).toBe("llego");
  });
  it("sin ingreso, el primero por hora", () => {
    const e = elegirRegistroDelDia([
      { ambito: "c2", hora: "10:00", estado: "falta" },
      { ambito: "c1", hora: "08:00", estado: "tarde" },
    ]);
    expect(e?.estado).toBe("tarde");
  });
  it("sin registros devuelve null", () => {
    expect(elegirRegistroDelDia([])).toBeNull();
  });
});

describe("porcentaje de asistencia", () => {
  it("redondea a un decimal y es nulo sin base", () => {
    expect(porcentajeAsistencia(2, 3)).toBe(66.7);
    expect(porcentajeAsistencia(0, 0)).toBeNull();
    expect(textoPorcentaje(null)).toBe("Sin datos");
    expect(textoPorcentaje(92.5)).toMatch(/92[.,]5 %/);
  });

  const dias = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"];

  it("(llegó + tarde) / días con registro; los días sin registro no cuentan; justificadas vs sin justificar", () => {
    const { resumen, detalle } = resumirAlumno(dias, [
      reg("2026-10-26", "llego"),
      reg("2026-10-27", "tarde"),
      reg("2026-10-28", "falta", { justificacion: "aceptada" }),
      reg("2026-10-29", "falta", { justificacion: "rechazada" }),
      // 30: sin registro
      reg("2026-10-31", "llego"), // sábado: fuera de los días hábiles, no cuenta
    ]);
    expect(resumen).toMatchObject({ diasHabiles: 5, diasConRegistro: 4, diasSinRegistro: 1, llego: 1, tarde: 1, falta: 2, problema: 0, faltasJustificadas: 1, faltasEnRevision: 0, faltasInjustificadas: 1 });
    expect(resumen.porcentaje).toBe(50);
    expect(detalle.at(-1)).toEqual({ fecha: "2026-10-30", estado: null, hora: null, justificada: false, enRevision: false, horaSalida: null, conPermiso: false });
  });

  it("separa las faltas justificadas, en revisión (justificación pendiente) y sin justificar", () => {
    const { resumen, detalle } = resumirAlumno(dias.slice(0, 4), [
      reg("2026-10-26", "falta", { justificacion: "aceptada" }),
      reg("2026-10-27", "falta", { justificacion: "pendiente" }),
      reg("2026-10-28", "falta", { justificacion: "rechazada" }),
      reg("2026-10-29", "falta"),
    ]);
    expect(resumen).toMatchObject({ falta: 4, faltasJustificadas: 1, faltasEnRevision: 1, faltasInjustificadas: 2 });
    expect(detalle.map(textoJustificacion)).toEqual(["Justificada", "En revisión", "Sin justificar", "Sin justificar"]);
    expect(sumarResumenes([resumen, resumen])).toMatchObject({ faltasEnRevision: 2, faltasInjustificadas: 4 });
  });

  it("solo cuenta la asistencia al colegio: un día con solo registros de curso queda sin registro", () => {
    const { resumen } = resumirAlumno(["2026-10-26", "2026-10-27"], [reg("2026-10-26", "falta", { ambito: "c1" }), reg("2026-10-27", "llego", { ambito: "c1" }), reg("2026-10-27", "tarde")]);
    expect(resumen).toMatchObject({ diasConRegistro: 1, diasSinRegistro: 1, falta: 0, tarde: 1, porcentaje: 100 });
  });

  it("un día con ingreso y curso cuenta una sola vez, con el ingreso", () => {
    const { resumen } = resumirAlumno(["2026-10-26"], [reg("2026-10-26", "falta", { ambito: "c1" }), reg("2026-10-26", "llego")]);
    expect(resumen.llego).toBe(1);
    expect(resumen.falta).toBe(0);
    expect(resumen.porcentaje).toBe(100);
  });

  it("sin registros el porcentaje es nulo", () => {
    expect(resumirAlumno(dias, []).resumen.porcentaje).toBeNull();
  });

  it("el aviso (problema) cuenta como día con registro pero no como presencia", () => {
    const { resumen } = resumirAlumno(["2026-10-26", "2026-10-27"], [reg("2026-10-26", "problema"), reg("2026-10-27", "llego")]);
    expect(resumen.porcentaje).toBe(50);
  });

  it("el salón pondera por días con registro, no promedia porcentajes", () => {
    const a = resumirAlumno(dias, dias.map((d) => reg(d, "llego"))).resumen; // 5/5
    const b = resumirAlumno(dias.slice(0, 1), [reg(dias[0], "falta")]).resumen; // 0/1
    expect(sumarResumenes([a, b]).porcentaje).toBe(83.3);
  });
});

describe("validación del rango", () => {
  it("acepta desde ≤ hasta", () => {
    expect(rangoSchema.safeParse({ desde: "2026-03-01", hasta: "2026-03-01" }).success).toBe(true);
  });
  it("rechaza desde posterior a hasta", () => {
    expect(rangoSchema.safeParse({ desde: "2026-03-02", hasta: "2026-03-01" }).success).toBe(false);
  });
  it("rechaza más de un año y fechas inexistentes", () => {
    expect(rangoSchema.safeParse({ desde: "2025-01-01", hasta: "2026-01-02" }).success).toBe(false);
    expect(diasMax()).toBe(true);
    expect(rangoSchema.safeParse({ desde: "2026-02-31", hasta: "2026-03-05" }).success).toBe(false);
    expect(rangoSchema.safeParse({ desde: "ayer", hasta: "hoy" }).success).toBe(false);
  });
  it("sin fechas usa del 1.º del mes a hoy", () => {
    expect(filtrosDeBusqueda(() => null, "2026-10-30")).toEqual({ salonId: undefined, alumnoId: undefined, desde: "2026-10-01", hasta: "2026-10-30" });
  });
  it("rechaza ids que no son uuid", () => {
    expect(() => filtrosDeBusqueda((k) => (k === "salon" ? "x" : null), "2026-10-30")).toThrow();
  });
});

function diasMax() {
  // 366 días (2024 es bisiesto) son válidos; 367 no.
  return rangoSchema.safeParse({ desde: "2024-01-01", hasta: "2024-12-31" }).success && MAX_DIAS_RANGO === 366
    && !rangoSchema.safeParse({ desde: "2024-01-01", hasta: "2025-01-01" }).success;
}

describe("tabla y nombre de archivo", () => {
  it("nombre sin tildes ni símbolos", () => {
    expect(nombreArchivoReporte(["asistencia", "3.° B", "2026-10-01", "2026-10-30"])).toBe("asistencia-3-b-2026-10-01-2026-10-30");
  });
  it("la tabla del salón trae el total y la columna de porcentaje", () => {
    const resumen = resumirAlumno(["2026-10-26"], [reg("2026-10-26", "llego")]).resumen;
    const t = tablaDeReporte({
      tipo: "salon", colegio: "Colegio", salon: { id: "s", nombre: "3.° B" }, desde: "2026-10-01", hasta: "2026-10-30", hastaEfectivo: "2026-10-30",
      filas: [{ alumnoId: "a", nombres: "Mateo", apellidos: "Quispe", codigo: null, resumen }], total: resumen, porDia: [],
    });
    expect(t.archivo).toBe("asistencia-3-b-2026-10-01-2026-10-30");
    expect(t.secciones[0].filas[0].at(-1)).toBe(100);
    expect(t.secciones[0].columnas.length).toBe(t.secciones[0].filas[0].length);
    expect(t.secciones[0].columnasPorcentaje).toEqual([t.secciones[0].columnas.length - 1]);
  });
});

describe("agregarPorDia", () => {
  it("cuenta por día los estados de varios alumnos, las faltas justificadas y el porcentaje sin los días sin registro", () => {
    const dias = ["2026-10-26", "2026-10-27"];
    const a = resumirAlumno(dias, [reg("2026-10-26", "llego"), reg("2026-10-27", "falta", { justificacion: "aceptada" })]).detalle;
    const b = resumirAlumno(dias, [reg("2026-10-26", "tarde")]).detalle;
    expect(agregarPorDia([a, b])).toEqual([
      { fecha: "2026-10-26", llego: 1, tarde: 1, falta: 0, problema: 0, sinRegistro: 0, faltasJustificadas: 0, porcentaje: 100 },
      { fecha: "2026-10-27", llego: 0, tarde: 0, falta: 1, problema: 0, sinRegistro: 1, faltasJustificadas: 1, porcentaje: 0 },
    ]);
  });
});
