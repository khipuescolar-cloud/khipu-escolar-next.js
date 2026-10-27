// Resumen previo de pasar lista: a cuántas familias se avisará al guardar (specs/04). Lógica pura.
// Replica la regla de `guardarLista`: solo registros nuevos o con estado cambiado, y la llegada
// no se repite si ya se avisó hoy (portería u otra lista) o si esta lista lo tenía «tarde».

export type EstadoLista = "llego" | "tarde" | "falta" | "problema";

export type AlumnoResumen = {
  id: string;
  registro: { estado: EstadoLista } | null;
  /** Familias con consentimiento y algún canal de aviso. */
  familiasConAviso: number;
  /** Hoy ya se avisó su llegada en otra lista o en portería. */
  llegadaAvisada: boolean;
};

export type ResumenAvisos = {
  /** Familias que recibirán aviso (suma por alumno). */
  familias: number;
  porEstado: Record<EstadoLista, number>;
  /** Alumnos presentes cuya llegada ya se avisó hoy (no se repite). */
  llegadasYaAvisadas: number;
};

const ORDEN: EstadoLista[] = ["llego", "tarde", "falta", "problema"];
const PALABRAS: Record<EstadoLista, [string, string]> = {
  llego: ["llegada", "llegadas"],
  tarde: ["tardanza", "tardanzas"],
  falta: ["falta", "faltas"],
  problema: ["problema", "problemas"],
};

export function resumenAvisosLista(alumnos: AlumnoResumen[], marcas: Record<string, EstadoLista>): ResumenAvisos {
  const porEstado: Record<EstadoLista, number> = { llego: 0, tarde: 0, falta: 0, problema: 0 };
  let llegadasYaAvisadas = 0;
  for (const a of alumnos) {
    const estado = marcas[a.id];
    if (!estado || a.registro?.estado === estado) continue;
    if (estado === "llego" && (a.llegadaAvisada || a.registro?.estado === "tarde")) {
      llegadasYaAvisadas++;
      continue;
    }
    porEstado[estado] += a.familiasConAviso;
  }
  const familias = ORDEN.reduce((s, e) => s + porEstado[e], 0);
  return { familias, porEstado, llegadasYaAvisadas };
}

/** «Se avisará a 24 familias: 20 llegadas, 2 tardanzas, 2 faltas.» */
export function textoResumenAvisos(r: ResumenAvisos): string {
  if (r.familias === 0) return "No hay avisos nuevos para enviar.";
  const partes = ORDEN.filter((e) => r.porEstado[e] > 0).map((e) => `${r.porEstado[e]} ${PALABRAS[e][r.porEstado[e] === 1 ? 0 : 1]}`);
  return `Se avisará a ${r.familias} ${r.familias === 1 ? "familia" : "familias"}: ${partes.join(", ")}.`;
}
