// Tablas de los reportes de asistencia (specs/27) en una forma neutra que comparten Excel y PDF. Lógica pura.
import { fechaCorta } from "@/lib/fechas";
import { nombreArchivoReporte, textoJustificacion, textoPorcentaje, type ResumenAlumno } from "@/lib/reportes-asistencia";
import { LETRA_ESTADO, NOTA_CURSO, type ResumenCurso } from "@/lib/reportes-curso";
import type { ReporteAsistencia, ReporteCurso } from "@/lib/server/reportes-asistencia";

export type Celda = string | number | null;
export type SeccionReporte = {
  titulo: string;
  columnas: string[];
  filas: Celda[][];
  total?: Celda[];
  /** Índices de columnas con porcentaje (número 0–100). */
  columnasPorcentaje: number[];
};
export type TablaReporte = { titulo: string; subtitulo: string; nota: string; secciones: SeccionReporte[]; archivo: string };

export const NOTA_PORCENTAJE =
  "Asistencia al colegio (portería o lista del día; las listas de curso no cuentan). % de asistencia = (llegó + tarde) ÷ días hábiles con registro. Días hábiles: lunes a viernes sin feriados. Una falta cuenta como justificada cuando su justificación fue aceptada o la cubre un permiso del colegio; en revisión, si la familia la envió y aún no se revisa. «Con permiso»: días con permiso de asistencia de día completo en que el alumno no asistió.";

export const ETIQUETA_ESTADO = { llego: "Llegó", tarde: "Tarde", falta: "No llegó", problema: "Aviso" } as const;

const COLUMNAS_RESUMEN = ["Días con registro", "Llegó", "Tarde", "No llegó", "Aviso", "Faltas justificadas", "Faltas en revisión", "Faltas sin justificar", "Con permiso", "Sin registro", "% asistencia"];
const PCT = [COLUMNAS_RESUMEN.length - 1];

export function celdasResumen(r: ResumenAlumno): Celda[] {
  return [r.diasConRegistro, r.llego, r.tarde, r.falta, r.problema, r.faltasJustificadas, r.faltasEnRevision, r.faltasInjustificadas, r.conPermiso ?? 0, r.diasSinRegistro, r.porcentaje];
}

/** Clases por bloque de la matriz del curso: más columnas no caben en un PDF A4 horizontal. */
export const CLASES_POR_BLOQUE = 20;

const COLUMNAS_CURSO = ["Clases", "Llegó", "Tarde", "No llegó", "Aviso", "Sin registro", "% asistencia"];
const celdasCurso = (r: ResumenCurso): Celda[] => [r.clases, r.llego, r.tarde, r.falta, r.problema, r.sinRegistro, r.porcentaje];
/** «12/10» (día/mes) para la cabecera de cada clase. */
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function tablaDeCurso(r: ReporteCurso): TablaReporte {
  const bloques: SeccionReporte[] = [];
  for (let i = 0; i < r.fechas.length; i += CLASES_POR_BLOQUE) {
    const fechas = r.fechas.slice(i, i + CLASES_POR_BLOQUE);
    bloques.push({
      titulo: r.fechas.length > CLASES_POR_BLOQUE ? `Clases del ${diaMes(fechas[0])} al ${diaMes(fechas.at(-1)!)}` : "Asistencia por clase",
      columnas: ["Alumno", ...fechas.map(diaMes)],
      filas: r.filas.map((f) => [`${f.apellidos}, ${f.nombres}`, ...f.estados.slice(i, i + CLASES_POR_BLOQUE).map((e) => (e ? LETRA_ESTADO[e] : "—"))]),
      columnasPorcentaje: [],
    });
  }
  return {
    titulo: `${r.curso.nombre} · ${r.salon.nombre}`,
    subtitulo: `${r.profesor ? `${r.profesor} · ` : ""}${rango(r)}`,
    nota: NOTA_CURSO,
    archivo: nombreArchivoReporte(["asistencia", r.curso.nombre, r.salon.nombre, r.desde, r.hasta]),
    secciones: [
      {
        titulo: "Resumen por alumno",
        columnas: ["Apellidos", "Nombres", "Código", ...COLUMNAS_CURSO],
        filas: r.filas.map((f) => [f.apellidos, f.nombres, f.codigo ?? "", ...celdasCurso(f.resumen)]),
        total: ["Total del curso", "", "", ...celdasCurso(r.total)],
        columnasPorcentaje: [3 + COLUMNAS_CURSO.length - 1],
      },
      ...bloques,
    ],
  };
}

function rango(r: Pick<ReporteAsistencia, "desde" | "hasta" | "hastaEfectivo">): string {
  const efectivo = r.hastaEfectivo !== r.hasta ? ` (contado hasta ${fechaCorta(r.hastaEfectivo)})` : "";
  return `Del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}${efectivo}`;
}

