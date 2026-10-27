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

// ───────────── Nombres que no son de los hijos ─────────────
// Si la familia pregunta por un niño que no es su hijo, Nudito NO debe responder con los datos de su hijo
// como si fuera ese otro niño, ni revelar si ese alumno existe en el colegio (specs/13). Detector puro y conservador:
// nombres de pila comunes en cualquier posición, palabras con mayúscula fuera del inicio de una oración,
// y la palabra que sigue a «mi hijo/hija…».

/** Nombres de pila frecuentes (normalizados). Se evitan los que también son palabras comunes (luz, paz, flor, sol…). */
const NOMBRES_COMUNES = new Set(
  (
    "mateo santiago sebastian thiago tiago valentino leonardo matias gael dylan liam lucas joaquin benjamin adrian diego daniel " +
    "alejandro gabriel samuel nicolas emiliano maximiliano rodrigo fernando carlos jose juan luis jorge miguel pedro pablo andres " +
    "manuel ricardo eduardo francisco antonio javier martin bruno franco renato piero fabricio alonso gonzalo ignacio esteban " +
    "jesus cristian christian kevin brayan jhon jhonatan jean anthony alexander alessandro alvaro hugo ivan oscar raul sergio " +
    "valentina sofia camila isabella valeria mariana luciana ximena daniela gabriela victoria martina antonella fernanda " +
    "catalina renata emilia regina julieta romina allison ariana alessandra adriana andrea carla carolina claudia diana " +
    "elena fiorella gianella jimena karla katherine kiara lucia luana maria mia micaela naomi natalia nicole paola " +
    "patricia rafaela sara sarah tatiana vanessa ana belen brenda cielo dayana estrella fatima itzel nayeli zoe abigail " +
    "ashley melany milagros rocio sandra silvia susana yesenia ingrid janet rosa"
  ).split(" "),
);

/** Palabras que pueden ir con mayúscula sin ser el nombre de un niño (cursos, días, meses, saludos, lugares…). */
const NO_NOMBRES = new Set(
  (
    "hola buenas buenos gracias muchas que como cuando cuanto cuantos donde cual cuales quien por para con sin del las los una uno " +
    "mi mis tu tus su sus hoy ayer manana semana mes ano dia noche tarde lunes martes miercoles jueves viernes sabado domingo " +
    "enero febrero marzo abril mayo junio julio agosto septiembre setiembre octubre noviembre diciembre " +
    "matematica matematicas comunicacion ingles ciencia ciencias tecnologia ambiente arte religion personal social sociales " +
    "educacion fisica computacion historia geografia economia civica tutoria musica danza teatro deporte quimica biologia " +
    "literatura lenguaje razonamiento verbal aritmetica algebra geometria trigonometria frances quechua aymara " +
    "nudito khipu escolar colegio profesor profesora profe miss tutor tutora director directora dios lima peru " +
    "primaria secundaria inicial grado seccion salon aula clase curso curso nivel bimestre trimestre periodo unidad " +
    "ok okay listo vale bien mal hijo hija hijos hijas nino nina ninos ninas alumno alumna"
  ).split(" "),
);

const TITULOS = new Set(
  "profesor profesora profe miss tutor tutora senor senora senorita sr sra srta don dona director directora maestro maestra lic licenciada licenciado doctor doctora dr dra auxiliar psicologa psicologo"
    .split(" "),
);

const PARENTESCO = new Set("hijo hija hijito hijita nino nina sobrino sobrina nieto nieta menor mayor engreido engreida".split(" "));

export type OpcionesNombres = {
  /** Palabras que no cuentan como nombre ajeno: el nombre del apoderado, el del colegio… */
  excluir?: string[];
};

function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/**
 * Nombres de personas que aparecen en el mensaje y que NO son de los hijos del apoderado.
 * No consulta la BD: nunca revela si ese alumno existe en el colegio.
 */
