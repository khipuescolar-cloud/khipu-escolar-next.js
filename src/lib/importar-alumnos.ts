// Lectura y validación del CSV de alumnos (nombres, apellidos, codigo, salon). Pura y sin acceso a datos.

export type FilaAlumno = { linea: number; nombres: string; apellidos: string; codigo: string | null; salon: string };
export type ErrorFila = { linea: number; mensaje: string };
export type ResultadoCsv = { filas: FilaAlumno[]; errores: ErrorFila[] };

export const MAX_FILAS_CSV = 500;
const COLUMNAS = ["nombres", "apellidos", "codigo", "salon"] as const;

/** Divide una línea CSV respetando comillas dobles. Acepta «,» o «;» como separador. */
export function dividirLinea(linea: string, separador: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (entreComillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') entreComillas = false;
      else actual += c;
    } else if (c === '"') entreComillas = true;
    else if (c === separador) {
      celdas.push(actual.trim());
      actual = "";
    } else actual += c;
  }
  celdas.push(actual.trim());
  return celdas;
}

export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

export function leerCsvAlumnos(texto: string): ResultadoCsv {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/);
  const filas: FilaAlumno[] = [];
  const errores: ErrorFila[] = [];
  const primera = lineas.findIndex((l) => l.trim() !== "");
  if (primera === -1) return { filas, errores: [{ linea: 1, mensaje: "El archivo está vacío." }] };

  const separador = lineas[primera].includes(";") && !lineas[primera].includes(",") ? ";" : ",";
  const encabezado = dividirLinea(lineas[primera], separador).map(normalizar);
  const indice = Object.fromEntries(COLUMNAS.map((c) => [c, encabezado.indexOf(c)])) as Record<(typeof COLUMNAS)[number], number>;
  const faltantes = COLUMNAS.filter((c) => indice[c] === -1);
  if (faltantes.length > 0) {
    return { filas, errores: [{ linea: primera + 1, mensaje: `Faltan las columnas: ${faltantes.join(", ")}. Usa: nombres, apellidos, codigo, salon.` }] };
  }

  const codigos = new Map<string, number>();
  for (let i = primera + 1; i < lineas.length; i++) {
    if (lineas[i].trim() === "") continue;
    const linea = i + 1;
    if (filas.length + errores.length >= MAX_FILAS_CSV) {
      errores.push({ linea, mensaje: `Máximo ${MAX_FILAS_CSV} alumnos por archivo.` });
      break;
    }
    const celdas = dividirLinea(lineas[i], separador);
    const nombres = celdas[indice.nombres] ?? "";
    const apellidos = celdas[indice.apellidos] ?? "";
    const codigo = (celdas[indice.codigo] ?? "") || null;
    const salon = celdas[indice.salon] ?? "";
    if (!nombres) errores.push({ linea, mensaje: "Falta el nombre." });
    else if (!apellidos) errores.push({ linea, mensaje: "Faltan los apellidos." });
    else if (!salon) errores.push({ linea, mensaje: "Falta el salón." });
    else if (nombres.length > 80 || apellidos.length > 120 || (codigo && codigo.length > 40)) errores.push({ linea, mensaje: "Algún dato es demasiado largo." });
    else if (codigo && codigos.has(codigo)) errores.push({ linea, mensaje: `El código ${codigo} se repite (también en la línea ${codigos.get(codigo)}).` });
    else {
      if (codigo) codigos.set(codigo, linea);
      filas.push({ linea, nombres, apellidos, codigo, salon });
    }
  }
  return { filas, errores };
}
