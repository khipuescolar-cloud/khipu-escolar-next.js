// Responsable: A (specs/42). Validación DETERMINISTA del tema que pide el alumno («Otro tema»): grado actual y
// anteriores permitidos; superior solo si está desbloqueado; demasiado avanzado → alternativas amables; ambiguo →
// aclarar; no reconocido → sugerencias. La IA nunca decide aquí. Puro: sin BD, sin azar, sin fecha.
import { areaPorClave, detectarArea, normalizar } from "@/lib/cneb/catalogo";
import { buscarTemas, contieneFrase, posicionGrado, posicionTema, prerrequisitosDe, temasGlobales, temasParecidos } from "./catalogo";
import { AREAS_NUDITO, type AreaNudito, type EntradaValidarTema, type Tema, type ValidacionTema, type ValidarTema } from "./contratos";

export const MAX_CARACTERES_TEMA = 200;
/** Por debajo de este puntaje una coincidencia no cuenta (una palabra útil vale 3). */
const UMBRAL = 3;
/** Coincidencias con puntaje ≥ 85 % del mejor se consideran «igual de buenas». */
const EMPATE = 0.85;
const MAX_OPCIONES = 4;
/** Posición de los temas de educación superior (más allá de 5.° de secundaria). */
const SUPERIOR = 99;

// ───────────── Términos avanzados conocidos que NO están en el catálogo (o están más arriba) ─────────────

export type TerminoAvanzado = {
  area: AreaNudito;
  /** Frases normalizadas (sin tildes, minúsculas). */
  frases: string[];
  nombre: string;
  /** Posición mínima (`posicionGrado`) desde la que el término es «de su grado». `SUPERIOR` = universidad. */
  desde: number;
  /** Búsquedas para proponer alternativas del grado del alumno. */
  alternativas: string[];
};

export const TERMINOS_AVANZADOS: readonly TerminoAvanzado[] = [
  { area: "matematica", frases: ["ecuaciones diferenciales", "ecuacion diferencial"], nombre: "Ecuaciones diferenciales", desde: SUPERIOR, alternativas: ["igualdades", "patrones", "ecuaciones"] },
  { area: "matematica", frases: ["derivada", "derivadas", "derivar", "calculo diferencial"], nombre: "Derivadas", desde: SUPERIOR, alternativas: ["patrones", "proporcionalidad", "funciones"] },
  { area: "matematica", frases: ["integral", "integrales", "integrar", "calculo integral"], nombre: "Integrales", desde: SUPERIOR, alternativas: ["area", "multiplicacion", "patrones"] },
  { area: "matematica", frases: ["limites", "limite de una funcion"], nombre: "Límites", desde: SUPERIOR, alternativas: ["patrones", "fracciones"] },
  { area: "matematica", frases: ["matrices", "matriz", "determinantes"], nombre: "Matrices", desde: SUPERIOR, alternativas: ["tablas", "multiplicacion", "ecuaciones"] },
  { area: "matematica", frases: ["numeros complejos", "numeros imaginarios"], nombre: "Números complejos", desde: SUPERIOR, alternativas: ["numeros enteros", "potencias"] },
  { area: "matematica", frases: ["logaritmo", "logaritmos"], nombre: "Logaritmos", desde: posicionGrado("secundaria", 4), alternativas: ["potencias", "multiplicacion", "patrones"] },
  { area: "matematica", frases: ["trigonometria", "seno", "coseno", "tangente"], nombre: "Trigonometría", desde: posicionGrado("secundaria", 4), alternativas: ["triangulos", "angulos", "proporcionalidad"] },
  { area: "matematica", frases: ["ecuacion cuadratica", "ecuaciones cuadraticas", "segundo grado"], nombre: "Ecuaciones de segundo grado", desde: posicionGrado("secundaria", 3), alternativas: ["ecuaciones", "igualdades", "potencias"] },
  { area: "ciencia-tecnologia", frases: ["adn", "genetica", "genes", "cromosomas"], nombre: "ADN y genética", desde: posicionGrado("secundaria", 4), alternativas: ["celula", "reproduccion", "seres vivos"] },
  { area: "ciencia-tecnologia", frases: ["fotosintesis"], nombre: "Fotosíntesis", desde: posicionGrado("secundaria", 2), alternativas: ["plantas", "seres vivos", "alimentan"] },
  { area: "ciencia-tecnologia", frases: ["mitosis", "meiosis"], nombre: "Mitosis y meiosis", desde: posicionGrado("secundaria", 3), alternativas: ["celula", "reproduccion"] },
  { area: "ciencia-tecnologia", frases: ["mecanica cuantica", "fisica cuantica", "relatividad", "agujeros negros"], nombre: "Física moderna", desde: SUPERIOR, alternativas: ["fuerzas", "energia", "luz"] },
  { area: "ciencia-tecnologia", frases: ["estequiometria", "enlace quimico", "enlaces quimicos"], nombre: "Química avanzada", desde: posicionGrado("secundaria", 3), alternativas: ["materia", "mezclas", "cambios"] },
  { area: "comunicacion", frases: ["analisis sintactico", "sintaxis"], nombre: "Análisis sintáctico", desde: posicionGrado("secundaria", 3), alternativas: ["oracion", "sustantivo", "conectores"] },
  { area: "comunicacion", frases: ["metrica", "versificacion"], nombre: "Métrica y versificación", desde: posicionGrado("secundaria", 3), alternativas: ["poema", "rima", "figuras literarias"] },
];

