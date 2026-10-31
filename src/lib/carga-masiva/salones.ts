// Archivo de salones y cursos de la carga masiva (specs/36). Pura y sin acceso a datos: la validación contra la BD
// (salones existentes, profesores por DNI o correo) la completa `src/lib/server/carga-masiva.ts`.
import { normalizar } from "../importar-alumnos";
import { celda, columna, ordenarPorLinea, referenciaPersona, type ErrorFila, type Tabla } from "./tabla";

export type NivelCarga = "inicial" | "primaria" | "secundaria" | "academia";
export type Referencia = NonNullable<ReturnType<typeof referenciaPersona>>;

export type CursoArchivo = {
  linea: number;
  nombre: string;
  /** Profesor por DNI o correo; null = curso sin profesor. */
  profesor: Referencia | null;
  /** Texto del profesor que no es DNI ni correo (se avisa y el curso queda sin profesor). */
  profesorIlegible: string | null;
};

export type SalonArchivo = {
  /** Clave del salón dentro del archivo: año, nivel, grado y sección. */
  clave: string;
  lineas: number[];
  nombre: string;
  /** true si el nombre vino en el archivo (si no, se arma con nivel, grado y sección). */
  nombreExplicito: boolean;
  nivel: NivelCarga;
  grado: number | null;
  seccion: string | null;
  anio: number;
  tutor: Referencia | null;
  tutorLinea: number | null;
  tutorIlegible: string | null;
  cursos: CursoArchivo[];
};

export type ResultadoArchivoSalones = { salones: SalonArchivo[]; errores: ErrorFila[]; avisos: ErrorFila[]; cursosEnColumnas: string[] };

export const MAX_FILAS_SALONES = 2000;
export const COLUMNAS_SALONES = ["nivel", "grado", "seccion", "nombre", "anio", "tutor", "curso", "profesor"] as const;
/** Valores de celda que, con los cursos en columnas, crean el curso sin profesor. */
const SIN_PROFESOR = new Set(["x", "si", "sin profesor", "sin_profesor", "-"]);

/** Columnas de apoyo que no son cursos (números de fila, observaciones, nombres de referencia). */
const COLUMNA_IGNORADA = /^(n|nro|no|num|numero|item|observacion(es)?|comentarios?|notas?|.*_nombres?|nombre_.*)$/;

const NIVELES: Record<string, NivelCarga> = {
  inicial: "inicial", ini: "inicial", primaria: "primaria", prim: "primaria", primario: "primaria",
  secundaria: "secundaria", sec: "secundaria", secundario: "secundaria", academia: "academia",
};

export function nivelDe(valor: string): NivelCarga | null {
  return NIVELES[normalizar(valor).replace(/\.$/, "")] ?? null;
}

/** «3», «3°», «3.°», «3 años», «3ro» → 3. */
export function gradoDe(valor: string): number | null | "invalido" {
  const v = valor.trim();
  if (!v) return null;
  const m = /^(\d{1,2})/.exec(v);
  if (!m) return "invalido";
  const n = Number(m[1]);
  return n >= 0 && n <= 12 ? n : "invalido";
}

/** Nombre que usa Khipu si el archivo no trae uno: «3 años A», «3.° B», «1.° A Sec.», «2.° A Acad.». */
export function nombreSalonSugerido(nivel: NivelCarga, grado: number | null, seccion: string | null): string {
  const s = seccion ? ` ${seccion}` : "";
  if (nivel === "inicial") return `${grado ?? ""} años${s}`.trim();
  const g = grado === null ? "" : `${grado}.°`;
  const sufijo = nivel === "secundaria" ? " Sec." : nivel === "academia" ? " Acad." : "";
  return `${g}${s}${sufijo}`.trim();
}

export const claveCurso = (nombre: string) => normalizar(nombre).replace(/\s+/g, " ");
const mismaReferencia = (a: Referencia | null, b: Referencia | null) => (a?.tipo ?? null) === (b?.tipo ?? null) && (a?.valor ?? null) === (b?.valor ?? null);

