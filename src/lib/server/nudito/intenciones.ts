// Detección de intención y de hijo: funciones puras (sin BD) para poder probarlas.
import { normalizar, palabras } from "./normalizar";
import type { Hijo, Intencion, MensajeHistorial } from "./tipos";

const PATRONES: [Intencion, RegExp][] = [
  ["hablar_con_persona", /\b(persona|humano|agente|alguien del colegio)\b|\b(hablar|conversar|comunicar\w*|contactar|escribir\w*|llamar)\b.*\b(profesor\w*|tutor\w*|maestr\w*|docente|colegio|direccion|secretaria)\b/],
  ["horario", /\b(horario\w*|hora de (entrada|salida|ingreso)|a que hora (entra|sale|es el ingreso|es la salida|ingresa|empiezan|empieza|terminan)|salida)\b/],
  ["reglamento", /\b(reglamento|normas?|reglas?|uniforme|justific\w*|permisos?|disciplina|conducta|politicas?)\b/],
  ["tareas_pendientes", /\b(tareas?|trabajos?|asignaciones?|entregar|entrega|entregas)\b/],
  ["proximas_fechas", /\b(fechas?|agenda|examen\w*|reunion\w*|feriados?|eventos?|actividad\w*|calendario|proxim\w*)\b/],
  ["asistencia_hoy", /\b(asistencia|asistio|asistir|llego|llegar|llegada|ingreso|entro|falto|faltas?|faltado|ausente|ausencia|inasistencia|tarde|tardanzas?|presente|ya esta en el colegio)\b/],
  ["notas", /\b(notas?|calificacion\w*|libreta|promedio|puntaje|evaluacion\w*|desaprob\w*|aprob\w*|rendimiento|como le va)\b/],
  ["ayuda", /\b(ayuda|ayudar\w*|ayudame|que puedes|que sabes|que haces|como funciona|opciones|menu)\b/],
];

const SALUDO = /^(hola|holi|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|saludos|que tal|gracias|muchas gracias|ok|listo|chau|adios)\b/;

/** Palabras de temas delicados: nunca se responden con datos, se derivan a la tutora. */
const DELICADO = /\b(falto|faltas?|faltado|inasistencias?|ausente|ausencias?|tarde|tardanzas?|problemas?|reprob\w*|desaprob\w*|jalad\w*|jalo|bajo rendimiento|nota baja|notas bajas|mal|castigo\w*|bullying|acoso|pelea\w*)\b/;

const COMPARAR = /\b(compar\w*|ranking|puestos?|orden de merito|mejor que|peor que|mas que|menos que|el mejor|el peor|los mejores|primer puesto|los demas|companer\w*)\b/;

export function detectarIntencion(texto: string): Intencion {
  const norm = normalizar(texto);
  if (!norm) return "desconocido";
  for (const [intencion, re] of PATRONES) {
    if (re.test(norm)) return intencion;
  }
  if (SALUDO.test(norm) && palabras(norm).length <= 4) return "saludo";
  return "desconocido";
}

/** «falta» en «¿qué falta por entregar?» es de tareas, no de asistencia. */
export function esTemaDelicado(texto: string): boolean {
  const norm = normalizar(texto);
  if (/\b(tareas?|trabajos?|entregar|entrega)\b/.test(norm) && !/\b(falto|faltado|inasistencias?|ausente)\b/.test(norm)) return false;
  return DELICADO.test(norm);
}

export function pideComparar(texto: string): boolean {
  return COMPARAR.test(normalizar(texto));
}

export function esAgradecimiento(texto: string): boolean {
  return /\bgracias\b/.test(normalizar(texto));
}

const NECESITAN_HIJO: Intencion[] = ["tareas_pendientes", "proximas_fechas", "asistencia_hoy", "notas"];

export function intencionNecesitaHijo(i: Intencion): boolean {
  return NECESITAN_HIJO.includes(i);
}

/** Hijos cuyo nombre aparece en el mensaje (por cualquiera de sus nombres de pila). */
export function hijosMencionados(texto: string, hijos: Hijo[]): Hijo[] {
  const pal = new Set(palabras(normalizar(texto)));
  return hijos.filter((h) => palabras(normalizar(h.nombres)).some((n) => n.length >= 3 && pal.has(n)));
}

/** Primer nombre para hablarle a la familia. */
export function nombreCorto(h: Pick<Hijo, "nombres">): string {
  return h.nombres.trim().split(/\s+/)[0] ?? h.nombres;
}

const PREFIJO_PENDIENTE = "elegir_hijo:";

export function marcarPendiente(i: Intencion): string {
  return `${PREFIJO_PENDIENTE}${i}`;
}

/** Si la última respuesta de Nudito preguntó «¿de cuál hijo?», devuelve la intención que quedó pendiente. */
export function intencionPendiente(historial: MensajeHistorial[]): Intencion | null {
  const ultimo = [...historial].reverse().find((m) => m.autor === "nudito");
  if (!ultimo?.intencion?.startsWith(PREFIJO_PENDIENTE)) return null;
  const i = ultimo.intencion.slice(PREFIJO_PENDIENTE.length) as Intencion;
  return intencionNecesitaHijo(i) ? i : null;
}

export type Decision =
  | { tipo: "comparar" }
  | { tipo: "delicado"; intencion: Intencion }
  | { tipo: "preguntar_hijo"; intencion: Intencion }
  | { tipo: "resolver"; intencion: Intencion; hijo: Hijo | null };

/** Decide qué hacer con el mensaje sin tocar la BD. */
export function decidir(entrada: string, hijos: Hijo[], historial: MensajeHistorial[]): Decision {
  if (pideComparar(entrada)) return { tipo: "comparar" };

  let intencion = detectarIntencion(entrada);
  const mencionados = hijosMencionados(entrada, hijos);

  // Respuesta a «¿de cuál hijo?»: el mensaje es solo el nombre.
  if (intencion === "desconocido" && mencionados.length > 0) {
    const pendiente = intencionPendiente(historial);
    if (pendiente) intencion = pendiente;
  }

  if (["asistencia_hoy", "notas", "desconocido", "ayuda"].includes(intencion) && esTemaDelicado(entrada)) {
    return { tipo: "delicado", intencion };
  }

  if (intencionNecesitaHijo(intencion)) {
    if (hijos.length === 1) return { tipo: "resolver", intencion, hijo: hijos[0] };
    if (mencionados.length === 1) return { tipo: "resolver", intencion, hijo: mencionados[0] };
    return { tipo: "preguntar_hijo", intencion };
  }
  return { tipo: "resolver", intencion, hijo: mencionados.length === 1 ? mencionados[0] : hijos.length === 1 ? hijos[0] : null };
}