const PREFIJO_AREA: Record<AreaNudito, string> = { matematica: "mat", comunicacion: "com", "ciencia-tecnologia": "cyt" };
const NOMBRE_AREA: Record<AreaNudito, string> = { matematica: "Matemática", comunicacion: "Comunicación", "ciencia-tecnologia": "Ciencia y Tecnología" };

/** Tema «sintético» para un término avanzado fuera del catálogo: solo se usa en `demasiado_avanzado.solicitado`. Nunca se practica. */
function temaSintetico(t: TerminoAvanzado, plantilla: Tema | undefined): Tema {
  const slug = normalizar(t.nombre).replace(/ /g, "-");
  return {
    clave: `${PREFIJO_AREA[t.area]}.s5.avanzado-${slug}`,
    area: t.area,
    nivel: "secundaria",
    grado: t.desde === SUPERIOR ? 5 : t.desde - 6,
    competenciaCneb: plantilla?.competenciaCneb ?? 1,
    nombre: t.nombre,
    descripcionCorta: "Tema de grados superiores: no está en el catálogo de Nudito.",
    palabrasClave: t.frases,
    prerrequisitos: [],
    dificultad: { min: 5, max: 5 },
    tipos: plantilla?.tipos ?? ["opcion_multiple"],
    fuente: plantilla?.fuente ?? { tipo: "banco", bancoId: "ninguno" },
    repaso: { idea: t.nombre, ejemplo: t.nombre },
    recursos: [],
    origen: "cneb",
    version: 1,
    revisado: null,
  };
}

// ───────────── Entradas que no se procesan (datos personales o insultos) ─────────────

const INSULTOS = new Set(
  "idiota estupido estupida tonto tonta imbecil mierda carajo huevon cojudo cojuda conchatumare ctm puta puto maldito maldita baboso babosa pendejo pendeja tarado tarada".split(" "),
);
const FRASES_PERSONALES = ["me llamo", "mi nombre es", "mi direccion", "vivo en", "mi telefono", "mi celular", "mi numero", "mi dni", "mi contrasena", "mi clave", "mi correo"];

/** true si el texto trae datos personales (correo, teléfono/DNI, «me llamo…») o insultos: se descarta sin repetirlo. */
export function textoNoProcesable(texto: string): boolean {
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(texto)) return true;
  if (/\d[\d\s-]{6,}\d/.test(texto)) return true;
  if (/https?:\/\/|www\./i.test(texto)) return true;
  const n = normalizar(texto);
  if (n.split(" ").some((p) => INSULTOS.has(p))) return true;
  return FRASES_PERSONALES.some((f) => contieneFrase(n, f));
}

// ───────────── Mensajes (Nudito nunca da malas noticias) ─────────────

const MENSAJE_GENERICO = "Escribe solo el nombre del tema que quieres practicar, por ejemplo «fracciones» o «la célula».";

