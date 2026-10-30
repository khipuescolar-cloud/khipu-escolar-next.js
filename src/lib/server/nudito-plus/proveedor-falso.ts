// Proveedor de IA FALSO de Nudito+ (specs/29): local, determinista, sin red ni claves. Sirve para desarrollo,
// pruebas y demos mientras no se elija el proveedor real. Responde como un tutor socrático simple en español.
import type { MensajeIA, ProveedorIA, RespuestaIA } from "./proveedor";
import { leerDatosDelSistema, type DatosLeidos, type SitioNudito } from "./prompt";
import { analizarEntrada, normalizar } from "./seguridad";
import { cursoNombrado } from "./temas";

/** Tokens aproximados: 1 token ≈ 4 caracteres. */
export function estimarTokens(texto: string): number {
  return Math.ceil(texto.length / 4);
}

const SIMBOLO: Record<string, "+" | "−" | "×" | "÷"> = {
  "+": "+", mas: "+", "-": "−", "−": "−", menos: "−", x: "×", "×": "×", "*": "×", por: "×", "/": "÷", "÷": "÷", entre: "÷",
};

const RE_OPERACION = /(\d{1,4})\s*(\+|-|−|x|×|\*|\/|÷|\bmas\b|\bmenos\b|\bpor\b|\bentre\b)\s*(\d{1,4})/;
const RE_OPERACION_PREVIA = /(\d{1,4}) ([+−×÷]) (\d{1,4})/;

function operar(a: number, op: string, b: number): number | null {
  if (op === "+") return a + b;
  if (op === "−") return a - b;
  if (op === "×") return a * b;
  if (op === "÷") return b !== 0 && a % b === 0 ? a / b : null;
  return null;
}

/** Elige un sitio permitido de forma estable según el tema (mismo tema → mismo sitio). */
function sitioPara(tema: string, sitios: SitioNudito[]): SitioNudito | null {
  if (sitios.length === 0) return null;
  let h = 0;
  for (const c of tema) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return sitios[h % sitios.length];
}

function recurso(tema: string, d: DatosLeidos): string {
  const s = sitioPara(tema, d.sitios);
  return s ? `\nTe dejo un recurso para practicar: ${s.nombre} → https://${s.dominio}` : "";
}

function saludoNombre(d: DatosLeidos): string {
  return d.nombre ? `, ${d.nombre}` : "";
}

function guiaOperacion(a: number, op: string, b: number): string {
  if (op === "+") return `Sumemos ${a} + ${b} paso a paso. Empieza en ${a} y avanza ${b} más. ¿A qué número llegas?`;
  if (op === "−") return `Para ${a} − ${b}, empieza en ${a} y retrocede ${b}. ¿A qué número llegas?`;
  if (op === "×") return `Piensa ${a} × ${b} como ${a} grupos de ${b}. ¿Cuánto te da si sumas ${b}, ${a} veces?`;
  return `Para ${a} ÷ ${b}, piensa: ¿cuántos grupos de ${b} caben en ${a}? Prueba repartiendo.`;
}

