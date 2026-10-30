// Prompt de sistema de Nudito+ (specs/29). Puro: lo arma `contexto.ts` con datos de la BD y lo lee el proveedor falso.
// El bloque «DATOS» es estructurado (una clave por línea) para que cualquier proveedor —y el falso— lo entienda.

export type CursoNudito = {
  nombre: string;
  /** Competencias CNEB del curso. */
  competencias: string[];
  /** Desempeños del grado (o del bimestre actual) de este curso. */
  desempenos: string[];
};

export type TareaNudito = { curso: string; titulo: string; entrega: string };

export type SitioNudito = { dominio: string; nombre: string };

export type DatosAlumnoNudito = {
  /** Solo el primer nombre: Nudito trata de «tú». */
  nombre: string;
  /** «5.° de primaria», «2.° de secundaria»… */
  grado: string;
  cursos: CursoNudito[];
  tareas: TareaNudito[];
  periodo: string | null;
  sitios: SitioNudito[];
};

export const REGLAS_NUDITO = [
  "Eres Nudito, la mascota de Khipu Escolar y un tutor con inteligencia artificial para estudiantes del Perú.",
  "Habla en español del Perú, de «tú», con frases cortas, cercano y amable. Una idea por mensaje.",
  "Di que eres una IA si te lo preguntan. Nunca reemplazas al profesor: si algo es de la clase, sugiere preguntarle.",
  "Nunca des la respuesta final de una tarea: guía paso a paso con preguntas (método socrático) y deja que el alumno llegue.",
  "Sigue el Currículo Nacional (CNEB) del grado del alumno: usa sus cursos, competencias y desempeños de abajo.",
  "Nunca hables de otros alumnos ni des datos personales de nadie. Solo conoces los datos de este alumno.",
  "Contenido apropiado para su edad. Si cuenta algo de riesgo (daño, violencia, abuso), pídele hablar con un adulto de confianza.",
  "Solo recomienda enlaces de los SITIOS permitidos. Ningún otro enlace.",
  "Nunca des malas noticias ni opines de sus notas.",
];

function linea(clave: string, valor: string): string {
  return `${clave}: ${valor.replace(/\s+/g, " ").trim()}`;
}

/** Prompt de sistema completo: reglas + bloque DATOS (+ instrucción de guía si pidió la respuesta directa). */
export function armarSistema(datos: DatosAlumnoNudito, opciones: { guiarSinResolver?: boolean } = {}): string {
  const partes = [
    ...REGLAS_NUDITO,
    "",
    "DATOS",
    linea("ALUMNO", datos.nombre),
    linea("GRADO", datos.grado),
    linea("PERIODO", datos.periodo ?? "—"),
    linea("CURSOS", datos.cursos.map((c) => c.nombre).join(" | ")),
    ...datos.cursos.map((c) => linea(`COMPETENCIAS ${c.nombre}`, c.competencias.join(" | ") || "—")),
    ...datos.cursos.map((c) => linea(`DESEMPENOS ${c.nombre}`, c.desempenos.join(" | ") || "—")),
    linea("TAREAS", datos.tareas.map((t) => `${t.curso} — ${t.titulo} — ${t.entrega}`).join(" | ") || "—"),
    linea("SITIOS", datos.sitios.map((s) => `${s.dominio}=${s.nombre}`).join(" | ") || "—"),
  ];
  if (opciones.guiarSinResolver) partes.push(linea("GUIA_SIN_RESOLVER", "si"));
  return partes.join("\n");
}

export type DatosLeidos = {
  nombre: string;
  grado: string;
  cursos: string[];
  desempenos: Record<string, string[]>;
  tareas: TareaNudito[];
  sitios: SitioNudito[];
  guiarSinResolver: boolean;
};

const lista = (v: string | undefined) => (!v || v === "—" ? [] : v.split(" | ").map((x) => x.trim()).filter(Boolean));

/** Lee el bloque DATOS del prompt de sistema (lo usa el proveedor falso). */
export function leerDatosDelSistema(sistema: string): DatosLeidos {
  const valores = new Map<string, string>();
  for (const l of sistema.split("\n")) {
    const i = l.indexOf(": ");
    if (i > 0) valores.set(l.slice(0, i), l.slice(i + 2));
  }
  const cursos = lista(valores.get("CURSOS"));
  return {
    nombre: valores.get("ALUMNO") ?? "",
    grado: valores.get("GRADO") ?? "",
    cursos,
    desempenos: Object.fromEntries(cursos.map((c) => [c, lista(valores.get(`DESEMPENOS ${c}`))])),
    tareas: lista(valores.get("TAREAS")).map((t) => {
      const [curso = "", titulo = "", entrega = ""] = t.split(" — ");
      return { curso, titulo, entrega };
    }),
    sitios: lista(valores.get("SITIOS")).map((s) => {
      const [dominio = "", ...resto] = s.split("=");
      return { dominio, nombre: resto.join("=") || dominio };
    }),
    guiarSinResolver: valores.get("GUIA_SIN_RESOLVER") === "si",
  };
}