function listaNombres(temas: readonly Tema[]): string {
  const n = temas.map((t) => `«${t.nombre}»`);
  return n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} y ${n[n.length - 1]}`;
}

function mensajeAvanzado(nombre: string, alternativas: readonly Tema[]): string {
  const base = `¡Qué bien que te interese ${nombre}! Es un tema que se aprende más adelante, y vas por buen camino.`;
  return alternativas.length > 0
    ? `${base} Para llegar ahí, te propongo practicar primero ${listaNombres(alternativas)}.`
    : `${base} Mientras tanto, elige un tema de tu grado y seguimos avanzando juntos.`;
}

// ───────────── Validación ─────────────

function delGrado(temas: readonly Tema[], pos: number): Tema[] {
  return temas.filter((t) => posicionTema(t) === pos);
}

/** Alternativas para un tema demasiado avanzado: prerrequisitos alcanzables (el más cercano primero), luego temas
 *  del grado actual de la misma competencia (mismo eje) y, si falta, otros del grado actual. Máx. 3. */
function alternativasPara(solicitado: Tema | null, extra: readonly Tema[], disponibles: readonly Tema[], pos: number): Tema[] {
  const salida: Tema[] = [];
  const agregar = (t: Tema) => {
    if (salida.length < 3 && !salida.some((s) => s.clave === t.clave) && posicionTema(t) <= pos) salida.push(t);
  };
  const disponiblesPorClave = new Map(disponibles.map((t) => [t.clave, t]));
  if (solicitado) {
    const prer = prerrequisitosDe(solicitado.clave, [...disponibles, ...temasGlobales(), solicitado])
      .map((t) => disponiblesPorClave.get(t.clave) ?? t)
      .filter((t) => posicionTema(t) <= pos)
      .sort((a, b) => posicionTema(b) - posicionTema(a));
    prer.forEach(agregar);
  }
  extra.forEach(agregar);
  const actual = delGrado(disponibles, pos);
  if (solicitado) actual.filter((t) => t.competenciaCneb === solicitado.competenciaCneb).forEach(agregar);
  actual.forEach(agregar);
  // Sin temas del grado (p. ej. catálogo incompleto): el grado alcanzable más alto.
  [...disponibles].filter((t) => posicionTema(t) <= pos).sort((a, b) => posicionTema(b) - posicionTema(a)).forEach(agregar);
  return salida;
}

/** Mejor tema alcanzable (≤ pos), del grado más cercano, para cada búsqueda. */
function mejoresAlcanzables(busquedas: readonly string[], disponibles: readonly Tema[], pos: number): Tema[] {
  const alcanzables = disponibles.filter((t) => posicionTema(t) <= pos);
  const salida: Tema[] = [];
  for (const b of busquedas) {
    const r = buscarTemas(b, alcanzables);
    if (r.length === 0) continue;
    const mejor = r[0].puntaje;
    const elegido = r.filter((x) => x.puntaje >= mejor * EMPATE).sort((a, c) => posicionTema(c.tema) - posicionTema(a.tema))[0].tema;
    if (!salida.some((s) => s.clave === elegido.clave)) salida.push(elegido);
  }
  return salida;
}

function demasiadoAvanzado(solicitado: Tema, alternativas: Tema[]): ValidacionTema {
  return { tipo: "demasiado_avanzado", solicitado, alternativas, mensaje: mensajeAvanzado(`«${solicitado.nombre}»`, alternativas) };
}

export const validarTema: ValidarTema = (entrada: EntradaValidarTema): ValidacionTema => {
  const pos = posicionGrado(entrada.nivel, entrada.grado);
  // Disponibles: los temas recibidos (área, nivel del alumno, globales + colegio) y los globales del área en el otro
  // nivel (un alumno de primaria que pide «ecuaciones» → tema de secundaria; uno de secundaria que pide un tema de primaria).
  const recibidos = entrada.temas.filter((t) => t.area === entrada.area);
  const claves = new Set(recibidos.map((t) => t.clave));
  const disponibles = [...recibidos, ...temasGlobales().filter((t) => t.area === entrada.area && t.nivel !== entrada.nivel && !claves.has(t.clave))];
  const sugerenciasDelGrado = () => delGrado(recibidos, pos).slice(0, 3);

  const texto = entrada.texto.trim();
  if (!texto || texto.length > MAX_CARACTERES_TEMA || textoNoProcesable(texto)) {
    return { tipo: "no_reconocido", sugerencias: sugerenciasDelGrado(), mensaje: MENSAJE_GENERICO };
  }
  const n = normalizar(texto);

  // 1) Término avanzado conocido por encima del grado del alumno (aunque alguna palabra suelta coincida con el catálogo).
  const avanzado = TERMINOS_AVANZADOS.find((t) => t.area === entrada.area && t.desde > pos && t.frases.some((f) => contieneFrase(n, f)));
  if (avanzado) {
    const enCatalogo = buscarTemas(texto, disponibles).find((r) => posicionTema(r.tema) >= avanzado.desde && avanzado.frases.some((f) => r.tema.palabrasClave.map(normalizar).includes(f)));
    if (enCatalogo && entrada.desbloqueados.has(enCatalogo.tema.clave)) {
      return { tipo: "permitido", tema: enCatalogo.tema, relacion: "desbloqueado" };
    }
    const solicitado = enCatalogo?.tema ?? temaSintetico(avanzado, recibidos[0] ?? disponibles[0]);
    const alternativas = alternativasPara(enCatalogo?.tema ?? null, mejoresAlcanzables(avanzado.alternativas, disponibles, pos), disponibles, pos);
    return {
      tipo: "demasiado_avanzado",
      solicitado,
      alternativas,
      mensaje: mensajeAvanzado(`«${avanzado.nombre}»`, alternativas),
    };
  }

  // 2) Búsqueda en el área.
  const resultados = buscarTemas(texto, disponibles).filter((r) => r.puntaje >= UMBRAL);
  if (resultados.length > 0) {
    const mejor = resultados[0].puntaje;
    const empatados = resultados.filter((r) => r.puntaje >= mejor * EMPATE).map((r) => r.tema);
    const alcanzables = empatados.filter((t) => posicionTema(t) <= pos);
    if (alcanzables.length > 0) {
      const actuales = alcanzables.filter((t) => posicionTema(t) === pos);
      if (actuales.length === 1) return { tipo: "permitido", tema: actuales[0], relacion: "grado_actual" };
      if (alcanzables.length === 1) return { tipo: "permitido", tema: alcanzables[0], relacion: "grado_anterior" };
      const opciones = (actuales.length > 1 ? actuales : [...alcanzables].sort((a, b) => posicionTema(b) - posicionTema(a))).slice(0, MAX_OPCIONES);
      return { tipo: "ambiguo", opciones, pregunta: "Encontré varios temas parecidos. ¿Cuál quieres practicar?" };
    }
    const desbloqueados = empatados.filter((t) => entrada.desbloqueados.has(t.clave));
    if (desbloqueados.length === 1) return { tipo: "permitido", tema: desbloqueados[0], relacion: "desbloqueado" };
    if (desbloqueados.length > 1) {
      return { tipo: "ambiguo", opciones: desbloqueados.slice(0, MAX_OPCIONES), pregunta: "Encontré varios temas parecidos. ¿Cuál quieres practicar?" };
    }
    const solicitado = [...empatados].sort((a, b) => posicionTema(a) - posicionTema(b))[0];
    return demasiadoAvanzado(solicitado, alternativasPara(solicitado, [], disponibles, pos));
  }

  // 3) ¿Es de otra área? (catálogo de Nudito, términos avanzados o nombre de un área del CNEB: «historia», «inglés»…)
  const cneb = detectarArea(texto)?.area ?? palabrasArea(n);
  if (cneb && cneb !== entrada.area) {
    const nombre = areaPorClave(cneb)?.nombre ?? cneb;
    return { tipo: "fuera_de_area", areaDetectada: cneb, mensaje: `Ese tema parece de ${nombre}. Aquí practicamos ${NOMBRE_AREA[entrada.area]}: elige un tema de este curso.` };
  }

  for (const area of AREAS_NUDITO) {
    if (area === entrada.area) continue;
    const otros = temasGlobales().filter((t) => t.area === area);
    const fuerte = buscarTemas(texto, otros).some((r) => r.puntaje >= UMBRAL);
    const termino = TERMINOS_AVANZADOS.some((t) => t.area === area && t.frases.some((f) => contieneFrase(n, f)));
    if (fuerte || termino) {
      return { tipo: "fuera_de_area", areaDetectada: area, mensaje: `Ese tema es de ${NOMBRE_AREA[area]}. Elige ese curso y lo practicamos juntos.` };
    }
  }
  // 4) No reconocido: sugerencias por similitud (alcanzables) o del grado actual.
  const parecidos = temasParecidos(texto, disponibles.filter((t) => posicionTema(t) <= pos));
  return {
    tipo: "no_reconocido",
    sugerencias: parecidos.length > 0 ? parecidos : sugerenciasDelGrado(),
    mensaje: "No encontré ese tema, pero aquí tienes algunos que puedes practicar. También puedes escribirlo con otras palabras.",
  };
};

/** Palabras sueltas que delatan otra área del CNEB (detectarArea solo mira el inicio del texto, como nombre de curso). */
function palabrasArea(n: string): string | null {
  for (const a of ["ingles", "historia", "geografia", "religion", "arte", "musica", "educacion fisica", "computacion"]) {
    if (contieneFrase(n, a)) return detectarArea(a)?.area ?? null;
  }
  return null;
}