export function responderFalso(sistema: string, mensajes: MensajeIA[]): string {
  const d = leerDatosDelSistema(sistema);
  const ultimo = [...mensajes].reverse().find((m) => m.rol === "usuario")?.texto ?? "";
  const previo = [...mensajes].reverse().find((m) => m.rol === "asistente")?.texto ?? "";
  const t = normalizar(ultimo);
  const crudo = ultimo.toLowerCase();

  // 1) Respuesta del alumno a una operación que Nudito planteó antes.
  const numero = /^\s*(-?\d{1,6})\s*[.!]?\s*$/.exec(ultimo);
  const previa = RE_OPERACION_PREVIA.exec(previo);
  if (numero && previa) {
    const [a, op, b] = [Number(previa[1]), previa[2], Number(previa[3])];
    const r = operar(a, op, b);
    if (r !== null && Number(numero[1]) === r) return `¡Muy bien${saludoNombre(d)}! ${a} ${op} ${b} = ${r}. Lo lograste tú. ¿Probamos con otro?`;
    return `Casi. Revisa con calma: ${guiaOperacion(a, op, b)}`;
  }

  // 2) Pide la respuesta directa: guía sin resolver.
  if (d.guiarSinResolver || analizarEntrada(ultimo).tipo === "trampa") {
    return (
      "No te voy a dar la respuesta, pero sí te ayudo a llegar a ella. Vamos paso a paso:\n" +
      "1. ¿Qué datos te da el problema?\n" +
      "2. ¿Qué te piden encontrar?\n" +
      "Escríbeme el primer paso y lo revisamos juntos."
    );
  }

  // 3) Una operación concreta: pregunta guía (nunca el resultado).
  const op = RE_OPERACION.exec(crudo);
  if (op) {
    const simbolo = SIMBOLO[op[2]];
    if (simbolo) return guiaOperacion(Number(op[1]), simbolo, Number(op[3])) + recurso("Matemática", d);
  }

  // 4) Temas con guía propia (si dice que no entiende, primero lo calma).
  const cuesta = / (no entiendo|no entendi|no le entiendo|no se|esta dificil|me cuesta|no me sale) /.test(t);
  const animo = cuesta ? "¡Tranquilo! Vamos paso a paso.\n" : "";
  if (/ (fraccion\w*) /.test(t)) {
    return (
      animo +
      "Las fracciones son partes de un todo.\n" +
      "Imagina una pizza cortada en 4 partes iguales. Si comes 1, ¿qué fracción comiste?" +
      recurso("Fracciones", d)
    );
  }
  if (/ (resumen|resumir|idea principal|cuento|lectura) /.test(t)) {
    return (
      animo +
      "Para resumir, primero lee todo el texto con calma.\n" +
      "Luego busca la idea más importante de cada párrafo. ¿Cuál crees que es la idea principal del primero?" +
      recurso("Comunicación", d)
    );
  }

  // 5) No entiende: más despacio.
  if (cuesta) {
    return `¡Tranquilo${saludoNombre(d)}! Vamos más despacio.\nDime con tus palabras: ¿qué parte sí entiendes? Desde ahí avanzamos un paso a la vez.`;
  }

  // 6) Pregunta qué es Nudito.
  if (/ (eres (una )?ia|eres (un )?robot|eres real|quien eres|que eres) /.test(t)) {
    return "Soy Nudito, un asistente con inteligencia artificial de Khipu. Te ayudo a aprender; no reemplazo a tu profesor.";
  }

  // 7) Tareas pendientes (solo las de este alumno, que vienen en el prompt).
  if (/ (tarea|tareas|pendiente\w*) /.test(t)) {
    if (d.tareas.length === 0) return "No veo tareas pendientes para estos días. ¿Quieres repasar algún curso?";
    const lista = d.tareas.slice(0, 3).map((x) => `• ${x.curso}: ${x.titulo} (entrega ${x.entrega})`).join("\n");
    return `Tienes estas tareas:\n${lista}\n¿Con cuál empezamos? Cuéntame qué pide y la vemos paso a paso.`;
  }

  // 8) Nombra uno de sus cursos.
  const curso = d.cursos.find((c) => cursoNombrado(t, c));
  if (curso) {
    const desempeno = d.desempenos[curso]?.[0];
    const foco = desempeno ? ` Este bimestre trabajas esto: «${desempeno}».` : "";
    return `¡Buena elección! Practiquemos ${curso}.${foco}\n¿Qué tema quieres repasar?${recurso(curso, d)}`;
  }

  // 9) Saludo.
  if (/ (hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey) /.test(t) || mensajes.length <= 1) {
    const cursos = d.cursos.length > 0 ? ` Puedo ayudarte con ${d.cursos.slice(0, 4).join(", ")}.` : "";
    return `¡Hola${saludoNombre(d)}! Soy Nudito, un asistente con IA.\n¿Con qué curso quieres practicar hoy?${cursos}`;
  }

  // 10) Por defecto: pregunta guía.
  return "Cuéntame un poco más: ¿de qué curso es y qué parte te cuesta? Así te ayudo paso a paso.";
}

export class ProveedorFalso implements ProveedorIA {
  readonly nombre = "falso";

  async responder({ sistema, mensajes }: { sistema: string; mensajes: MensajeIA[] }): Promise<RespuestaIA> {
    const texto = responderFalso(sistema, mensajes);
    const entrada = sistema.length + mensajes.reduce((n, m) => n + m.texto.length, 0);
    return { texto, tokensEntrada: Math.ceil(entrada / 4), tokensSalida: estimarTokens(texto) };
  }
}