export function nombresAjenos(texto: string, hijos: Hijo[], opciones: OpcionesNombres = {}): string[] {
  const propios = new Set(
    hijos.flatMap((h) => palabras(normalizar(`${h.nombres} ${h.apellidos ?? ""}`))),
  );
  const excluidos = new Set((opciones.excluir ?? []).flatMap((e) => palabras(normalizar(e))));
  const salida: string[] = [];
  const tokens = [...texto.matchAll(/\p{L}+/gu)];
  tokens.forEach((m, i) => {
    const original = m[0];
    const n = normalizar(original);
    if (n.length < 3 || n.includes(" ") || propios.has(n) || excluidos.has(n) || NO_NOMBRES.has(n)) return;
    const previo = i > 0 ? normalizar(tokens[i - 1][0]) : "";
    if (TITULOS.has(previo)) return; // «la miss Lucía», «la profesora Ana»: no es un niño
    if (detectarIntencion(original) !== "desconocido" || esTemaDelicado(original)) return; // «Tareas», «Notas», «Tarde»…
    const antes = texto.slice(0, m.index).trimEnd();
    const inicioOracion = antes === "" || /[.!?¿¡\n]$/.test(antes);
    const conMayuscula = /^\p{Lu}/u.test(original) && !inicioOracion;
    if (NOMBRES_COMUNES.has(n) || conMayuscula || PARENTESCO.has(previo)) {
      const nombre = capitalizar(original);
      if (!salida.includes(nombre)) salida.push(nombre);
    }
  });
  return salida;
}

/** Respuesta corta a «¿de cuál hijo?» que no es ninguno de ellos («pepe»): 1 o 2 palabras sin intención. */
function pareceSoloUnNombre(texto: string, opciones: OpcionesNombres): string | null {
  const tokens = [...texto.matchAll(/\p{L}+/gu)].map((m) => m[0]);
  if (tokens.length === 0 || tokens.length > 2) return null;
  const excluidos = new Set((opciones.excluir ?? []).flatMap((e) => palabras(normalizar(e))));
  const n = normalizar(tokens[0]);
  if (n.length < 3 || NO_NOMBRES.has(n) || excluidos.has(n) || SALUDO.test(n)) return null;
  return capitalizar(tokens[0]);
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
  | { tipo: "no_es_hijo"; nombre: string; intencion: Intencion }
  | { tipo: "delicado"; intencion: Intencion }
  | { tipo: "preguntar_hijo"; intencion: Intencion }
  | { tipo: "resolver"; intencion: Intencion; hijo: Hijo | null };

/** Intenciones en las que un nombre ajeno cambia la respuesta (las del colegio, como horario o reglamento, no). */
const SOBRE_UN_NINO: Intencion[] = [...NECESITAN_HIJO, "desconocido", "hablar_con_persona"];

/** Decide qué hacer con el mensaje sin tocar la BD. */
export function decidir(entrada: string, hijos: Hijo[], historial: MensajeHistorial[], opciones: OpcionesNombres = {}): Decision {
  if (pideComparar(entrada)) return { tipo: "comparar" };

  let intencion = detectarIntencion(entrada);
  const mencionados = hijosMencionados(entrada, hijos);
  const pendiente = intencionPendiente(historial);

  // Respuesta a «¿de cuál hijo?»: el mensaje es solo el nombre.
  if (intencion === "desconocido" && mencionados.length > 0 && pendiente) intencion = pendiente;

  // Nombra a un niño que no es su hijo: nunca se responde con los datos de su hijo como si fuera el otro.
  if (mencionados.length === 0 && SOBRE_UN_NINO.includes(intencion)) {
    const ajeno =
      nombresAjenos(entrada, hijos, opciones)[0] ??
      (intencion === "desconocido" && pendiente ? pareceSoloUnNombre(entrada, opciones) : null);
    if (ajeno) return { tipo: "no_es_hijo", nombre: ajeno, intencion: intencion === "desconocido" && pendiente ? pendiente : intencion };
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
