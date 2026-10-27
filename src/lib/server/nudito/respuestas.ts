// Construcción de textos de Nudito a partir de datos ya filtrados. Funciones puras.
// Tono: «tú», corto, una idea por mensaje, sin culpa ni rachas, sin malas noticias.
import type { AccionNudito, RespuestaNudito } from "./tipos";

export const DISCLAIMER = "Soy un asistente con IA. Si no sé algo, te paso con una persona del colegio.";
export const TEXTO_DERIVAR_TUTORA = "Para eso es mejor hablar con su tutora.";
export const TEXTO_DESCONOCIDO = "No estoy seguro. Te paso con una persona del colegio.";

const ZONA = "America/Lima";

/** «07:52» → «7:52 a. m.» */
export function formatoHora(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const sufijo = h >= 12 ? "p. m." : "a. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

export function formatoFecha(d: Date): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" })
    .format(d)
    .replace(",", "");
}

export function formatoFechaHora(d: Date): string {
  const hora = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return `${formatoFecha(d)}, ${formatoHora(hora)}`;
}

/** Agrega el aviso de IA a la primera respuesta de la conversación. */
export function conDisclaimer(r: RespuestaNudito, esPrimera: boolean): RespuestaNudito {
  return esPrimera ? { ...r, texto: `${DISCLAIMER}\n\n${r.texto}` } : r;
}

/** Ruta para escribir a los profesores de un hijo (`/mensajes/nuevo` valida que sea del apoderado). */
export function rutaChatDe(alumnoId: string): string {
  return `/mensajes/nuevo?alumno=${alumnoId}`;
}

/** Ruta de la libreta de un hijo (`/libreta` valida que sea del apoderado). */
export function rutaLibretaDe(alumnoId: string): string {
  return `/libreta?alumno=${alumnoId}`;
}

export function accionesChat(hijos: { id: string; nombre: string }[]): AccionNudito[] {
  if (hijos.length === 0) return [{ tipo: "abrir_chat", etiqueta: "Abrir el chat", valor: "/mensajes" }];
  if (hijos.length === 1) return [{ tipo: "abrir_chat", etiqueta: "Hablar con la tutora", valor: rutaChatDe(hijos[0].id) }];
  return hijos.map((h) => ({ tipo: "abrir_chat", etiqueta: `Hablar con la tutora de ${h.nombre}`, valor: rutaChatDe(h.id) }));
}

export function derivarATutora(intencion: string, hijos: { id: string; nombre: string }[], alumnoId?: string): RespuestaNudito {
  return { texto: TEXTO_DERIVAR_TUTORA, intencion, derivado: true, acciones: accionesChat(hijos), alumnoId };
}

export function derivarDesconocido(hijos: { id: string; nombre: string }[]): RespuestaNudito {
  return { texto: TEXTO_DESCONOCIDO, intencion: "desconocido", derivado: true, acciones: accionesChat(hijos) };
}

export function derivarAPersona(hijos: { id: string; nombre: string }[]): RespuestaNudito {
  return { texto: "Claro. Te paso con una persona del colegio.", intencion: "hablar_con_persona", derivado: true, acciones: accionesChat(hijos) };
}

export function preguntarHijo(intencionPendiente: string, hijos: { nombre: string }[]): RespuestaNudito {
  return {
    texto: "¿De cuál de tus hijos quieres saber?",
    intencion: `elegir_hijo:${intencionPendiente}`,
    derivado: false,
    acciones: hijos.map((h) => ({ tipo: "elegir_hijo", etiqueta: h.nombre, valor: h.nombre })),
  };
}

/** «Mateo», «Mateo y Sofía», «Mateo, Sofía y Luis». */
export function listaNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

/**
 * La familia nombró a un niño que no es su hijo. No se revela si ese alumno existe en el colegio y no se
 * responde con los datos de su hijo. Si la pregunta necesitaba un hijo, ofrece elegir uno de los suyos.
 */
export function noEsHijo(nombre: string, hijos: { nombre: string }[], intencionPendiente: string | null): RespuestaNudito {
  const base = `No encuentro a ${nombre} entre tus hijos.`;
  if (hijos.length === 0) return { texto: base, intencion: "no_es_hijo", derivado: false };
  return {
    texto: `${base} Puedo ayudarte con ${listaNombres(hijos.map((h) => h.nombre))}.`,
    intencion: intencionPendiente ? `elegir_hijo:${intencionPendiente}` : "no_es_hijo",
    derivado: false,
    acciones: intencionPendiente ? hijos.map((h) => ({ tipo: "elegir_hijo", etiqueta: h.nombre, valor: h.nombre })) : undefined,
  };
}

export function saludar(nombreApoderado: string, agradece: boolean): RespuestaNudito {
  const texto = agradece
    ? "¡Con gusto! Si necesitas algo más, aquí estoy."
    : `¡Hola, ${nombreApoderado}! Puedo contarte las tareas, las próximas fechas, el horario y el reglamento. ¿Qué quieres saber?`;
  return { texto, intencion: "saludo", derivado: false };
}

export function ayuda(): RespuestaNudito {
  return {
    texto: "Puedo decirte las tareas por entregar, las próximas fechas, si tu hijo llegó hoy, el horario y el reglamento. También te paso con una persona del colegio cuando quieras.",
    intencion: "ayuda",
    derivado: false,
  };
}

