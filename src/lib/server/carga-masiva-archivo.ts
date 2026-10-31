import "server-only";
import ExcelJS from "exceljs";
import { MAX_BYTES_CARGA, tablaDesdeCsv, tablaDesdeFilas, type Tabla } from "@/lib/carga-masiva/tabla";
import { plantillaCarga, type TipoCarga } from "@/lib/carga-masiva/plantillas";
import { ErrorDeNegocio } from "./contexto-accion";

// Archivos de la carga masiva (specs/36): lectura de CSV o XLSX y plantillas en Excel.

export const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function textoDeCelda(valor: ExcelJS.CellValue, texto: string): string {
  if (valor == null) return "";
  if (typeof valor === "number") return Number.isInteger(valor) ? String(valor) : String(valor);
  if (typeof valor === "string") return valor;
  if (typeof valor === "boolean") return valor ? "sí" : "no";
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "object" && "result" in valor) return valor.result == null ? "" : String(valor.result);
  return texto ?? "";
}

/** Primera hoja llamada «Datos» o, si no hay, la primera que no sea de instrucciones. */
export async function tablaDesdeXlsx(contenido: ArrayBuffer): Promise<Tabla | null> {
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(contenido);
  } catch {
    throw new ErrorDeNegocio("No pudimos leer el Excel. Guárdalo de nuevo como .xlsx o como CSV.");
  }
  const hoja = libro.worksheets.find((h) => h.name.trim().toLowerCase() === "datos") ?? libro.worksheets.find((h) => !/instruc/i.test(h.name));
  if (!hoja) return null;
  const filas: { linea: number; celdas: string[] }[] = [];
  hoja.eachRow({ includeEmpty: false }, (fila, numero) => {
    const celdas: string[] = [];
    fila.eachCell({ includeEmpty: true }, (c, col) => {
      celdas[col - 1] = textoDeCelda(c.value, c.text).trim();
    });
    filas.push({ linea: numero, celdas: Array.from(celdas, (c) => c ?? "") });
  });
  return tablaDesdeFilas(filas);
}

/** Lee el archivo subido (CSV o XLSX, máx. 3 MB). Lanza `ErrorDeNegocio` con un mensaje para la persona. */
export async function leerArchivoCarga(archivo: unknown): Promise<Tabla> {
  if (!(archivo instanceof File) || archivo.size === 0) throw new ErrorDeNegocio("Elige un archivo CSV o Excel (.xlsx).");
  if (archivo.size > MAX_BYTES_CARGA) throw new ErrorDeNegocio("El archivo es demasiado grande (máximo 3 MB). Divídelo por nivel.");
  const contenido = await archivo.arrayBuffer();
  const bytes = new Uint8Array(contenido.slice(0, 4));
  const esZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (/\.xls$/i.test(archivo.name)) throw new ErrorDeNegocio("Los archivos .xls antiguos no se admiten: guárdalo como .xlsx o como CSV.");
  const tabla = esZip ? await tablaDesdeXlsx(contenido) : tablaDesdeCsv(new TextDecoder("utf-8").decode(contenido));
  if (!tabla || tabla.filas.length === 0) throw new ErrorDeNegocio("El archivo no tiene filas con datos (debajo del encabezado).");
  return tabla;
}

/** Plantilla .xlsx: hoja «Instrucciones» y hoja «Datos» con el encabezado y filas de ejemplo (columnas de DNI como texto). */
export async function plantillaXlsx(tipo: TipoCarga, anio: number): Promise<Buffer> {
  const p = plantillaCarga(tipo, anio);
  const libro = new ExcelJS.Workbook();
  libro.creator = "Khipu Escolar";
  const datos = libro.addWorksheet("Datos", { views: [{ state: "frozen", ySplit: 1 }] });
  datos.columns = p.encabezados.map((h) => ({ header: h, key: h, width: Math.max(14, h.length + 4), style: p.columnasTexto.includes(h) ? { numFmt: "@" } : {} }));
  datos.getRow(1).font = { bold: true, color: { argb: "FF1E2A78" } };
  for (const fila of p.ejemplos) datos.addRow(fila);
  const instrucciones = libro.addWorksheet("Instrucciones");
  instrucciones.getColumn(1).width = 120;
  instrucciones.addRow([`Khipu Escolar · Plantilla de ${p.titulo.toLowerCase()}`]).font = { bold: true, size: 14, color: { argb: "FF1E2A78" } };
  instrucciones.addRow(["Reemplaza las filas de ejemplo de la hoja «Datos» (son ficticias) y súbela en Gestión → Carga masiva."]);
  instrucciones.addRow([]);
  for (const t of p.instrucciones) instrucciones.addRow([`• ${t}`]).alignment = { wrapText: true, vertical: "top" };
  instrucciones.addRow([]);
  instrucciones.addRow([`Columnas: ${p.encabezados.join(", ")}`]).font = { italic: true };
  return Buffer.from(await libro.xlsx.writeBuffer());
}
