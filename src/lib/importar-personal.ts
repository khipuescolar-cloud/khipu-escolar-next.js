// Lectura y validación estructural del CSV de profesores y personal. Pura y sin acceso a datos.
// La validación de negocio (DNI, correo, roles, cuentas existentes) la completa `importarPersonalCsv` en el servidor.
import { dividirLinea, normalizar, type ErrorFila } from "./importar-alumnos";

export type FilaPersonal = {
  linea: number;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  email: string;
  telefono: string;
  genero: string;
  fechaNacimiento: string;
  direccion: string;
  cargo: string;
  /** Solo en el CSV de personal: «administrativo» o «porteria». */
  rol: string;
};
export type ResultadoCsvPersonal = { filas: FilaPersonal[]; errores: ErrorFila[] };

export const MAX_FILAS_PERSONAL = 200;
const OBLIGATORIAS = ["nombres", "apellidos", "documento", "correo"] as const;
const OPCIONALES = ["tipo_documento", "telefono", "genero", "fecha_nacimiento", "direccion", "cargo", "rol"] as const;

export function encabezadoPersonal(tipo: "profesores" | "personal"): string {
  return [...OBLIGATORIAS, ...OPCIONALES.filter((c) => tipo === "personal" || c !== "rol")].join(",");
}

export function leerCsvPersonal(texto: string, tipo: "profesores" | "personal"): ResultadoCsvPersonal {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/);
  const filas: FilaPersonal[] = [];
  const errores: ErrorFila[] = [];
  const primera = lineas.findIndex((l) => l.trim() !== "");
  if (primera === -1) return { filas, errores: [{ linea: 1, mensaje: "El archivo está vacío." }] };

  const separador = lineas[primera].includes(";") && !lineas[primera].includes(",") ? ";" : ",";
  const encabezado = dividirLinea(lineas[primera], separador).map(normalizar);
  const col = (c: string) => encabezado.indexOf(c);
  const faltantes = OBLIGATORIAS.filter((c) => col(c) === -1);
  if (tipo === "personal" && col("rol") === -1) faltantes.push("rol" as never);
  if (faltantes.length > 0) {
    return { filas, errores: [{ linea: primera + 1, mensaje: `Faltan las columnas: ${faltantes.join(", ")}. Usa: ${encabezadoPersonal(tipo)}.` }] };
  }

  const correos = new Map<string, number>();
  const documentos = new Map<string, number>();
  for (let i = primera + 1; i < lineas.length; i++) {
    if (lineas[i].trim() === "") continue;
    const linea = i + 1;
    if (filas.length + errores.length >= MAX_FILAS_PERSONAL) {
      errores.push({ linea, mensaje: `Máximo ${MAX_FILAS_PERSONAL} personas por archivo.` });
      break;
    }
    const celdas = dividirLinea(lineas[i], separador);
    const v = (c: string) => (col(c) === -1 ? "" : (celdas[col(c)] ?? ""));
    const fila: FilaPersonal = {
      linea,
      nombres: v("nombres"),
      apellidos: v("apellidos"),
      tipoDocumento: normalizar(v("tipo_documento")) || "dni",
      numeroDocumento: v("documento"),
      email: v("correo").toLowerCase(),
      telefono: v("telefono"),
      genero: normalizar(v("genero")),
      fechaNacimiento: v("fecha_nacimiento"),
      direccion: v("direccion"),
      cargo: v("cargo"),
      rol: tipo === "personal" ? normalizar(v("rol")) : "profesor",
    };
    const email = fila.email;
    if (!fila.nombres) errores.push({ linea, mensaje: "Falta el nombre." });
    else if (!fila.apellidos) errores.push({ linea, mensaje: "Faltan los apellidos." });
    else if (!fila.numeroDocumento) errores.push({ linea, mensaje: "Falta el documento." });
    else if (!email) errores.push({ linea, mensaje: "Falta el correo." });
    else if (tipo === "personal" && fila.rol !== "administrativo" && fila.rol !== "porteria") errores.push({ linea, mensaje: "El rol debe ser «administrativo» o «porteria»." });
    else if (correos.has(email)) errores.push({ linea, mensaje: `El correo ${email} se repite (también en la línea ${correos.get(email)}).` });
    else if (documentos.has(fila.numeroDocumento)) errores.push({ linea, mensaje: `El documento se repite (también en la línea ${documentos.get(fila.numeroDocumento)}).` });
    else {
      correos.set(email, linea);
      documentos.set(fila.numeroDocumento, linea);
      filas.push(fila);
    }
  }
  return { filas, errores };
}
