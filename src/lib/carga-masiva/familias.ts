// Archivo de familias de la carga masiva (specs/36): una fila por cada vínculo apoderado ↔ alumno. Pura y sin acceso a datos:
// la búsqueda del alumno, de cuentas existentes y de vínculos la completa `src/lib/server/carga-masiva.ts`.
import { z } from "zod";
import { normalizar } from "../importar-alumnos";
import { celda, columna, normalizarDocumento, ordenarPorLinea, tipoDocumentoDe, type ErrorFila, type Tabla } from "./tabla";

export type FilaFamilia = {
  linea: number;
  alumnoCodigo: string | null;
  alumnoDocumento: string | null;
  tipoDocumento: "dni" | "ce" | "pasaporte";
  documento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  celular: string | null;
  parentesco: string;
};

export type ResultadoArchivoFamilias = { filas: FilaFamilia[]; errores: ErrorFila[]; avisos: ErrorFila[] };

export const MAX_FILAS_FAMILIAS = 3000;
export const COLUMNAS_FAMILIAS = [
  "alumno_codigo", "alumno_dni", "apoderado_dni", "tipo_documento", "nombres", "apellidos", "correo", "celular", "parentesco",
] as const;

const correoValido = z.email();

/**
 * Lee el archivo de familias. Columnas: el alumno por `alumno_codigo` y/o `alumno_dni`; el apoderado con `apoderado_dni`
 * (o `dni`/`documento`), `tipo_documento` (opcional: dni, ce o pasaporte), `nombres`, `apellidos`, `correo`,
 * `celular` (opcional) y `parentesco`. Un mismo apoderado con varios hijos va en varias filas con el mismo correo y DNI.
 */