export function noCompara(nombre: string | null): RespuestaNudito {
  return {
    texto: `Cada niño avanza a su ritmo, así que no comparo. ${nombre ? `Si quieres, te cuento sobre ${nombre}.` : "Si quieres, te cuento sobre tu hijo."}`,
    intencion: "ayuda",
    derivado: false,
  };
}

export type TareaDato = { titulo: string; curso: string; fechaEntrega: Date };
export type EventoDato = { titulo: string; tipo: string; inicio: Date };

export function respuestaTareas(nombre: string, tareas: TareaDato[], alumnoId: string): RespuestaNudito {
  if (tareas.length === 0) {
    return { texto: `No encuentro tareas por entregar registradas para ${nombre}.`, intencion: "tareas_pendientes", derivado: false, alumnoId };
  }
  const lineas = tareas.map((t) => `• ${t.curso}: ${t.titulo} (entrega el ${formatoFecha(t.fechaEntrega)})`);
  const cuantas = tareas.length === 1 ? "1 tarea por entregar" : `${tareas.length} tareas por entregar`;
  return { texto: `${nombre} tiene ${cuantas}:\n${lineas.join("\n")}`, intencion: "tareas_pendientes", derivado: false, alumnoId };
}

export function respuestaFechas(nombre: string, eventos: EventoDato[], alumnoId: string): RespuestaNudito {
  if (eventos.length === 0) {
    return { texto: `No encuentro fechas próximas en la agenda de ${nombre}.`, intencion: "proximas_fechas", derivado: false, alumnoId };
  }
  const lineas = eventos.map((e) => `• ${e.titulo} (${formatoFechaHora(e.inicio)})`);
  return { texto: `Esto viene en la agenda de ${nombre}:\n${lineas.join("\n")}`, intencion: "proximas_fechas", derivado: false, alumnoId };
}

export type AsistenciaDato = { estado: "llego" | "tarde" | "falta" | "problema"; hora: string } | null;

/** Solo da la buena noticia. Tardanza, falta o problema → deriva a la tutora. */
export function respuestaAsistencia(
  nombre: string,
  dato: AsistenciaDato,
  hijos: { id: string; nombre: string }[],
  alumnoId: string,
): RespuestaNudito {
  if (!dato) {
    return { texto: `Todavía no veo el registro de hoy de ${nombre}.`, intencion: "asistencia_hoy", derivado: false, alumnoId };
  }
  if (dato.estado !== "llego") return derivarATutora("asistencia_hoy", hijos, alumnoId);
  return { texto: `${nombre} llegó al colegio a las ${formatoHora(dato.hora)}`, intencion: "asistencia_hoy", derivado: false, alumnoId };
}

export type NotaDato = { literal: string | null; numerico: number | null };

/** B, C o menos de 11 (escala vigesimal) son notas que merecen conversarse con la tutora. */
export function hayNotaPreocupante(notas: NotaDato[]): boolean {
  return notas.some((n) => n.literal === "B" || n.literal === "C" || (n.numerico !== null && n.numerico < 11));
}

export function respuestaNotas(
  nombre: string,
  notas: NotaDato[],
  hijos: { id: string; nombre: string }[],
  alumnoId: string,
): RespuestaNudito {
  if (notas.length === 0) {
    return { texto: `Todavía no veo notas registradas de ${nombre}.`, intencion: "notas", derivado: false, alumnoId };
  }
  if (hayNotaPreocupante(notas)) return derivarATutora("notas", hijos, alumnoId);
  return {
    texto: `Puedes ver las notas de ${nombre} en la libreta.`,
    intencion: "notas",
    derivado: false,
    alumnoId,
    acciones: [{ tipo: "ir", etiqueta: "Abrir la libreta", valor: rutaLibretaDe(alumnoId) }],
  };
}

export type DocumentoDato = { titulo: string; contenido: string };

export function respuestaDocumento(intencion: "horario" | "reglamento", docs: DocumentoDato[], entradaNormalizada: string): RespuestaNudito {
  if (docs.length === 0) {
    return { texto: `Todavía no hay ${intencion === "horario" ? "un horario" : "un reglamento"} cargado por el colegio.`, intencion, derivado: false };
  }
  if (docs.length === 1) return { texto: `${docs[0].titulo}: ${docs[0].contenido}`, intencion, derivado: false };
  const tokens = new Set(entradaNormalizada.split(" ").filter((t) => t.length >= 4));
  const puntaje = (d: DocumentoDato) =>
    d.titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\W+/).filter((t) => tokens.has(t) || [...tokens].some((x) => t.length >= 5 && x.startsWith(t.slice(0, 5)))).length;
  const mejor = [...docs].sort((a, b) => puntaje(b) - puntaje(a))[0];
  if (puntaje(mejor) > 0) return { texto: `${mejor.titulo}: ${mejor.contenido}`, intencion, derivado: false };
  return {
    texto: `Tengo estos temas: ${docs.map((d) => d.titulo).join(", ")}. Escríbeme cuál te interesa.`,
    intencion,
    derivado: false,
  };
}
