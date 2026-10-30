import { renderToBuffer } from "@react-pdf/renderer";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { resumirAlumno } from "@/lib/reportes-asistencia";
import type { ReporteAsistencia } from "@/lib/server/reportes-asistencia";
import { reporteAExcel } from "@/lib/server/reportes-asistencia-excel";
import { ReporteAsistenciaPdf } from "@/lib/server/reportes-asistencia-pdf";

const resumen = resumirAlumno(["2026-03-02", "2026-03-03"], [
  { fecha: "2026-03-02", ambito: "dia", hora: "07:50", estado: "llego" },
  { fecha: "2026-03-03", ambito: "dia", hora: "08:30", estado: "falta", justificacion: "aceptada" },
]);
const base = { colegio: "Colegio Prueba", desde: "2026-03-02", hasta: "2026-03-06", hastaEfectivo: "2026-03-06" };
const reportes: ReporteAsistencia[] = [
  { ...base, tipo: "salon", salon: { id: "s", nombre: "3.° B" }, filas: [{ alumnoId: "a", nombres: "Mateo", apellidos: "Quispe", codigo: "M-1", resumen: resumen.resumen }], total: resumen.resumen, porDia: [] },
  { ...base, tipo: "alumno", alumno: { id: "a", nombres: "Mateo", apellidos: "Quispe", codigo: null, salonId: "s", salon: "3.° B" }, resumen: resumen.resumen, detalle: resumen.detalle },
  {
    ...base, tipo: "colegio", filas: [{ salonId: "s", salon: "3.° B", alumnos: 1, resumen: resumen.resumen }], total: resumen.resumen, porDia: [],
    cursos: [{ salonId: "s", salon: "3.° B", cursoId: "c", curso: "Matemática", registros: 10, faltas: 2, faltasConIngreso: 1, tardanzas: 1 }],
  },
];

describe("exportación de reportes de asistencia", () => {
  it.each(reportes.map((r) => [r.tipo, r] as const))("genera un .xlsx válido (%s) con el porcentaje numérico", async (_t, reporte) => {
    const buffer = await reporteAExcel(reporte);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buffer as never);
    const hoja = libro.getWorksheet("Asistencia")!;
    expect(JSON.stringify(hoja.getSheetValues())).toContain("Colegio Prueba");
    let hallado = false;
    hoja.eachRow((fila) => fila.eachCell((c) => { if (c.value === 0.5 && c.numFmt === "0.0%") hallado = true; }));
    expect(hallado).toBe(true);
  });

  it("el resumen del colegio exporta la sección «Asistencia por curso» con las faltas de quien ingresó", async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await reporteAExcel(reportes[2])) as never);
    const valores = JSON.stringify(libro.getWorksheet("Asistencia")!.getSheetValues());
    expect(valores).toContain("Asistencia por curso");
    expect(valores).toContain("Ingresó pero faltó a clase");
    expect(valores).toContain("Matemática");
  });

  it.each(reportes.map((r) => [r.tipo, r] as const))("genera un PDF válido (%s)", async (_t, reporte) => {
    const pdf = await renderToBuffer(ReporteAsistenciaPdf({ reporte }));
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