/**
 * Lee el archivo de salones y cursos. Formatos admitidos (se pueden mezclar):
 * - un curso por fila: `nivel, grado, seccion, [nombre], [anio], [tutor], curso, [profesor]`;
 * - cursos como columnas: cualquier columna que no sea de las conocidas es un curso; la celda trae el DNI o correo
 *   del profesor, o «x» para crear el curso sin profesor (vacía = ese salón no tiene ese curso).
 * Las filas del mismo salón se juntan; un tutor o profesor distinto para lo mismo es un error de esa línea.
 */
export function leerArchivoSalones(tabla: Tabla, anioPorDefecto: number): ResultadoArchivoSalones {
  const errores: ErrorFila[] = [];
  const avisos: ErrorFila[] = [];
  const col = {
    nivel: columna(tabla, "nivel"),
    grado: columna(tabla, "grado", "edad"),
    seccion: columna(tabla, "seccion"),
    nombre: columna(tabla, "nombre", "salon", "nombre_salon"),
    anio: columna(tabla, "anio", "ano", "periodo"),
    tutor: columna(tabla, "tutor", "tutora", "tutor_a", "tutor_dni", "tutor_correo"),
    curso: columna(tabla, "curso", "area"),
    profesor: columna(tabla, "profesor", "profesora", "profesor_a", "docente", "profesor_dni", "profesor_correo"),
  };
  if (col.nivel === -1) {
    return { salones: [], errores: [{ linea: tabla.lineaEncabezado, mensaje: `Falta la columna «nivel». Usa: ${COLUMNAS_SALONES.join(", ")}.` }], avisos, cursosEnColumnas: [] };
  }
  const conocidas = new Set(Object.values(col).filter((i) => i !== -1));
  const columnasCurso = tabla.encabezado
    .map((_, i) => ({ i, nombre: tabla.encabezadoOriginal[i] }))
    .filter(({ i, nombre }) => !conocidas.has(i) && nombre.trim() !== "" && tabla.encabezado[i] !== "" && !COLUMNA_IGNORADA.test(tabla.encabezado[i]));

  const porClave = new Map<string, SalonArchivo>();
  if (tabla.filas.length > MAX_FILAS_SALONES) {
    errores.push({ linea: tabla.filas[MAX_FILAS_SALONES].linea, mensaje: `Máximo ${MAX_FILAS_SALONES} filas por archivo.` });
  }

  for (const fila of tabla.filas.slice(0, MAX_FILAS_SALONES)) {
    const { linea } = fila;
    const v = (i: number) => celda(fila, i);
    const nivel = nivelDe(v(col.nivel));
    if (!nivel) {
      errores.push({ linea, mensaje: v(col.nivel) ? `Nivel «${v(col.nivel)}» no válido: usa inicial, primaria, secundaria o academia.` : "Falta el nivel." });
      continue;
    }
    const grado = gradoDe(v(col.grado));
    if (grado === "invalido") {
      errores.push({ linea, mensaje: `Grado «${v(col.grado)}» no válido: usa un número (por ejemplo 3).` });
      continue;
    }
    if (grado === null && nivel !== "academia") {
      errores.push({ linea, mensaje: "Falta el grado (en inicial, la edad: 3, 4 o 5)." });
      continue;
    }
    const seccion = v(col.seccion).toUpperCase() || null;
    if (seccion && seccion.length > 10) {
      errores.push({ linea, mensaje: "La sección es demasiado larga (máximo 10 caracteres)." });
      continue;
    }
    const anioTexto = v(col.anio);
    const anio = anioTexto ? Number(anioTexto) : anioPorDefecto;
    if (!Number.isInteger(anio) || anio < 2020 || anio > 2100) {
      errores.push({ linea, mensaje: `Año «${anioTexto}» no válido.` });
      continue;
    }
    const nombreArchivo = v(col.nombre);
    if (nombreArchivo.length > 40) {
      errores.push({ linea, mensaje: "El nombre del salón es demasiado largo (máximo 40 caracteres)." });
      continue;
    }
    if (nivel === "academia" && grado === null && !nombreArchivo && !seccion) {
      errores.push({ linea, mensaje: "En academia, escribe el grado, la sección o el nombre del salón." });
      continue;
    }

    const clave = `${anio}|${nivel}|${grado ?? ""}|${seccion ?? ""}|${grado === null ? normalizar(nombreArchivo) : ""}`;
    let salon = porClave.get(clave);
    if (!salon) {
      salon = {
        clave, lineas: [], nivel, grado, seccion, anio,
        nombre: nombreArchivo || nombreSalonSugerido(nivel, grado, seccion),
        nombreExplicito: Boolean(nombreArchivo),
        tutor: null, tutorLinea: null, tutorIlegible: null, cursos: [],
      };
      porClave.set(clave, salon);
    } else if (nombreArchivo && salon.nombreExplicito && normalizar(nombreArchivo) !== normalizar(salon.nombre)) {
      errores.push({ linea, mensaje: `Este salón ya tiene otro nombre en la línea ${salon.lineas[0]} («${salon.nombre}»).` });
      continue;
    } else if (nombreArchivo && !salon.nombreExplicito) {
      salon.nombre = nombreArchivo;
      salon.nombreExplicito = true;
    }
    salon.lineas.push(linea);

    const tutorTexto = v(col.tutor);
    if (tutorTexto) {
      const ref = referenciaPersona(tutorTexto);
      if (!ref) {
        if (!salon.tutor && !salon.tutorIlegible) {
          salon.tutorIlegible = tutorTexto;
          salon.tutorLinea = linea;
        }
      } else if (salon.tutor && !mismaReferencia(salon.tutor, ref)) {
        errores.push({ linea, mensaje: `El salón ${salon.nombre} ya tiene otro tutor en la línea ${salon.tutorLinea}.` });
        continue;
      } else if (!salon.tutor) {
        salon.tutor = ref;
        salon.tutorLinea = linea;
        salon.tutorIlegible = null;
      }
    }

    const agregarCurso = (nombre: string, profesorTexto: string): void => {
      if (nombre.length > 80) {
        errores.push({ linea, mensaje: `El nombre del curso «${nombre.slice(0, 30)}…» es demasiado largo (máximo 80 caracteres).` });
        return;
      }
      const sinProfesor = !profesorTexto || SIN_PROFESOR.has(normalizar(profesorTexto));
      const profesor = sinProfesor ? null : referenciaPersona(profesorTexto);
      const profesorIlegible = !sinProfesor && !profesor ? profesorTexto : null;
      const previo = salon.cursos.find((c) => claveCurso(c.nombre) === claveCurso(nombre));
      if (previo) {
        if (profesor && previo.profesor && !mismaReferencia(previo.profesor, profesor)) {
          errores.push({ linea, mensaje: `El curso ${nombre} de ${salon.nombre} ya tiene otro profesor en la línea ${previo.linea}.` });
        } else if (profesor && !previo.profesor) {
          previo.profesor = profesor;
          previo.profesorIlegible = null;
        }
        return;
      }
      salon.cursos.push({ linea, nombre, profesor, profesorIlegible });
    };

    const curso = v(col.curso);
    const profesorTexto = v(col.profesor);
    if (curso) agregarCurso(curso, profesorTexto);
    else if (profesorTexto) avisos.push({ linea, mensaje: "Hay un profesor sin curso: se ignora." });
    for (const { i, nombre } of columnasCurso) {
      const valor = celda(fila, i);
      if (valor) agregarCurso(nombre, valor);
    }
  }

  const salones = [...porClave.values()];
  // Dos salones distintos del archivo no pueden terminar con el mismo nombre (el CSV de alumnos busca por nombre).
  const nombres = new Map<string, SalonArchivo>();
  const repetidos = new Set<SalonArchivo>();
  for (const s of salones) {
    const k = `${s.anio}|${normalizar(s.nombre)}`;
    const otro = nombres.get(k);
    if (otro) {
      errores.push({ linea: s.lineas[0], mensaje: `Dos salones distintos se llamarían «${s.nombre}» (también en la línea ${otro.lineas[0]}). Revisa la columna «nombre».` });
      repetidos.add(s);
    } else nombres.set(k, s);
  }
  return {
    salones: salones.filter((s) => !repetidos.has(s)),
    errores: ordenarPorLinea(errores),
    avisos: ordenarPorLinea(avisos),
    cursosEnColumnas: columnasCurso.map((c) => c.nombre),
  };
}
