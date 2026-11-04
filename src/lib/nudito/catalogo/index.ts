// Responsable: A (specs/42). Catálogo GLOBAL de temas de Nudito, en código (JSON por área en esta carpeta, revisado
// por PR, como el catálogo CNEB de src/lib/cneb). Puro: sin BD. Los temas propios del colegio se suman en
// src/lib/server/nudito/catalogo.ts.
//
// Primera versión: borrador escrito por el equipo (`revisado: null`), alineado a desempeños del CNEB del repo pero
// PENDIENTE de revisión docente. No es el currículo oficial completo (cobertura en specs/42).
import { normalizar } from "@/lib/cneb/catalogo";
import { esquemaTema, type AreaNudito, type FuenteTema, type NivelNudito, type Tema, type TemaClave } from "../contratos";
import cienciaTecnologia from "./ciencia-tecnologia.json";
import comunicacion from "./comunicacion.json";
import matematica from "./matematica.json";

const CRUDO: Record<AreaNudito, unknown[]> = { matematica, comunicacion, "ciencia-tecnologia": cienciaTecnologia };

/** IDs de fuente acordados con el Dev B (generadores, banco y colecciones que implementa specs/43). */
export const FUENTES_CONOCIDAS = {
  generador: ["mat.operaciones", "mat.fracciones", "mat.proporcionalidad", "mat.porcentajes", "mat.ecuaciones", "mat.geometria", "mat.patrones"],
  banco: ["cyt.banco"],
  lecturas: ["com.lecturas", "com.escritura"],
} as const satisfies Record<FuenteTema["tipo"], readonly string[]>;

export function idDeFuente(f: FuenteTema): string {
  return f.tipo === "generador" ? f.generadorId : f.tipo === "banco" ? f.bancoId : f.coleccionId;
}

export function fuenteConocida(f: FuenteTema): boolean {
  return (FUENTES_CONOCIDAS[f.tipo] as readonly string[]).includes(idDeFuente(f));
}

/** Orden total de grados: primaria 1–6 → 1–6; secundaria 1–5 → 7–11. */
export function posicionGrado(nivel: NivelNudito, grado: number): number {
  return nivel === "primaria" ? grado : 6 + grado;
}

export function posicionTema(t: Pick<Tema, "nivel" | "grado">): number {
  return posicionGrado(t.nivel, t.grado);
}

// ───────────── Carga validada (una vez por proceso) ─────────────

let cache: { todos: readonly Tema[]; porClave: Map<TemaClave, Tema> } | null = null;

function cargar() {
  if (cache) return cache;
  const todos: Tema[] = [];
  const porClave = new Map<TemaClave, Tema>();
  for (const [area, lista] of Object.entries(CRUDO) as [AreaNudito, unknown[]][]) {
    for (const crudo of lista) {
      const r = esquemaTema.safeParse(crudo);
      const clave = (crudo as { clave?: string })?.clave ?? "?";
      if (!r.success) throw new Error(`Catálogo Nudito: tema no válido ${clave} (${area}): ${r.error.message}`);
      if (r.data.area !== area) throw new Error(`Catálogo Nudito: ${clave} está en el archivo de ${area}`);
      if (porClave.has(r.data.clave)) throw new Error(`Catálogo Nudito: clave repetida ${clave}`);
      todos.push(r.data);
      porClave.set(r.data.clave, r.data);
    }
  }
  cache = { todos, porClave };
  return cache;
}

/** Todos los temas globales, validados con `esquemaTema` al cargar. */
export function temasGlobales(): readonly Tema[] {
  return cargar().todos;
}

/** Temas de un área para un nivel; con `grado`, solo ese grado. Orden: grado y luego orden del archivo. */
export function temasDe(area: AreaNudito, nivel: NivelNudito, grado?: number): Tema[] {
  return temasGlobales()
    .filter((t) => t.area === area && t.nivel === nivel && (grado === undefined || t.grado === grado))
    .sort((a, b) => a.grado - b.grado);
}

export function temaPorClave(clave: TemaClave): Tema | null {
  return cargar().porClave.get(clave) ?? null;
}

/** Claves de los temas que usan una fuente (p. ej. «cyt.banco»): sirven para etiquetar ítems y lecturas. */
export function clavesPorFuente(fuenteId: string, temas: readonly Tema[] = temasGlobales()): TemaClave[] {
  return temas.filter((t) => idDeFuente(t.fuente) === fuenteId).map((t) => t.clave);
}

/** Prerrequisitos transitivos (sin repetir, del más cercano al más lejano). Ignora claves que no existen. */
export function prerrequisitosDe(clave: TemaClave, temas: readonly Tema[] = temasGlobales()): Tema[] {
  const porClave = new Map(temas.map((t) => [t.clave, t]));
  const vistos = new Set<TemaClave>([clave]);
  const salida: Tema[] = [];
  let frontera = porClave.get(clave)?.prerrequisitos ?? [];
  while (frontera.length > 0) {
    const siguiente: TemaClave[] = [];
    for (const c of frontera) {
      if (vistos.has(c)) continue;
      vistos.add(c);
      const t = porClave.get(c);
      if (!t) continue;
      salida.push(t);
      siguiente.push(...t.prerrequisitos);
    }
    frontera = siguiente;
  }
  return salida;
}

