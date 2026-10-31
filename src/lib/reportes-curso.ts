// Historial de asistencia de un curso (specs/27): alumnos × fechas de clase. Lógica pura (servidor, Excel/PDF y pruebas).
import { porcentajeAsistencia, type EstadoRegistro } from "@/lib/reportes-asistencia";

export type ResumenCurso = {
  /** Clases dictadas en el rango (fechas con al menos un registro de esta lista). */
  clases: number;
  llego: number;
  tarde: number;
  falta: number;
  problema: number;
  /** Clases en las que el alumno no tiene registro (p. ej. aún no estaba en el salón). */
  sinRegistro: number;
  /** (llegó + tarde) / clases con registro × 100, con un decimal; null sin registros. */
  porcentaje: number | null;
};

export type FilaCurso = { alumnoId: string; nombres: string; apellidos: string; codigo: string | null; estados: (EstadoRegistro | null)[]; resumen: ResumenCurso };
export type ConteoClase = { fecha: string; llego: number; tarde: number; falta: number; problema: number; sinRegistro: number };

const vacio = (clases: number): ResumenCurso => ({ clases, llego: 0, tarde: 0, falta: 0, problema: 0, sinRegistro: 0, porcentaje: null });

function cerrar(r: ResumenCurso): ResumenCurso {
  const conRegistro = r.llego + r.tarde + r.falta + r.problema;
  return { ...r, porcentaje: porcentajeAsistencia(r.llego + r.tarde, conRegistro) };
}

/**
 * Arma la matriz del curso. Las fechas de clase son las que tienen algún registro de la lista (en orden); cada alumno
 * tiene un estado por fecha (o null). Devuelve también el total del curso y el conteo por clase.
 */
export function resumirCurso(
  alumnos: readonly { id: string; nombres: string; apellidos: string; codigo: string | null }[],
  registros: readonly { alumnoId: string; fecha: string; estado: EstadoRegistro }[],
): { fechas: string[]; filas: FilaCurso[]; total: ResumenCurso; porFecha: ConteoClase[] } {
  const fechas = [...new Set(registros.map((r) => r.fecha))].sort();
  const estadoDe = new Map(registros.map((r) => [`${r.alumnoId}:${r.fecha}`, r.estado]));
  const total = vacio(fechas.length);
  const porFecha = fechas.map<ConteoClase>((fecha) => ({ fecha, llego: 0, tarde: 0, falta: 0, problema: 0, sinRegistro: 0 }));
  const filas = alumnos.map<FilaCurso>((a) => {
    const resumen = vacio(fechas.length);
    const estados = fechas.map((f, i) => {
      const e = estadoDe.get(`${a.id}:${f}`) ?? null;
      const clave = e ?? "sinRegistro";
      resumen[clave]++;
      total[clave]++;
      porFecha[i][clave]++;
      return e;
    });
    return { alumnoId: a.id, nombres: a.nombres, apellidos: a.apellidos, codigo: a.codigo, estados, resumen: cerrar(resumen) };
  });
  return { fechas, filas, total: cerrar(total), porFecha };
}

/** Letra de cada estado en la matriz (Excel y PDF): «L» llegó, «T» tarde, «F» no llegó, «A» aviso, «—» sin registro. */
export const LETRA_ESTADO: Record<EstadoRegistro, string> = { llego: "L", tarde: "T", falta: "F", problema: "A" };
export const NOTA_CURSO =
  "Asistencia a clase registrada por el profesor en la lista del curso. L = llegó, T = tarde, F = no llegó, A = aviso, — = sin registro. % de asistencia = (llegó + tarde) ÷ clases con registro. Solo se muestran las fechas en que se pasó lista.";
