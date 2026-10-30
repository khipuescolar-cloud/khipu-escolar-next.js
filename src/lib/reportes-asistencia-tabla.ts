// Tablas de los reportes de asistencia (specs/27) en una forma neutra que comparten Excel y PDF. Lógica pura.
import { fechaCorta } from "@/lib/fechas";
import { nombreArchivoReporte, textoPorcentaje, type ResumenAlumno } from "@/lib/reportes-asistencia";
import type { ReporteAsistencia } from "@/lib/server/reportes-asistencia";

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
  "% de asistencia = (llegó + tarde) ÷ días hábiles con registro. Días hábiles: lunes a viernes sin feriados. Una falta cuenta como justificada cuando su justificación fue aceptada.";

export const ETIQUETA_ESTADO = { llego: "Llegó", tarde: "Tarde", falta: "No llegó", problema: "Aviso" } as const;

const COLUMNAS_RESUMEN = ["Días con registro", "Llegó", "Tarde", "No llegó", "Aviso", "Faltas justificadas", "Faltas sin justificar", "Sin registro", "% asistencia"];
const PCT = [COLUMNAS_RESUMEN.length - 1];

export function celdasResumen(r: ResumenAlumno): Celda[] {
  return [r.diasConRegistro, r.llego, r.tarde, r.falta, r.problema, r.faltasJustificadas, r.faltasInjustificadas, r.diasSinRegistro, r.porcentaje];
}

function rango(r: ReporteAsistencia): string {
  const efectivo = r.hastaEfectivo !== r.hasta ? ` (contado hasta ${fechaCorta(r.hastaEfectivo)})` : "";
  return `Del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}${efectivo}`;
}

export function tablaDeReporte(r: ReporteAsistencia): TablaReporte {
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
          columnas: ["Fecha", "Estado", "Hora", "Justificación"],
          filas: r.detalle.map((d) => [fechaCorta(d.fecha), d.estado ? ETIQUETA_ESTADO[d.estado] : "Sin registro", d.hora ?? "", d.estado === "falta" ? (d.justificada ? "Justificada" : "Sin justificar") : ""]),
          columnasPorcentaje: [],
        },
      ],
    };
  }
  return {
    titulo: `Asistencia · ${r.colegio}`,
    subtitulo: rango(r),
    nota,
    archivo: nombreArchivoReporte(["asistencia", "colegio", r.desde, r.hasta]),
    secciones: [{
      titulo: "Salones",
      columnas: ["Salón", "Alumnos", ...COLUMNAS_RESUMEN],
      filas: r.filas.map((f) => [f.salon, f.alumnos, ...celdasResumen(f.resumen)]),
      total: ["Total del colegio", r.filas.reduce((s, f) => s + f.alumnos, 0), ...celdasResumen(r.total)],
      columnasPorcentaje: [PCT[0] + 2],
    }],
  };
}

/** Texto de una celda para PDF o pantalla. */
export function textoCelda(c: Celda, esPorcentaje: boolean): string {
  if (esPorcentaje) return textoPorcentaje(typeof c === "number" ? c : null);
  return c === null ? "" : String(c);
}