/** Un ciclo de prerrequisitos (lista de claves) o null. Para la prueba de integridad y la validación de temas del colegio. */
export function cicloDePrerrequisitos(temas: readonly Pick<Tema, "clave" | "prerrequisitos">[]): TemaClave[] | null {
  const porClave = new Map(temas.map((t) => [t.clave, t]));
  const estado = new Map<TemaClave, 1 | 2>(); // 1 = en la pila, 2 = terminado
  const pila: TemaClave[] = [];
  const visitar = (c: TemaClave): TemaClave[] | null => {
    if (estado.get(c) === 2) return null;
    if (estado.get(c) === 1) return [...pila.slice(pila.indexOf(c)), c];
    estado.set(c, 1);
    pila.push(c);
    for (const p of porClave.get(c)?.prerrequisitos ?? []) {
      if (!porClave.has(p)) continue;
      const ciclo = visitar(p);
      if (ciclo) return ciclo;
    }
    pila.pop();
    estado.set(c, 2);
    return null;
  };
  for (const t of temas) {
    const ciclo = visitar(t.clave);
    if (ciclo) return ciclo;
  }
  return null;
}

// ───────────── Búsqueda determinista ─────────────

/** Palabras sin valor para reconocer un tema («quiero practicar las …»). */
const VACIAS = new Set(
  (
    "a al algo aprender ayuda ayudame como con de del el en enseña enseñame ensena ensename es estudiar explica explicame " +
    "hacer la las lo los me mi mas necesito o para por practica practicar quiero que repasar se sobre tema temas un una unos " +
    "unas y ejercicio ejercicios problema problemas ver saber hoy otro otra tipo tipos clase curso"
  ).split(" "),
);

/** Raíz muy simple (plural): «fracciones» → «fraccion», «celulas» → «celula». */
export function raiz(palabra: string): string {
  if (palabra.length > 5 && palabra.endsWith("es") && !palabra.endsWith("ies")) return palabra.slice(0, -2);
  if (palabra.length > 4 && palabra.endsWith("s")) return palabra.slice(0, -1);
  return palabra;
}

export function palabrasUtiles(texto: string): string[] {
  return normalizar(texto)
    .split(" ")
    .filter((p) => p.length >= 3 && !VACIAS.has(p));
}

type Indice = { frases: string[]; raices: Set<string>; nombre: string; raicesNombre: Set<string> };
const indices = new WeakMap<Tema, Indice>();

function indiceDe(t: Tema): Indice {
  let i = indices.get(t);
  if (!i) {
    const frases = [t.nombre, ...t.palabrasClave, ...(t.sinonimos ?? []), ...(t.subtema ? [t.subtema] : [])].map(normalizar).filter(Boolean);
    const raices = new Set(frases.flatMap((f) => palabrasUtiles(f)).map(raiz));
    i = { frases, raices, nombre: normalizar(t.nombre), raicesNombre: new Set(palabrasUtiles(t.nombre).map(raiz)) };
    indices.set(t, i);
  }
  return i;
}

/** ¿La frase aparece en el texto como palabras completas? (ambos ya normalizados). */
export function contieneFrase(texto: string, frase: string): boolean {
  return frase.length > 0 && ` ${texto} `.includes(` ${frase} `);
}

/** Índice invertido raíz → temas (para un conjunto de temas). */
function indiceInvertido(temas: readonly Tema[]): Map<string, Tema[]> {
  const mapa = new Map<string, Tema[]>();
  for (const t of temas) for (const r of indiceDe(t).raices) mapa.set(r, [...(mapa.get(r) ?? []), t]);
  return mapa;
}

/**
 * Búsqueda determinista por nombre, palabras clave y sinónimos (normalizados, sin tildes). Mayor puntaje primero.
 * Puntaje: nombre exacto 20 · palabra clave o sinónimo exacto 6 · frase clave contenida 4 por palabra · palabra útil que coincide (por raíz) 3, o 4 si está
 * en el nombre del tema.
 */
export function buscarTemas(texto: string, temas: readonly Tema[]): { tema: Tema; puntaje: number }[] {
  const n = normalizar(texto);
  const raices = [...new Set(palabrasUtiles(n).map(raiz))];
  if (!n || raices.length === 0) return [];
  const invertido = indiceInvertido(temas);
  const candidatos = new Set<Tema>(raices.flatMap((r) => invertido.get(r) ?? []));
  const salida: { tema: Tema; puntaje: number }[] = [];
  for (const t of candidatos) {
    const i = indiceDe(t);
    let puntaje = 0;
    if (i.nombre === n) puntaje += 20;
    else if (i.frases.includes(n)) puntaje += 6;
    for (const f of i.frases) {
      const largo = f.split(" ").length;
      if (largo > 1 && contieneFrase(n, f)) puntaje += 4 * largo;
    }
    for (const r of raices) if (i.raices.has(r)) puntaje += i.raicesNombre.has(r) ? 4 : 3;
    if (puntaje > 0) salida.push({ tema: t, puntaje });
  }
  return salida.sort((a, b) => b.puntaje - a.puntaje || posicionTema(a.tema) - posicionTema(b.tema) || a.tema.clave.localeCompare(b.tema.clave));
}

/** Similitud aproximada (prefijos de 4 letras compartidos) para sugerir temas cuando no hay coincidencias. */
export function temasParecidos(texto: string, temas: readonly Tema[], max = 3): Tema[] {
  const prefijos = new Set(palabrasUtiles(texto).filter((p) => p.length >= 4).map((p) => p.slice(0, 4)));
  if (prefijos.size === 0) return [];
  return temas
    .map((t) => ({ t, s: [...indiceDe(t).raices].filter((r) => prefijos.has(r.slice(0, 4))).length }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || posicionTema(a.t) - posicionTema(b.t))
    .slice(0, max)
    .map((x) => x.t);
}
