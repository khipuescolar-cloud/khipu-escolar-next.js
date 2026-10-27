// Exportar e importar notas en CSV compatible con Excel (specs/11). Puro y sin acceso a datos.
//
// Formato: UTF-8 con BOM, separador «;» (Excel en español), una fila por alumno:
//   Código;Alumno;<evaluación 1>;<evaluación 2>…
// Al importar se acepta «;», «,» o tabulación. Las celdas vacías NO borran notas.
import { interpretarValor, textoValor, type Escala, type ValorCalificacion } from "./calificaciones";
import { dividirLinea, normalizar } from "./importar-alumnos";

export const SEPARADOR_CSV_NOTAS = ";";
export const MAX_FILAS_NOTAS = 500;
export const MAX_BYTES_CSV_NOTAS = 512 * 1024;

export type AlumnoCsv = { id: string; nombres: string; apellidos: string; codigo: string | null };
export type EvaluacionCsv = { id: string; titulo: string };
export type NotaCsv = { evaluacionId: string; alumnoId: string; valorLiteral: ValorCalificacion["valorLiteral"]; valorNumerico: number | null };

const celda = (v: string): string => {
  const seguro = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v; // evita inyección de fórmulas
  return /[";\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

/** CSV de la rejilla de un curso y periodo (alumnos × evaluaciones). */
export function exportarNotasCsv(datos: { alumnos: AlumnoCsv[]; evaluaciones: EvaluacionCsv[]; notas: NotaCsv[] }): string {
  const porClave = new Map(datos.notas.map((n) => [`${n.evaluacionId}:${n.alumnoId}`, n]));
  const encabezado = ["Código", "Alumno", ...datos.evaluaciones.map((e) => e.titulo)];
  const filas = datos.alumnos.map((a) => [
    a.codigo ?? "",
    `${a.apellidos}, ${a.nombres}`,
    ...datos.evaluaciones.map((e) => {
      const n = porClave.get(`${e.id}:${a.id}`);
      return n ? textoValor({ valorLiteral: n.valorLiteral, valorNumerico: n.valorNumerico }) : "";
    }),
  ]);
  return "﻿" + [encabezado, ...filas].map((f) => f.map(celda).join(SEPARADOR_CSV_NOTAS)).join("\r\n") + "\r\n";
}

export type CambioNota = {
  linea: number;
  alumnoId: string;
  alumno: string;
  evaluacionId: string;
  evaluacion: string;
  /** Texto original de la celda (para mostrar en la vista previa). */
  texto: string;
  valor: ValorCalificacion;
};
export type ErrorNotasCsv = { linea: number; mensaje: string };
export type ResultadoNotasCsv = {
  cambios: CambioNota[];
  errores: ErrorNotasCsv[];
  /** Columnas del archivo que no corresponden a ninguna evaluación del periodo (se ignoran). */
  columnasIgnoradas: string[];
  /** Celdas vacías (no cambian nada). */
  vacias: number;
};

function separadorDe(linea: string): string {
  const cuentas: [string, number][] = [[";", 0], [",", 0], ["\t", 0]];
  for (const par of cuentas) par[1] = linea.split(par[0]).length - 1;
  return cuentas.sort((a, b) => b[1] - a[1])[0][1] === 0 ? ";" : cuentas[0][0];
}

const limpiar = (t: string) => t.replace(/^'(?=[=+\-@])/, "").trim();

/** Analiza el CSV contra los alumnos y evaluaciones del curso. No guarda nada. */
export function analizarNotasCsv(
  texto: string,
  contexto: { escala: Escala; alumnos: AlumnoCsv[]; evaluaciones: EvaluacionCsv[] },
): ResultadoNotasCsv {
  const res: ResultadoNotasCsv = { cambios: [], errores: [], columnasIgnoradas: [], vacias: 0 };
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/);
  const primera = lineas.findIndex((l) => l.trim() !== "");
  if (primera === -1) {
    res.errores.push({ linea: 1, mensaje: "El archivo está vacío." });
    return res;
  }
  const sep = separadorDe(lineas[primera]);
  const encabezado = dividirLinea(lineas[primera], sep).map(limpiar);
  const norm = encabezado.map(normalizar);
  const colCodigo = norm.findIndex((h) => h === "codigo");
  const colAlumno = norm.findIndex((h) => ["alumno", "alumnos", "nombre", "estudiante"].includes(h));
  if (colCodigo === -1 && colAlumno === -1) {
    res.errores.push({ linea: primera + 1, mensaje: "Falta la columna «Código» o «Alumno». Descarga el CSV del curso y úsalo como base." });
    return res;
  }

  // Columnas de evaluación: por título (sin tildes ni mayúsculas).
  const porTitulo = new Map<string, EvaluacionCsv[]>();
  for (const e of contexto.evaluaciones) porTitulo.set(normalizar(e.titulo), [...(porTitulo.get(normalizar(e.titulo)) ?? []), e]);
  const columnas: { indice: number; evaluacion: EvaluacionCsv }[] = [];
  encabezado.forEach((h, i) => {
    if (i === colCodigo || i === colAlumno || h === "") return;
    const candidatas = porTitulo.get(norm[i]) ?? [];
    if (candidatas.length === 1) columnas.push({ indice: i, evaluacion: candidatas[0] });
    else if (candidatas.length > 1) res.errores.push({ linea: primera + 1, mensaje: `Hay varias evaluaciones llamadas «${h}»; cámbiales el título para poder importar.` });
    else res.columnasIgnoradas.push(h);
  });
  if (columnas.length === 0) {
    res.errores.push({ linea: primera + 1, mensaje: "Ninguna columna coincide con las evaluaciones de este curso y periodo." });
    return res;
  }

  const porCodigo = new Map<string, AlumnoCsv[]>();
  const porNombre = new Map<string, AlumnoCsv[]>();
  const agregar = (m: Map<string, AlumnoCsv[]>, k: string, a: AlumnoCsv) => {
    if (k) m.set(k, [...(m.get(k) ?? []), a]);
  };
  for (const a of contexto.alumnos) {
    agregar(porCodigo, normalizar(a.codigo ?? ""), a);
    for (const k of [`${a.apellidos}, ${a.nombres}`, `${a.nombres} ${a.apellidos}`, `${a.apellidos} ${a.nombres}`]) agregar(porNombre, normalizar(k).replace(/\s+/g, " "), a);
  }

  const vistos = new Set<string>();
  let filas = 0;
  for (let i = primera + 1; i < lineas.length; i++) {
    if (lineas[i].trim() === "") continue;
    const linea = i + 1;
    if (++filas > MAX_FILAS_NOTAS) {
      res.errores.push({ linea, mensaje: `Máximo ${MAX_FILAS_NOTAS} alumnos por archivo.` });
      break;
    }
    const c = dividirLinea(lineas[i], sep).map(limpiar);
    const codigo = colCodigo >= 0 ? normalizar(c[colCodigo] ?? "") : "";
    const nombre = colAlumno >= 0 ? normalizar(c[colAlumno] ?? "").replace(/\s+/g, " ") : "";
    let candidatos = codigo ? porCodigo.get(codigo) : undefined;
    if (!candidatos?.length && nombre) candidatos = porNombre.get(nombre);
    if (!candidatos?.length) {
      res.errores.push({ linea, mensaje: `No encontramos al alumno «${c[colAlumno] || c[colCodigo] || "?"}» en este curso.` });
      continue;
    }
    if (candidatos.length > 1) {
      res.errores.push({ linea, mensaje: `Hay más de un alumno que coincide con «${c[colAlumno] || c[colCodigo]}». Usa el código.` });
      continue;
    }
    const alumno = candidatos[0];
    if (vistos.has(alumno.id)) {
      res.errores.push({ linea, mensaje: `${alumno.apellidos}, ${alumno.nombres} aparece dos veces en el archivo.` });
      continue;
    }
    vistos.add(alumno.id);
    for (const { indice, evaluacion } of columnas) {
      const t = c[indice] ?? "";
      if (t === "") {
        res.vacias++;
        continue;
      }
      const v = interpretarValor(contexto.escala, t);
      if (!v.ok) res.errores.push({ linea, mensaje: `${alumno.apellidos}, ${alumno.nombres} · ${evaluacion.titulo}: «${t}». ${v.error}` });
      else if (v.valor) {
        res.cambios.push({
          linea, alumnoId: alumno.id, alumno: `${alumno.apellidos}, ${alumno.nombres}`,
          evaluacionId: evaluacion.id, evaluacion: evaluacion.titulo, texto: t, valor: v.valor,
        });
      }
    }
  }
  return res;
}
