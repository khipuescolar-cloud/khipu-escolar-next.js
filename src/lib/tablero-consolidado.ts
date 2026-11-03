// Consolidado de notas por salón y periodo (specs/33): tabla alumnos × competencias. Cálculo puro, compartido por pantalla, Excel y PDF.
import { formatearNumero, type Escala } from "@/lib/calificaciones";
import { nombreArchivoReporte, textoPorcentaje } from "@/lib/reportes-asistencia";
import { logroEsperado, nivelDeValor, distribucionVacia, esRiesgo, type Distribucion } from "@/lib/tablero";

export type Valor = { valorLiteral: "AD" | "A" | "B" | "C" | null; valorNumerico: number | null };
export type ColumnaConsolidado = { cursoId: string; curso: string; competenciaId: string; competencia: string };
export type FilaConsolidado = { alumnoId: string; nombre: string; valores: (Valor | null)[] };

export type Consolidado = {
  colegio: string;
  salon: { id: string; nombre: string };
  periodo: { id: string; nombre: string };
  escala: Escala;
  columnas: ColumnaConsolidado[];
  /** Solo calificaciones del periodo confirmadas por el profesor (sin sugeridas ni promedios). */
  filas: FilaConsolidado[];
};

export type CeldaTabla = string | number | null;
export type TablaConsolidado = {
  titulo: string;
  subtitulo: string;
  nota: string;
  archivo: string;
  grupos: { texto: string; columnas: number }[];
  columnas: string[];
  /** Nombre completo de cada competencia (la tabla del PDF usa C1, C2… y la leyenda). */
  leyenda: { codigo: string; curso: string; competencia: string }[];
  filas: CeldaTabla[][];
  pie: CeldaTabla[];
  /** Índices de las columnas con porcentaje en el pie (la última fila). */
  numericas: boolean;
};

const valorTexto = (v: Valor | null): CeldaTabla => (v === null ? null : v.valorLiteral ?? (v.valorNumerico === null ? null : v.valorNumerico));

/**
 * Resumen por alumno: competencias en riesgo. No hay promedio del alumno: sumar competencias equivaldría a una nota
 * única del curso, que no está validada (specs/11).
 */
export function resumenAlumno(valores: readonly (Valor | null)[]): { enRiesgo: number } {
  return { enRiesgo: valores.filter((v): v is Valor => v !== null).filter((v) => esRiesgo(nivelDeValor(v))).length };
}

/** % de logro esperado (AD/A o ≥14) de una columna. */
export function logroDeColumna(valores: readonly (Valor | null)[]): number | null {
  const d: Distribucion = distribucionVacia();
  for (const v of valores) {
    const n = v ? nivelDeValor(v) : null;
    if (n) d[n]++;
  }
  return logroEsperado(d);
}

export function tablaDeConsolidado(c: Consolidado): TablaConsolidado {
  const vigesimal = c.escala === "vigesimal";
  const grupos: { texto: string; columnas: number }[] = [];
  for (const col of c.columnas) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.texto === col.curso) ultimo.columnas++;
    else grupos.push({ texto: col.curso, columnas: 1 });
  }
  const leyenda = c.columnas.map((col, i) => ({ codigo: `C${i + 1}`, curso: col.curso, competencia: col.competencia }));
  const filas = c.filas.map<CeldaTabla[]>((f) => {
    const r = resumenAlumno(f.valores);
    return [f.nombre, ...f.valores.map(valorTexto), r.enRiesgo];
  });
  const pie: CeldaTabla[] = ["% logro esperado", ...c.columnas.map((_, i) => logroDeColumna(c.filas.map((f) => f.valores[i]))), null];
  return {
    titulo: `Consolidado de notas · ${c.salon.nombre} · ${c.periodo.nombre}`,
    subtitulo: `${c.colegio} · ${c.filas.length} alumnos · escala ${vigesimal ? "vigesimal (0–20)" : "literal (AD, A, B, C)"}`,
    nota: `Logro esperado: ${vigesimal ? "14 o más" : "AD o A"}. En riesgo: ${vigesimal ? "menos de 11" : "C"}.`
      + " Solo se muestran las calificaciones que el profesor confirmó; una celda vacía significa que aún no hay calificación.",
    archivo: nombreArchivoReporte(["consolidado-notas", c.salon.nombre, c.periodo.nombre]),
    grupos,
    columnas: ["Alumno", ...c.columnas.map((col) => col.competencia), "Competencias en riesgo"],
    leyenda,
    filas,
    pie,
    numericas: vigesimal,
  };
}

/** Texto de una celda para PDF/pantalla. */
export function textoCeldaConsolidado(valor: CeldaTabla, indiceColumna: number, fila: "dato" | "pie"): string {
  if (valor === null) return "—";
  if (fila === "pie" && indiceColumna > 0) return typeof valor === "number" ? textoPorcentaje(valor) : String(valor);
  return typeof valor === "number" ? formatearNumero(valor) : valor;
}
