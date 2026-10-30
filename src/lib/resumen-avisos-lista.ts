// Resumen previo de pasar lista: a cuántas familias se avisará al guardar (specs/04). Lógica pura.
// Replica la regla de `guardarLista` (`seAvisaCambio`): solo registros nuevos o con estado cambiado; en la asistencia
// del día la llegada no se repite si esta lista lo tenía «tarde»; en las listas de curso nunca se avisa la llegada y la
// falta a clase solo si el alumno ingresó al colegio ese día.
import { ingresoAlColegio, seAvisaCambio } from "@/lib/asistencia-por-curso";

export type EstadoLista = "llego" | "tarde" | "falta" | "problema";

export type AlumnoResumen = {
  id: string;
  registro: { estado: EstadoLista } | null;
  /** Familias con consentimiento y algún canal de aviso. */
  familiasConAviso: number;
  /** Solo listas de curso: ingreso al colegio de ese día. */
  ingreso?: { estado: EstadoLista } | null;
};

export type ResumenAvisos = {
  /** Familias que recibirán aviso (suma por alumno). */
  familias: number;
  porEstado: Record<EstadoLista, number>;
  /** Asistencia del día: alumnos presentes cuya llegada ya se avisó (esta lista los tenía «Tarde»). */
  llegadasYaAvisadas: number;
  /** Lista de curso: faltas a clase de alumnos sin ingreso al colegio ese día (no se avisan aparte). */
  faltasSinIngreso: number;
  esCurso: boolean;
};

const ORDEN: EstadoLista[] = ["llego", "tarde", "falta", "problema"];
const PALABRAS: Record<EstadoLista, [string, string]> = {
  llego: ["llegada", "llegadas"],
  tarde: ["tardanza", "tardanzas"],
  falta: ["falta", "faltas"],
  problema: ["problema", "problemas"],
};

/** `marcas`: estado elegido por alumno (los alumnos sin marca, p. ej. al corregir, no cuentan). */
export function resumenAvisosLista(alumnos: AlumnoResumen[], marcas: Record<string, EstadoLista | null | undefined>, esCurso = false): ResumenAvisos {
  const porEstado: Record<EstadoLista, number> = { llego: 0, tarde: 0, falta: 0, problema: 0 };
  let llegadasYaAvisadas = 0;
  let faltasSinIngreso = 0;
  for (const a of alumnos) {
    const estado = marcas[a.id];
    const anterior = a.registro?.estado ?? null;
    if (!estado || anterior === estado) continue;
    if (!seAvisaCambio({ esCurso, estado, anterior, ingreso: a.ingreso })) {
      if (!esCurso && estado === "llego") llegadasYaAvisadas++;
      if (esCurso && estado === "falta" && !ingresoAlColegio(a.ingreso)) faltasSinIngreso++;
      continue;
    }
    porEstado[estado] += a.familiasConAviso;
  }
  const familias = ORDEN.reduce((s, e) => s + porEstado[e], 0);
  return { familias, porEstado, llegadasYaAvisadas, faltasSinIngreso, esCurso };
}

/** «Se avisará a 24 familias: 20 llegadas, 2 tardanzas, 2 faltas.» (en un curso: «… 1 tardanza, 2 faltas a clase.») */
export function textoResumenAvisos(r: ResumenAvisos): string {
  if (r.familias === 0) return "No hay avisos nuevos para enviar.";
  const partes = ORDEN.filter((e) => r.porEstado[e] > 0).map((e) => {
    const palabra = PALABRAS[e][r.porEstado[e] === 1 ? 0 : 1];
    return `${r.porEstado[e]} ${palabra}${r.esCurso && e === "falta" ? " a clase" : ""}`;
  });
  return `Se avisará a ${r.familias} ${r.familias === 1 ? "familia" : "familias"}: ${partes.join(", ")}.`;
}

/** Notas que acompañan al resumen: llegadas ya avisadas y faltas a clase que no se avisan aparte. */
export function notasResumenAvisos(r: ResumenAvisos): string[] {
  const notas: string[] = [];
  if (r.llegadasYaAvisadas > 0) {
    notas.push(r.llegadasYaAvisadas === 1 ? "La llegada de 1 alumno ya se avisó hoy." : `La llegada de ${r.llegadasYaAvisadas} alumnos ya se avisó hoy.`);
  }
  if (r.faltasSinIngreso > 0) {
    notas.push(
      r.faltasSinIngreso === 1
        ? "1 falta no se avisa aparte: el alumno no registra ingreso al colegio hoy (su familia recibe el aviso de la asistencia del día)."
        : `${r.faltasSinIngreso} faltas no se avisan aparte: esos alumnos no registran ingreso al colegio hoy (sus familias reciben el aviso de la asistencia del día).`,
    );
  }
  return notas;
}
