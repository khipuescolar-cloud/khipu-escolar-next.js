// Filtros de seguridad de Nudito+ (specs/29). Puros: entrada del alumno y salida del proveedor de IA.
// Español del Perú (incluye jerga común). Un filtro por palabras no es perfecto: es la primera barrera y
// conviene equivocarse hacia «pedir ayuda a un adulto».

/** Minúsculas, sin tildes ni signos, espacios simples (la «ñ» queda como «n»). */
export function normalizar(texto: string): string {
  return ` ${texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

export type CategoriaSeguridad = "autolesion" | "violencia" | "abuso";

export type AnalisisEntrada =
  | { tipo: "ok" }
  /** Riesgo: se bloquea, se crea AlertaNudito «seguridad» y se responde con el mensaje seguro. */
  | { tipo: "seguridad"; categoria: CategoriaSeguridad }
  /** Desánimo: no se bloquea; respuesta cálida y AlertaNudito «animo». */
  | { tipo: "animo" }
  /** Insultos o contenido no apto: se bloquea y se rechaza con amabilidad. */
  | { tipo: "inapropiado" }
  /** Pide datos personales de otra persona: se bloquea. */
  | { tipo: "datos_ajenos" }
  /** Pide la respuesta de la tarea: no se bloquea; se guía paso a paso sin resolver. */
  | { tipo: "trampa" };

const RE_AUTOLESION =
  / (me quiero morir|quiero morir(me)?|me voy a matar|me quiero matar|matarme|suicid\w*|cortarme|me corto (las|los|mis)? ?(brazos|venas|munecas|piernas)|hacerme dano|lastimarme|no quiero vivir|no quiero seguir viviendo|mejor no existir|quitarme la vida|ya no quiero estar aqui) /;
const RE_VIOLENCIA =
  / (me pegan|me pega (mi|mis|el|la)|me golpean|me golpea|me chancan|me chanca|me agarran a golpes|me sacan la mugre|me amenazan|me amenaza|me hacen bullying|me hacen bulin|bullying|lo voy a matar|la voy a matar|los voy a matar|voy a matar a|llevar un arma|traer un arma|pistola) /;
const RE_ABUSO =
  / (partes intimas|me tocan (mis|mi|el|la)? ?(partes|cuerpo|pecho|pierna)|me toca (mis|mi|el|la)? ?(partes|cuerpo|pecho)|me toco (mis|mi|el|la)? ?(partes|cuerpo|pecho)|abusan de mi|abuso de mi|abusaron|me violaron|violacion|me obliga a desvestirme|me pide fotos|me pidio fotos|fotos desnud\w*|fotos calat\w*) /;
const RE_ANIMO =
  / (estoy (muy )?triste|me siento (muy )?(triste|solo|sola|mal conmigo)|nadie me quiere|odio mi vida|estoy deprimid\w*|lloro todos los dias|no tengo amigos|me siento inutil|soy un fracaso|soy una fracasada|soy un fracasado) /;
const RE_INAPROPIADO =
  / (huevon\w*|webon\w*|cojud\w*|conchatumare|conchasumare|conchetumare|ctm|csm|ptm|mierda|puta|puto|putas|imbecil|estupid\w*|idiota|tarad\w*|pendej\w*|carajo|chucha|pichula|porno\w*|pornografia|xxx|marihuana|cocaina|drogarme|emborracharme) /;
const RE_TRAMPA =
  / ((dame|dime|pasame|mandame|escribeme|ponme) (solo )?(la |las |el |los )?(respuesta|respuestas|resultado|resultados|solucion|soluciones)|(hazme|haz|haceme|resuelveme|resuelve|resolve) (la |mi |el |este |esta |toda la )?(tarea|ejercicio|ejercicios|problema|problemas|ficha|practica)|hazlo tu|resuelvelo tu|solo (dame|dime) el resultado|escribeme (el|un|mi) (resumen|ensayo|cuento|texto|trabajo)|(quiero|necesito) copiar) /;

const PALABRAS_DATO = "telefono|celular|numero|direccion|correo|email|contrasena|clave|password|dni|notas|nota|libreta|apellido|instagram|tiktok|facebook|whatsapp|foto|fotos|edad";
const RE_TERCERO = / (companer\w*|amig\w*|vecin\w*|profe\w*|miss|tutor\w*|papa de|mama de|el chico|la chica|otro alumno|otra alumna|otros alumnos) /;
const RE_DATO = new RegExp(` (${PALABRAS_DATO}) `);
const RE_DONDE_VIVE = / donde vive /;
/** «el teléfono de Valentina» (nombre propio u otra persona), sin contar «de mi», cursos ni temas. */
const RE_DATO_DE = / (telefono|celular|direccion|correo|email|contrasena|clave|password|dni|notas|nota|libreta|apellido|apellidos|instagram|tiktok|whatsapp) de (\w+)/;
const NO_SON_PERSONAS = new Set(["mi", "mis", "yo", "la", "el", "un", "una", "los", "las", "este", "esta", "hoy", "ayer", "matematica", "comunicacion", "ciencia", "ciencias", "arte", "musica", "ingles", "historia", "religion", "tutoria", "fisica", "personal", "educacion", "computo", "telefono", "casa", "emergencia", "sol", "fa", "acceso", "corte"]);

export type OpcionesEntrada = {
  /** Cursos del alumno (normalizados o no): «notas de Matemática» no es un dato ajeno. */
  cursos?: string[];
};

/** Clasifica el mensaje del alumno. Orden: seguridad > datos ajenos > inapropiado > ánimo > trampa > ok. */
export function analizarEntrada(texto: string, opciones: OpcionesEntrada = {}): AnalisisEntrada {
  const t = normalizar(texto);
  if (RE_AUTOLESION.test(t)) return { tipo: "seguridad", categoria: "autolesion" };
  if (RE_ABUSO.test(t)) return { tipo: "seguridad", categoria: "abuso" };
  if (RE_VIOLENCIA.test(t)) return { tipo: "seguridad", categoria: "violencia" };
  if (pideDatosAjenos(t, opciones.cursos ?? [])) return { tipo: "datos_ajenos" };
  if (RE_INAPROPIADO.test(t)) return { tipo: "inapropiado" };
  if (RE_ANIMO.test(t)) return { tipo: "animo" };
  if (RE_TRAMPA.test(t)) return { tipo: "trampa" };
  return { tipo: "ok" };
}

function pideDatosAjenos(t: string, cursos: string[]): boolean {
  if (RE_DONDE_VIVE.test(t)) return true;
  if (RE_DATO.test(t) && RE_TERCERO.test(t)) return true;
  const m = RE_DATO_DE.exec(t);
  if (!m) return false;
  const palabra = m[2];
  const cursosNorm = new Set(cursos.flatMap((c) => normalizar(c).trim().split(" ")));
  return !NO_SON_PERSONAS.has(palabra) && !cursosNorm.has(palabra);
}

// ───────────── Respuestas fijas (no pasan por el proveedor) ─────────────

export const RESPUESTA_SEGURIDAD =
  "Gracias por contármelo. Lo que me cuentas es importante y no tienes que pasar por esto sin ayuda.\n" +
  "Habla hoy con un adulto de confianza: tu mamá, tu papá, tu tutor o tu profesor.\n" +
  "Si estás en peligro ahora, pide ayuda a un adulto cerca o llama gratis a la Línea 100. Si te sientes muy triste, llama a la Línea 113, opción 5.\n" +
  "Soy una IA: para esto necesitas a una persona.";

export const RESPUESTA_ANIMO =
  "Siento que te sientas así. Está bien sentirse triste a veces.\n" +
  "Cuéntaselo a un adulto de confianza: te puede ayudar mucho.\n" +
  "Si quieres, también practicamos algo juntos, a tu ritmo.";

export const RESPUESTA_INAPROPIADO = "Mejor usemos palabras amables. Estoy aquí para ayudarte a aprender. ¿Con qué curso seguimos?";

export const RESPUESTA_DATOS_AJENOS =
  "No puedo darte datos de otras personas: son privados.\n" +
  "Si necesitas algo de un compañero, pregúntale a él o a tu profesor. ¿Te ayudo con alguna tarea?";

/** Si la salida del proveedor no pasa el filtro, se reemplaza por esto. */
export const RESPUESTA_SALIDA_BLOQUEADA = "Mejor sigamos con tu tarea. ¿Qué parte quieres practicar ahora?";

const CATEGORIA_LEGIBLE: Record<CategoriaSeguridad, string> = {
  autolesion: "un posible riesgo para su bienestar",
  violencia: "una posible situación de violencia o acoso",
  abuso: "una posible situación de abuso",
};

/** Texto de la alerta para la familia: resumen, nunca la cita textual del alumno. */
export function detalleAlertaSeguridad(categoria: CategoriaSeguridad, nombreAlumno: string): string {
  return `Nudito+ detectó un tema delicado en una conversación de ${nombreAlumno} (${CATEGORIA_LEGIBLE[categoria]}) y le pidió hablar con un adulto de confianza. Conversa con calma; si lo necesitas, pide apoyo al colegio.`;
}

export function detalleAlertaAnimo(nombreAlumno: string): string {
  return `${nombreAlumno} le contó a Nudito+ que se siente desanimado. Nudito le sugirió hablar con un adulto de confianza. Un buen momento para conversar.`;
}

// ───────────── Enlaces: solo dominios permitidos ─────────────

export const ENLACE_QUITADO = "[enlace quitado]";

const RE_URL =
  /\b(?:https?:\/\/[^\s<>()"'\]]+|www\.[^\s<>()"'\]]+|(?:[a-z0-9-]+\.)+(?:com|org|net|pe|edu|gob|io|info|app|co|es|ly|me|tv|xyz|site|online|ai|dev)(?:\/[^\s<>()"'\]]*)?)/gi;

/** Host en minúsculas sin «www.» de una URL con o sin esquema; null si no se puede leer. */
export function hostDeUrl(url: string): string | null {
  const conEsquema = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    return new URL(conEsquema).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** El dominio está en la lista blanca (también sus subdominios). */
export function dominioPermitido(host: string, dominios: readonly string[]): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  return dominios.some((d) => {
    const dom = d.toLowerCase().replace(/^www\./, "");
    return h === dom || h.endsWith(`.${dom}`);
  });
}

/** Quita toda URL cuyo dominio no esté permitido. Devuelve el texto limpio y las URLs quitadas. */
export function quitarEnlacesNoPermitidos(texto: string, dominios: readonly string[]): { texto: string; quitados: string[] } {
  const quitados: string[] = [];
  const limpio = texto.replace(RE_URL, (crudo) => {
    const url = crudo.replace(/[.,;:!?]+$/, "");
    const cola = crudo.slice(url.length);
    const host = hostDeUrl(url);
    if (host && dominioPermitido(host, dominios)) return crudo;
    quitados.push(url);
    return `${ENLACE_QUITADO}${cola}`;
  });
  return { texto: limpio, quitados };
}

const RE_CORREO = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const RE_CELULAR = /(?<!\d)(?:\+?51\s?)?9\d{2}[\s-]?\d{3}[\s-]?\d{3}(?!\d)/g;

export type AnalisisSalida = { texto: string; bloqueado: boolean; enlacesQuitados: string[] };

/**
 * Filtro de la respuesta del proveedor: oculta correos y celulares, quita enlaces fuera de la lista blanca
 * y reemplaza la respuesta entera si trae contenido no apto o de riesgo.
 */
export function analizarSalida(texto: string, dominios: readonly string[]): AnalisisSalida {
  const t = normalizar(texto);
  if (RE_INAPROPIADO.test(t) || RE_ABUSO.test(t)) return { texto: RESPUESTA_SALIDA_BLOQUEADA, bloqueado: true, enlacesQuitados: [] };
  const sinDatos = texto.replace(RE_CORREO, "[dato privado]").replace(RE_CELULAR, "[dato privado]");
  const { texto: limpio, quitados } = quitarEnlacesNoPermitidos(sinDatos, dominios);
  return { texto: limpio, bloqueado: false, enlacesQuitados: quitados };
}