export function leerArchivoFamilias(tabla: Tabla): ResultadoArchivoFamilias {
  const errores: ErrorFila[] = [];
  const avisos: ErrorFila[] = [];
  const filas: FilaFamilia[] = [];
  const col = {
    codigo: columna(tabla, "alumno_codigo", "codigo_alumno", "codigo"),
    alumnoDoc: columna(tabla, "alumno_dni", "dni_alumno", "alumno_documento", "documento_alumno"),
    documento: columna(tabla, "apoderado_dni", "dni_apoderado", "apoderado_documento", "documento_apoderado", "dni", "documento"),
    tipo: columna(tabla, "tipo_documento", "apoderado_tipo_documento"),
    nombres: columna(tabla, "nombres", "apoderado_nombres"),
    apellidos: columna(tabla, "apellidos", "apoderado_apellidos"),
    correo: columna(tabla, "correo", "email", "correo_electronico", "apoderado_correo"),
    celular: columna(tabla, "celular", "telefono", "apoderado_celular"),
    parentesco: columna(tabla, "parentesco", "relacion"),
  };
  const faltantes = [
    ...(col.codigo === -1 && col.alumnoDoc === -1 ? ["alumno_codigo o alumno_dni"] : []),
    ...(col.documento === -1 ? ["apoderado_dni"] : []),
    ...(col.nombres === -1 ? ["nombres"] : []),
    ...(col.apellidos === -1 ? ["apellidos"] : []),
    ...(col.correo === -1 ? ["correo"] : []),
    ...(col.parentesco === -1 ? ["parentesco"] : []),
  ];
  if (faltantes.length > 0) {
    return { filas, errores: [{ linea: tabla.lineaEncabezado, mensaje: `Faltan las columnas: ${faltantes.join(", ")}. Usa: ${COLUMNAS_FAMILIAS.join(", ")}.` }], avisos };
  }
  if (tabla.filas.length > MAX_FILAS_FAMILIAS) {
    errores.push({ linea: tabla.filas[MAX_FILAS_FAMILIAS].linea, mensaje: `Máximo ${MAX_FILAS_FAMILIAS} filas por archivo: divide el archivo por nivel.` });
  }

  const docPorCorreo = new Map<string, { documento: string; linea: number }>();
  const correoPorDoc = new Map<string, { correo: string; linea: number }>();
  const pares = new Map<string, number>();

  for (const fila of tabla.filas.slice(0, MAX_FILAS_FAMILIAS)) {
    const { linea } = fila;
    const v = (i: number) => celda(fila, i);
    const alumnoCodigo = v(col.codigo) || null;
    let alumnoDocumento: string | null = null;
    if (v(col.alumnoDoc)) {
      const d = normalizarDocumento(v(col.alumnoDoc));
      const otro = d.ok ? d : normalizarDocumento(v(col.alumnoDoc), "ce");
      if (!otro.ok) {
        errores.push({ linea, mensaje: `DNI del alumno no válido: ${otro.mensaje}` });
        continue;
      }
      alumnoDocumento = otro.valor;
    }
    if (!alumnoCodigo && !alumnoDocumento) {
      errores.push({ linea, mensaje: "Falta el código o el DNI del alumno." });
      continue;
    }
    const tipoDocumento = tipoDocumentoDe(v(col.tipo));
    if (!tipoDocumento) {
      errores.push({ linea, mensaje: "El tipo de documento debe ser dni, ce o pasaporte." });
      continue;
    }
    const nombres = v(col.nombres);
    const apellidos = v(col.apellidos);
    const correo = v(col.correo).toLowerCase();
    const celular = v(col.celular) || null;
    const parentesco = normalizar(v(col.parentesco)) === "" ? "" : v(col.parentesco).toLowerCase();
    if (!v(col.documento)) {
      errores.push({ linea, mensaje: "Falta el DNI del apoderado." });
      continue;
    }
    const doc = normalizarDocumento(v(col.documento), tipoDocumento);
    if (!doc.ok) errores.push({ linea, mensaje: `Documento del apoderado no válido: ${doc.mensaje}` });
    else if (!nombres) errores.push({ linea, mensaje: "Faltan los nombres del apoderado." });
    else if (!apellidos) errores.push({ linea, mensaje: "Faltan los apellidos del apoderado." });
    else if (nombres.length > 80 || apellidos.length > 80) errores.push({ linea, mensaje: "Los nombres o apellidos son demasiado largos (máximo 80 caracteres)." });
    else if (!correo) errores.push({ linea, mensaje: "Falta el correo del apoderado." });
    else if (!correoValido.safeParse(correo).success) errores.push({ linea, mensaje: `El correo «${correo}» no es válido.` });
    else if (celular && !/^\+?[\d\s-]{6,20}$/.test(celular)) errores.push({ linea, mensaje: "El celular solo puede tener números (de 6 a 20)." });
    else if (!parentesco) errores.push({ linea, mensaje: "Falta el parentesco (madre, padre, tutor legal…)." });
    else if (parentesco.length > 30) errores.push({ linea, mensaje: "El parentesco es demasiado largo (máximo 30 caracteres)." });
    else {
      const previoDoc = docPorCorreo.get(correo);
      const previoCorreo = correoPorDoc.get(doc.valor);
      const par = `${alumnoCodigo ?? ""}|${alumnoDocumento ?? ""}|${correo}`;
      if (previoDoc && previoDoc.documento !== doc.valor) {
        errores.push({ linea, mensaje: `El correo ${correo} tiene otro documento en la línea ${previoDoc.linea}.` });
      } else if (previoCorreo && previoCorreo.correo !== correo) {
        errores.push({ linea, mensaje: `Ese documento tiene otro correo en la línea ${previoCorreo.linea} (${previoCorreo.correo}).` });
      } else if (pares.has(par)) {
        errores.push({ linea, mensaje: `Esta familia y este alumno se repiten (también en la línea ${pares.get(par)}).` });
      } else {
        if (doc.completado) avisos.push({ linea, mensaje: "Completamos el DNI del apoderado con ceros a la izquierda." });
        docPorCorreo.set(correo, { documento: doc.valor, linea });
        correoPorDoc.set(doc.valor, { correo, linea });
        pares.set(par, linea);
        filas.push({ linea, alumnoCodigo, alumnoDocumento, tipoDocumento, documento: doc.valor, nombres, apellidos, correo, celular, parentesco });
      }
    }
  }
  return { filas, errores: ordenarPorLinea(errores), avisos: ordenarPorLinea(avisos) };
}
