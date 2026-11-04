import { describe, expect, it } from "vitest";
import { cubreDiaCompleto, cubreHora, permisoVigenteEn, textoHorasPermiso } from "@/lib/permisos-asistencia";
import { filtrosDeBusqueda, nombreGrado, resumirAlumno, sumarResumenes, textoJustificacion } from "@/lib/reportes-asistencia";
import { filasCsvDeTabla, tablaDeReporte } from "@/lib/reportes-asistencia-tabla";
import { hora12 } from "@/lib/fechas";

const diaCompleto = { desde: "2026-10-26", hasta: "2026-10-27", todoElDia: true, horaDesde: null, horaHasta: null };
const porHoras = { desde: "2026-10-26", hasta: "2026-10-26", todoElDia: false, horaDesde: "08:00", horaHasta: "10:30" };

describe("cobertura de un permiso de asistencia", () => {
  it("el de día completo cubre cada día del rango y cualquier hora", () => {
    expect(cubreDiaCompleto(diaCompleto, "2026-10-26")).toBe(true);
    expect(cubreDiaCompleto(diaCompleto, "2026-10-27")).toBe(true);
    expect(cubreDiaCompleto(diaCompleto, "2026-10-28")).toBe(false);
    expect(cubreHora(diaCompleto, "2026-10-27", "15:00")).toBe(true);
  });
  it("el de unas horas solo cubre esas horas y nunca el día completo", () => {
    expect(cubreDiaCompleto(porHoras, "2026-10-26")).toBe(false);
    expect(cubreHora(porHoras, "2026-10-26", "09:15")).toBe(true);
    expect(cubreHora(porHoras, "2026-10-26", "10:31")).toBe(false);
  });
  it("un permiso anulado no cubre nada", () => {
    expect(permisoVigenteEn({ ...diaCompleto, anulado: true }, "2026-10-26")).toBe(false);
  });
  it("describe el horario", () => {
    expect(textoHorasPermiso(diaCompleto, hora12)).toBe("Todo el día");
    expect(textoHorasPermiso(porHoras, hora12)).toContain(" a ");
  });
});

describe("permisos en el resumen de asistencia", () => {
  const reg = (fecha: string, estado: "llego" | "falta") => ({ fecha, ambito: "dia", hora: "07:50", estado });
  it("una falta con permiso cuenta como justificada y «con permiso»; un día sin registro con permiso, también como con permiso", () => {
    const { resumen, detalle } = resumirAlumno(["2026-10-26", "2026-10-27", "2026-10-28"], [reg("2026-10-26", "falta"), reg("2026-10-28", "llego")], new Set(["2026-10-26", "2026-10-27"]));
    expect(resumen).toMatchObject({ falta: 1, faltasJustificadas: 1, faltasInjustificadas: 0, conPermiso: 2, diasSinRegistro: 1, porcentaje: 50 });
    expect(textoJustificacion(detalle[0])).toBe("Con permiso");
    expect(detalle[1]).toMatchObject({ estado: null, conPermiso: true });
    expect(sumarResumenes([resumen, resumen]).conPermiso).toBe(4);
  });
});

describe("reporte por grado", () => {
  it("lee el grado de la URL y lo nombra", () => {
    expect(filtrosDeBusqueda((k) => (k === "grado" ? "primaria-3" : null), "2026-10-30").grado).toEqual({ nivel: "primaria", grado: 3 });
    expect(() => filtrosDeBusqueda((k) => (k === "grado" ? "primaria-x" : null), "2026-10-30")).toThrow();
    expect(nombreGrado({ nivel: "primaria", grado: 3 })).toBe("3.° grado de primaria");
    expect(nombreGrado({ nivel: "inicial", grado: 4 })).toBe("Inicial de 4 años");
  });
});

describe("CSV del reporte", () => {
  it("aplana las secciones con título, columnas, filas y total, con el porcentaje en texto", () => {
    const resumen = { diasHabiles: 2, diasConRegistro: 2, diasSinRegistro: 0, llego: 1, tarde: 0, falta: 1, problema: 0, faltasJustificadas: 0, faltasEnRevision: 0, faltasInjustificadas: 1, conPermiso: 0, porcentaje: 50 };
    const tabla = tablaDeReporte({
      tipo: "colegio", colegio: "Colegio X", grado: { nivel: "primaria", grado: 3, nombre: "3.° grado de primaria" }, desde: "2026-10-26", hasta: "2026-10-27", hastaEfectivo: "2026-10-27",
      filas: [{ salonId: "a", salon: "3.° A", alumnos: 1, resumen }, { salonId: "b", salon: "3.° B", alumnos: 1, resumen }], total: resumen, porDia: [], cursos: null,
    });
    expect(tabla.titulo).toBe("Asistencia · 3.° grado de primaria");
    const { encabezados, filas } = filasCsvDeTabla("Colegio X", tabla);
    expect(encabezados).toEqual(["Colegio X"]);
    expect(filas.some((f) => f[0] === "Total del grado" && String(f.at(-1)).includes("50"))).toBe(true);
    expect(filas.find((f) => f[0] === "Salón")).toContain("Con permiso");
  });
});
