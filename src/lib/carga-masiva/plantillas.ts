// Plantillas descargables de la carga masiva (specs/36): encabezados, filas de ejemplo (ficticias) e instrucciones. Pura.
import { aCsv } from "../csv";

export type TipoCarga = "salones" | "familias";

export type Plantilla = { titulo: string; archivo: string; encabezados: string[]; ejemplos: string[][]; instrucciones: string[]; columnasTexto: string[] };

export function plantillaCarga(tipo: TipoCarga, anio: number): Plantilla {
  if (tipo === "salones") {
    return {
      titulo: "Salones y cursos",
      archivo: "khipu-salones-y-cursos",
      encabezados: ["nivel", "grado", "seccion", "nombre", "anio", "tutor", "curso", "profesor"],
      ejemplos: [
        ["inicial", "3", "A", "", String(anio), "40000001", "Comunicación", "40000001"],
        ["inicial", "3", "A", "", String(anio), "", "Psicomotricidad", "x"],
        ["primaria", "3", "B", "", String(anio), "docente.tutora@ejemplo.pe", "Matemática", "docente.tutora@ejemplo.pe"],
        ["primaria", "3", "B", "", String(anio), "", "Inglés", "40000002"],
        ["secundaria", "1", "A", "", String(anio), "40000003", "Ciencia y Tecnología", "40000004"],
        ["secundaria", "1", "A", "", String(anio), "", "Educación Física", ""],
      ],
      columnasTexto: ["tutor", "profesor"],
      instrucciones: [
        "Una fila por cada curso de cada salón. Las filas del mismo salón (mismo nivel, grado, sección y año) se juntan.",
        "nivel: inicial, primaria, secundaria o academia. grado: el número (en inicial, la edad: 3, 4 o 5). seccion: A, B, C… (opcional si el grado tiene una sola sección).",
        "nombre (opcional): si lo dejas vacío, Khipu usa «3 años A», «3.° B» o «1.° A Sec.». Es el nombre que debe ir en la columna «salon» del archivo de alumnos.",
        "anio (opcional): si lo dejas vacío, se usa el año actual.",
        "tutor y profesor: el DNI o el correo con el que la persona ya está registrada en Gestión → Profesores. Si no lo encontramos, el salón o el curso se crean sin profesor y te lo avisamos.",
        "profesor vacío o «x»: el curso se crea sin profesor y se lo asignas después.",
        "Otra forma: una fila por salón y una columna por curso (por ejemplo «Matemática», «Comunicación»); en cada celda, el DNI o correo del profesor o «x». Celda vacía = el salón no tiene ese curso.",
        "Puedes volver a subir el archivo corregido: lo que ya existe no se duplica (se actualizan el tutor y el profesor de cada curso). Nunca se borran salones ni cursos.",
        "Guarda como CSV (separado por comas o por punto y coma) o como Excel (.xlsx, hoja «Datos»).",
      ],
    };
  }
  return {
    titulo: "Familias",
    archivo: "khipu-familias",
    encabezados: ["alumno_codigo", "alumno_dni", "apoderado_dni", "tipo_documento", "nombres", "apellidos", "correo", "celular", "parentesco"],
    ejemplos: [
      ["A0001", "", "41000001", "dni", "Rosa", "Pérez Quispe", "rosa.perez@ejemplo.pe", "987654321", "madre"],
      ["A0002", "", "41000001", "dni", "Rosa", "Pérez Quispe", "rosa.perez@ejemplo.pe", "987654321", "madre"],
      ["A0001", "", "41000002", "dni", "Juan", "Gómez Ríos", "juan.gomez@ejemplo.pe", "", "padre"],
      ["", "72000003", "CE1234567", "ce", "Ana", "Silva Ortega", "ana.silva@ejemplo.pe", "", "tutora legal"],
    ],
    columnasTexto: ["alumno_codigo", "alumno_dni", "apoderado_dni", "celular"],
    instrucciones: [
      "Una fila por cada apoderado y cada uno de sus hijos. Hermanos: repite al apoderado con el mismo correo y DNI en una fila por hijo; se crea una sola cuenta.",
      "El alumno se busca por alumno_codigo o por alumno_dni (el que tengas; los alumnos ya deben estar importados).",
      "apoderado_dni: 8 dígitos. Si usa carné de extranjería o pasaporte, escribe ce o pasaporte en tipo_documento.",
      "El documento es la contraseña inicial de la familia: no viaja en el correo y deberá cambiarla al entrar. Si el correo ya tenía cuenta en Khipu, entra con su contraseña de siempre.",
      "correo: el correo personal de la familia. celular es opcional. parentesco: madre, padre, abuela, tutor legal…",
      "Cada familia nueva recibe un correo de bienvenida (sale por la cola de avisos, poco a poco). Al entrar por primera vez debe aceptar el consentimiento: hasta entonces no recibe avisos.",
      "Puedes volver a subir el archivo corregido: no se duplican cuentas ni vínculos (se actualiza el parentesco) y no se reenvía la bienvenida.",
      "En Excel, deja las columnas de DNI y celular como Texto para no perder los ceros de la izquierda.",
      "Guarda como CSV (separado por comas o por punto y coma) o como Excel (.xlsx, hoja «Datos»).",
    ],
  };
}

export function plantillaCsv(tipo: TipoCarga, anio: number): string {
  const p = plantillaCarga(tipo, anio);
  return aCsv(p.encabezados, p.ejemplos);
}