export function tablaDeReporte(r: ReporteAsistencia | ReporteCurso): TablaReporte {
  if (r.tipo === "curso") return tablaDeCurso(r);
  const nota = NOTA_PORCENTAJE;
  if (r.tipo === "salon") {
    return {
      titulo: `Asistencia · ${r.salon.nombre}`,
      subtitulo: rango(r),
      nota,
      archivo: nombreArchivoReporte(["asistencia", r.salon.nombre, r.desde, r.hasta]),
      secciones: [{
        titulo: "Alumnos",
        columnas: ["Apellidos", "Nombres", "Código", ...COLUMNAS_RESUMEN],
        filas: r.filas.map((f) => [f.apellidos, f.nombres, f.codigo ?? "", ...celdasResumen(f.resumen)]),
        total: ["Total del salón", "", "", ...celdasResumen(r.total)],
        columnasPorcentaje: [PCT[0] + 3],
      }],
    };
  }
  if (r.tipo === "alumno") {
    return {
      titulo: `Asistencia · ${r.alumno.apellidos}, ${r.alumno.nombres}`,
      subtitulo: `${r.alumno.salon} · ${rango(r)}`,
      nota,
      archivo: nombreArchivoReporte(["asistencia", r.alumno.apellidos, r.alumno.nombres, r.alumno.salon, r.desde, r.hasta]),
      secciones: [
        { titulo: "Resumen", columnas: COLUMNAS_RESUMEN, filas: [celdasResumen(r.resumen)], columnasPorcentaje: PCT },
        {
          titulo: "Detalle por día",
          columnas: ["Fecha", "Estado", "Hora", "Salida", "Justificación"],
          filas: r.detalle.map((d) => [
            fechaCorta(d.fecha), d.estado ? ETIQUETA_ESTADO[d.estado] : d.conPermiso ? "Con permiso" : "Sin registro", d.hora ?? "", d.horaSalida ?? "", textoJustificacion(d),
          ]),
          columnasPorcentaje: [],
        },
      ],
    };
  }
  const grado = r.grado ?? null;
  return {
    titulo: grado ? `Asistencia · ${grado.nombre}` : `Asistencia · ${r.colegio}`,
    subtitulo: rango(r),
    nota,
    archivo: nombreArchivoReporte(["asistencia", grado ? `${grado.nivel}-${grado.grado}` : "colegio", r.desde, r.hasta]),
    secciones: [
      {
        titulo: grado ? "Asistencia al colegio por sección" : "Asistencia al colegio por salón",
        columnas: ["Salón", "Alumnos", ...COLUMNAS_RESUMEN],
        filas: r.filas.map((f) => [f.salon, f.alumnos, ...celdasResumen(f.resumen)]),
        total: [grado ? "Total del grado" : "Total del colegio", r.filas.reduce((s, f) => s + f.alumnos, 0), ...celdasResumen(r.total)],
        columnasPorcentaje: [PCT[0] + 2],
      },
      ...(r.cursos
        ? [{
            titulo: "Asistencia por curso",
            columnas: ["Salón", "Curso", "Registros", "Faltas a clase", "Ingresó pero faltó a clase", "Tardanzas a clase"],
            filas: r.cursos.map((c) => [c.salon, c.curso, c.registros, c.faltas, c.faltasConIngreso, c.tardanzas]),
            total: [
              "Total", "",
              r.cursos.reduce((s, c) => s + c.registros, 0), r.cursos.reduce((s, c) => s + c.faltas, 0),
              r.cursos.reduce((s, c) => s + c.faltasConIngreso, 0), r.cursos.reduce((s, c) => s + c.tardanzas, 0),
            ],
            columnasPorcentaje: [],
          }]
        : []),
    ],
  };
}

/** Texto de una celda para PDF o pantalla. */
export function textoCelda(c: Celda, esPorcentaje: boolean): string {
  if (esPorcentaje) return textoPorcentaje(typeof c === "number" ? c : null);
  return c === null ? "" : String(c);
}

/**
 * CSV del reporte (mismas tablas que Excel y PDF): cabecera con el colegio, el título y el rango, y luego cada sección
 * con su título, columnas, filas y total. Los porcentajes van con un decimal («77,8 %») o «Sin datos».
 */
export function filasCsvDeTabla(colegio: string, tabla: TablaReporte): { encabezados: string[]; filas: Celda[][] } {
  const filas: Celda[][] = [[tabla.titulo], [tabla.subtitulo], [tabla.nota]];
  for (const s of tabla.secciones) {
    filas.push([], [s.titulo], s.columnas);
    const celdas = (f: Celda[]) => f.map((c, i) => (s.columnasPorcentaje.includes(i) ? textoCelda(c, true) : c));
    for (const f of s.filas) filas.push(celdas(f));
    if (s.total) filas.push(celdas(s.total));
  }
  return { encabezados: [colegio], filas };
}
