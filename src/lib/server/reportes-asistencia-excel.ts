import "server-only";
import ExcelJS from "exceljs";
import { tablaDeReporte } from "@/lib/reportes-asistencia-tabla";
import type { ReporteAsistencia } from "./reportes-asistencia";

export const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Libro de Excel (.xlsx) del reporte: una hoja con cabecera del colegio, la tabla y el total. */
export async function reporteAExcel(reporte: ReporteAsistencia): Promise<Buffer> {
  const tabla = tablaDeReporte(reporte);
  const libro = new ExcelJS.Workbook();
  libro.creator = reporte.colegio;
  libro.created = new Date();
  const hoja = libro.addWorksheet("Asistencia", { views: [{ state: "frozen", ySplit: 0 }] });
  const ancho = Math.max(...tabla.secciones.map((s) => s.columnas.length));

  const texto = (valor: string, tamano: number, negrita = false) => {
    const fila = hoja.addRow([valor]);
    hoja.mergeCells(fila.number, 1, fila.number, ancho);
    fila.getCell(1).font = { size: tamano, bold: negrita, color: { argb: negrita ? "FF1E2A78" : "FF5B6170" } };
    fila.getCell(1).alignment = { wrapText: true, vertical: "top" };
    return fila;
  };
  texto(reporte.colegio, 14, true);
  texto(tabla.titulo, 12, true);
  texto(tabla.subtitulo, 10);
  texto(tabla.nota, 9).height = 28;

  for (const seccion of tabla.secciones) {
    hoja.addRow([]);
    texto(seccion.titulo, 11, true);
    const cab = hoja.addRow(seccion.columnas);
    cab.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E2A78" } };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    const agregar = (celdas: (string | number | null)[], negrita: boolean) => {
      const fila = hoja.addRow(celdas.map((c, i) => (seccion.columnasPorcentaje.includes(i) ? (typeof c === "number" ? c / 100 : "Sin datos") : c)));
      fila.eachCell({ includeEmpty: true }, (c, col) => {
        const i = col - 1;
        if (negrita) c.font = { bold: true };
        if (seccion.columnasPorcentaje.includes(i)) c.numFmt = "0.0%";
        if (typeof c.value === "number" || seccion.columnasPorcentaje.includes(i)) c.alignment = { horizontal: "right" };
        c.border = { bottom: { style: "thin", color: { argb: "FFE4E1DA" } } };
      });
    };
    for (const f of seccion.filas) agregar(f, false);
    if (seccion.total) agregar(seccion.total, true);
  }
  hoja.columns.forEach((col, i) => {
    col.width = i === 0 ? 24 : 16;
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}
