// Tabla genérica de la carga masiva (specs/36): CSV o XLSX → filas de texto con su número de línea. Pura y sin acceso a datos.
import { dividirLinea, normalizar, type ErrorFila } from "../importar-alumnos";

export type { ErrorFila };

/** Una fila del archivo: `linea` es la del archivo (1 = encabezado si está arriba), `celdas` ya recortadas. */
export type FilaTabla = { linea: number; celdas: string[] };
/** Encabezado normalizado (sin tildes, minúsculas, espacios → «_») y las filas de datos no vacías. */
export type Tabla = { encabezado: string[]; encabezadoOriginal: string[]; lineaEncabezado: number; filas: FilaTabla[] };

/** Archivos de hasta 3 MB (un colegio de ~1 000 alumnos ocupa ~250 KB en CSV). */
export const MAX_BYTES_CARGA = 3_000_000;

/** «Correo electrónico» → «correo_electronico»; «Año» → «anio». */
export function normalizarEncabezado(s: string): string {
  return normalizar(s.replace(/ñ/gi, "ni")).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Arma la tabla desde filas crudas (la primera no vacía es el encabezado). */
export function tablaDesdeFilas(filas: FilaTabla[]): Tabla | null {
  const conDatos = filas.filter((f) => f.celdas.some((c) => c.trim() !== ""));
  if (conDatos.length === 0) return null;
  const [cabecera, ...resto] = conDatos;
  const encabezadoOriginal = cabecera.celdas.map((c) => c.trim());
  return {
    encabezado: encabezadoOriginal.map(normalizarEncabezado),
    encabezadoOriginal,
    lineaEncabezado: cabecera.linea,
    filas: resto.map((f) => ({ linea: f.linea, celdas: f.celdas.map((c) => c.trim()) })),
  };
}

/** CSV con «,» o «;» (Excel en español guarda con «;»), con o sin BOM. */
export function tablaDesdeCsv(texto: string): Tabla | null {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/);
  const primera = lineas.find((l) => l.trim() !== "") ?? "";
  const separador = primera.split(";").length > primera.split(",").length ? ";" : ",";
  return tablaDesdeFilas(lineas.map((l, i) => ({ linea: i + 1, celdas: l.trim() === "" ? [] : dividirLinea(l, separador) })));
}

/** Busca la primera columna con alguno de los nombres (ya normalizados). -1 si no está. */
export function columna(tabla: Tabla, ...nombres: string[]): number {
  for (const n of nombres) {
    const i = tabla.encabezado.indexOf(n);
    if (i !== -1) return i;
  }
  return -1;
}

export const celda = (fila: FilaTabla, indice: number): string => (indice === -1 ? "" : (fila.celdas[indice] ?? "").trim());

/** Documento de identidad: DNI de 8 dígitos (Excel suele quitar los ceros de la izquierda: se completan) o CE/pasaporte de 8 a 12. */
export function normalizarDocumento(valor: string, tipo: string = "dni"): { ok: true; valor: string; completado: boolean } | { ok: false; mensaje: string } {
  const v = valor.replace(/[\s.-]/g, "");
  if (tipo === "dni") {
    if (/^\d{8}$/.test(v)) return { ok: true, valor: v, completado: false };
    if (/^\d{5,7}$/.test(v)) return { ok: true, valor: v.padStart(8, "0"), completado: true };
    return { ok: false, mensaje: "El DNI debe tener 8 dígitos." };
  }
  if (/^[A-Za-z0-9]{8,12}$/.test(v)) return { ok: true, valor: v.toUpperCase(), completado: false };
  return { ok: false, mensaje: "El documento debe tener entre 8 y 12 letras o números." };
}

export function tipoDocumentoDe(valor: string): "dni" | "ce" | "pasaporte" | null {
  const v = normalizarEncabezado(valor);
  if (!v || v === "dni") return "dni";
  if (v === "ce" || v.startsWith("carne")) return "ce";
  if (v.startsWith("pasaporte")) return "pasaporte";
  return null;
}

/** Profesor o tutor indicado por correo o documento. */
export function referenciaPersona(valor: string): { tipo: "correo"; valor: string } | { tipo: "documento"; valor: string } | null {
  const v = valor.trim();
  if (!v) return null;
  if (v.includes("@")) return { tipo: "correo", valor: v.toLowerCase() };
  const doc = normalizarDocumento(v);
  if (doc.ok) return { tipo: "documento", valor: doc.valor };
  const otro = normalizarDocumento(v, "ce");
  return otro.ok ? { tipo: "documento", valor: otro.valor } : null;
}

export const ordenarPorLinea = (errores: ErrorFila[]) => errores.sort((a, b) => a.linea - b.linea);

/** Parte un arreglo en lotes (consultas `in` y `createMany` por debajo del límite de 32 767 parámetros de Postgres). */
export function enLotes<T>(lista: T[], tamano = 1000): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano));
  return lotes;
}
