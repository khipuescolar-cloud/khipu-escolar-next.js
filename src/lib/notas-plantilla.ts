// Plantilla, importación y exportación del registro de notas (specs/47). Puro y sin acceso a datos.
//
// Una plantilla corresponde a UNA actividad: el nombre, la fecha y la competencia se piden en el formulario de importación
// y el archivo solo trae, por alumno, la nota y la observación. Encabezados: alumno_id;apellidos_nombres;nota;observacion.
import { interpretarEntradaNota, textoValor, type Escala } from "./calificaciones";
import { normalizar } from "./importar-alumnos";
import { celda, columna, type Tabla } from "./carga-masiva/tabla";

export const COLUMNAS_PLANTILLA = ["alumno_id", "apellidos_nombres", "nota", "observacion"] as const;
export const MAX_FILAS_PLANTILLA = 500;
export const MAX_OBSERVACION = 500;
const SEPARADOR = ";";

export type AlumnoPlantilla = { id: string; nombres: string; apellidos: string };
export type FilaImportable = { linea: number; alumnoId: string; alumno: string; nota: string; observacion: string };
export type ErrorFilaNotas = { linea: number; mensaje: string };
export type AnalisisArchivoNotas = { filas: FilaImportable[]; errores: ErrorFilaNotas[]; pendientes: number };

