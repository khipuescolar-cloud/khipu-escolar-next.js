import "server-only";
import ExcelJS from "exceljs";
import { tablaDeConsolidado, type Consolidado } from "@/lib/tablero-consolidado";

/** Libro de Excel del consolidado: cabecera del colegio, fila de cursos, fila de competencias, alumnos y % de logro esperado. */
export async function consolidadoAExcel(consolidado: Consolidado): Promise<Buffer> {
  const t = tablaDeConsolidado(consolidado);
  const libro = new ExcelJS.Workbook();
  libro.creator = consolidado.colegio;
  libro.created = new Date();
  const hoja = libro.addWorksheet("Consolidado", { views: [{ state: "frozen", xSplit: 1, ySplit: 6 }] });
  const ancho = t.columnas.length;

  const texto = (valor: string, tamano: number, negrita = false) => {
    const fila = hoja.addRow([valor]);
    hoja.mergeCells(fila.number, 1, fila.number, Math.max(ancho, 2));
    fila.getCell(1).font = { size: tamano, bold: negrita, color: { argb: negrita ? "FF1E2A78" : "FF5B6170" } };
    fila.getCell(1).alignment = { wrapText: true, vertical: "top" };
    return fila;
  };
  texto(consolidado.colegio, 14, true);
  texto(t.titulo, 12, true);
  texto(t.subtitulo, 10);
  texto(t.nota, 9).height = 28;

  const cabecera = (fila: ExcelJS.Row) =>
    fila.eachCell({ includeEmpty: true }, (c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E2A78" } };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
  // Fila de cursos (combinada por curso) y fila de competencias.
  const filaCursos = hoja.addRow(["", ...t.grupos.flatMap((g) => [g.texto, ...Array<string>(g.columnas - 1).fill("")]), ...Array<string>(ancho - 1 - t.grupos.reduce((s, g) => s + g.columnas, 0)).fill("")]);
  let col = 2;
  for (const g of t.grupos) {
    if (g.columnas > 1) hoja.mergeCells(filaCursos.number, col, filaCursos.number, col + g.columnas - 1);
    col += g.columnas;
  }
  cabecera(filaCursos);
  const filaCab = hoja.addRow(t.columnas);
  cabecera(filaCab);
  filaCab.height = 48;

  const vigesimal = consolidado.escala === "vigesimal";
  const colResumen = 1 + t.leyenda.length; // índice (0) de la primera columna posterior a las competencias
  for (const f of t.filas) {
    const fila = hoja.addRow(f);
    fila.eachCell({ includeEmpty: true }, (c, n) => {
      if (n > 1) c.alignment = { horizontal: "center" };
      c.border = { bottom: { style: "thin", color: { argb: "FFE4E1DA" } } };
      if (vigesimal && n === colResumen + 1 && typeof c.value === "number") c.numFmt = "0.0";
    });
  }
  const pie = hoja.addRow(t.pie.map((v, i) => (i > 0 && typeof v === "number" ? v / 100 : v)));
  pie.eachCell({ includeEmpty: true }, (c, n) => {
    c.font = { bold: true };
    c.border = { top: { style: "thin", color: { argb: "FF1E2A78" } } };
    if (n > 1) c.alignment = { horizontal: "center" };
    if (n > 1 && n <= colResumen && typeof c.value === "number") c.numFmt = "0.0%";
  });
  hoja.columns.forEach((c, i) => {
    c.width = i === 0 ? 30 : 16;
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}