const nombreCompleto = (a: AlumnoPlantilla) => `${a.apellidos}, ${a.nombres}`;
const celdaCsv = (v: string): string => {
  const seguro = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v; // evita inyección de fórmulas
  return /[";\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};
const aCsv = (filas: string[][]) => "﻿" + filas.map((f) => f.map(celdaCsv).join(SEPARADOR)).join("\r\n") + "\r\n";

/** Plantilla CSV (UTF-8 con BOM, «;»): encabezado y una fila por alumno con `nota` y `observacion` vacías. */
export function plantillaCsv(alumnos: AlumnoPlantilla[]): string {
  return aCsv([[...COLUMNAS_PLANTILLA], ...alumnos.map((a) => [a.id, nombreCompleto(a), "", ""])]);
}

/**
 * Lee el archivo subido contra los alumnos del curso. Cada alumno se identifica por `alumno_id` o, si falta, por
 * «Apellidos, Nombres». Fila sin nota ni observación = pendiente. Observación sin nota = error. No guarda nada.
 */
export function analizarArchivoNotas(tabla: Tabla, contexto: { escala: Escala; alumnos: AlumnoPlantilla[] }): AnalisisArchivoNotas {
  const res: AnalisisArchivoNotas = { filas: [], errores: [], pendientes: 0 };
  const colId = columna(tabla, "alumno_id", "id", "codigo");
  const colNombre = columna(tabla, "apellidos_nombres", "alumno", "alumnos", "nombre", "estudiante");
  const colNota = columna(tabla, "nota", "calificacion");
  const colObs = columna(tabla, "observacion", "observaciones", "comentario");
  if (colNota === -1 || (colId === -1 && colNombre === -1)) {
    res.errores.push({ linea: tabla.lineaEncabezado, mensaje: "Faltan columnas. Descarga la plantilla del curso: debe tener alumno_id, apellidos_nombres, nota y observacion." });
    return res;
  }
  const porId = new Map(contexto.alumnos.map((a) => [a.id.toLowerCase(), a]));
  const porNombre = new Map<string, AlumnoPlantilla[]>();
  for (const a of contexto.alumnos) {
    for (const k of [nombreCompleto(a), `${a.nombres} ${a.apellidos}`, `${a.apellidos} ${a.nombres}`]) {
      const clave = normalizar(k).replace(/\s+/g, " ");
      porNombre.set(clave, [...(porNombre.get(clave) ?? []), a]);
    }
  }
  const vistos = new Set<string>();
  let contadas = 0;
  for (const fila of tabla.filas) {
    if (++contadas > MAX_FILAS_PLANTILLA) {
      res.errores.push({ linea: fila.linea, mensaje: `Máximo ${MAX_FILAS_PLANTILLA} alumnos por archivo.` });
      break;
    }
    const id = celda(fila, colId);
    const nombre = celda(fila, colNombre);
    const nota = celda(fila, colNota).replace(/^'/, "");
    const observacion = celda(fila, colObs).replace(/^'(?=[=+\-@])/, "");
    let alumno = id ? porId.get(id.toLowerCase()) : undefined;
    if (!alumno && id && !nombre) {
      res.errores.push({ linea: fila.linea, mensaje: `Alumno desconocido: el identificador «${id}» no es de este curso.` });
      continue;
    }
    if (!alumno && nombre) {
      const candidatos = porNombre.get(normalizar(nombre).replace(/\s+/g, " ")) ?? [];
      if (candidatos.length > 1) { res.errores.push({ linea: fila.linea, mensaje: `Hay más de un alumno que coincide con «${nombre}». Usa la plantilla con alumno_id.` }); continue; }
      alumno = candidatos[0];
    }
    if (!alumno) {
      res.errores.push({ linea: fila.linea, mensaje: `Alumno desconocido: «${nombre || id || "?"}» no está en este curso.` });
      continue;
    }
    if (vistos.has(alumno.id)) { res.errores.push({ linea: fila.linea, mensaje: `${nombreCompleto(alumno)} aparece dos veces en el archivo.` }); continue; }
    vistos.add(alumno.id);
    if (observacion.length > MAX_OBSERVACION) { res.errores.push({ linea: fila.linea, mensaje: `${nombreCompleto(alumno)}: la observación supera los ${MAX_OBSERVACION} caracteres.` }); continue; }
    if (!nota) {
      if (observacion) res.errores.push({ linea: fila.linea, mensaje: `${nombreCompleto(alumno)}: Pon una nota para guardar la observación.` });
      else res.pendientes++;
      continue;
    }
    const v = interpretarEntradaNota(contexto.escala, nota);
    if (!v.ok) { res.errores.push({ linea: fila.linea, mensaje: `${nombreCompleto(alumno)}: nota «${nota}» inválida. ${v.error}` }); continue; }
    res.filas.push({ linea: fila.linea, alumnoId: alumno.id, alumno: nombreCompleto(alumno), nota: nota.toUpperCase(), observacion });
  }
  return res;
}

export type ActividadExport = { id: string; titulo: string; fecha: string; competencia: string; notas: { alumnoId: string; texto: string; observacion: string | null; privada: boolean }[] };

/** CSV del registro (alumnos × actividades agrupadas por competencia): dos filas de encabezado y, por actividad, nota y observación. */
export function exportarRegistroCsv(datos: { alumnos: AlumnoPlantilla[]; actividades: ActividadExport[] }): string {
  const grupos = datos.actividades;
  const fila1 = ["", ...grupos.flatMap((a) => [a.competencia, ""])];
  const fila2 = ["Alumno", ...grupos.flatMap((a) => [`${a.titulo} (${a.fecha})`, "Observación"])];
  const cuerpo = datos.alumnos.map((al) => [
    nombreCompleto(al),
    ...grupos.flatMap((a) => {
      const n = a.notas.find((x) => x.alumnoId === al.id);
      return [n?.texto ?? "", n?.observacion ? (n.privada ? `[Privada] ${n.observacion}` : n.observacion) : ""];
    }),
  ]);
  return aCsv([fila1, fila2, ...cuerpo]);
}

export const textoNotaExport = (n: { valorLiteral: string | null; valorNumerico: number | null; marca: "nsp" | "no_entrego" | null }) =>
  n.valorLiteral || n.valorNumerico !== null || n.marca ? textoValor({ valorLiteral: n.valorLiteral as never, valorNumerico: n.valorNumerico, marca: n.marca }) : "";
