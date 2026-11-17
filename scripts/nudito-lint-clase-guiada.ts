// Lint mecánico de claseGuiada v1 (+ ficha). Uso: pnpm exec tsx scripts/nudito-lint-clase-guiada.ts <clave...> | --lote-json <archivo.json>
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raizBanco = fileURLToPath(new URL("../src/lib/nudito/conocimiento/banco/", import.meta.url));
const raizPublic = fileURLToPath(new URL("../public", import.meta.url));

export type Hallazgo = { clave: string; donde: string; regla: string; nivel: "error" | "aviso" | "info"; detalle: string };
type Opcion = { id: string; texto: string };
type Clase = {
  momentos: { id: string; titulo: string; narracion: string; recursoRef?: string }[];
  recursos: { id: string; src: string; alt: string; descripcion: string }[];
  comprobacion: { pregunta: string; opciones: Opcion[]; respuesta: string; pista: string };
};
export type Ficha = { clave: string; claseGuiada?: Clase; ejercicios?: { id: string; tipo: string; respuesta: unknown; opciones?: Opcion[] }[] };

const luminancia = (hex: string) => {
  const h = hex.length === 4 ? "#" + [...hex.slice(1)].map(c => c + c).join("") : hex;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contraste = (a: string, b: string) => { const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const FONDO = "#FCF0D6";
const attr = (a: string, n: string) => new RegExp("(?:^|\\s)" + n + "=\"([^\"]*)\"").exec(a)?.[1] ?? new RegExp(n + "\\s*:\\s*([^;\"]+)").exec(/style="([^"]*)"/.exec(a)?.[1] ?? "")?.[1]?.trim();

export function lintSvg(svg: string): { regla: string; nivel: "error" | "aviso"; detalle: string }[] {
  const r: { regla: string; nivel: "error" | "aviso"; detalle: string }[] = [];
  const add = (regla: string, nivel: "error" | "aviso", detalle: string) => r.push({ regla, nivel, detalle });
  if (!/viewBox="0 0 640 480"/.test(svg)) add("svg-viewbox", "error", "viewBox distinto de 0 0 640 480");
  if (!/<title>[^<]+<\/title>/.test(svg)) add("svg-title", "error", "falta <title>");
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const a = m[1], cuerpo = m[2];
    const texto = cuerpo.replace(/<[^>]+>/g, "").replace(/&#160;|&nbsp;/g, " ").replace(/&[a-z]+;|&#\d+;/g, "x").trim();
    const etiqueta = JSON.stringify(texto.slice(0, 24));
    if (/<tspan[^>]*>[ \t\n]|[ \t\n]<\/tspan>/.test(cuerpo)) add("svg-tspan-espacios", "error", etiqueta + " tspan con espacio al borde (usar &#160;)");
    const fs = parseFloat(attr(a, "font-size") ?? "");
    const fill = (attr(a, "fill") ?? "").toUpperCase();
    const negrita = /bold|[6-9]00/.test(attr(a, "font-weight") ?? "");
    if (fs && fs < 26) add("svg-fuente-pequena", "error", etiqueta + " font-size " + fs);
    if (fill === "#C98F1E" || fill === "#0F7C7A") add("svg-fill-prohibido", "aviso", etiqueta + " fill " + fill);
    // shortcut: sin fondo local conocido, los rellenos más claros que el crema (blanco sobre formas oscuras) se omiten
    if (/^#[0-9A-F]{3}$|^#[0-9A-F]{6}$/.test(fill) && luminancia(fill) < luminancia(FONDO)) {
      const c = contraste(fill, FONDO);
      const minimo = fs >= 24 && negrita ? 3 : 4.5;
      if (c < minimo) add("svg-contraste", "aviso", etiqueta + " " + fill + " contraste " + c.toFixed(2) + " < " + minimo);
    }
    const x = parseFloat(attr(a, "x") ?? "");
    if (fs && !isNaN(x)) {
      const w = texto.length * 0.55 * fs, ancla = attr(a, "text-anchor") ?? "start";
      const [i, d] = ancla === "middle" ? [x - w / 2, x + w / 2] : ancla === "end" ? [x - w, x] : [x, x + w];
      if (i < 12 || d > 628) add("svg-texto-borde", "aviso", etiqueta + " ocupa x " + Math.round(i) + "–" + Math.round(d) + " (margen 12)");
    }
  }
  return r;
}

const SIN_DIGITOS = /\d/, PARTE_N = /\bparte\s+\d+\s+de\s+\d+\b/i;
const VISUAL = /\b(dibujo|imagen|ilustraci[oó]n|tarjeta|recuadro|figura que ves|gr[aá]fico que ves)\b/i;
// shortcut: «e» e «y» se omiten (conjunciones); heurística solo para revisión manual.
const LETRA = /(?:[=+×÷*]|\b(?:igual|m[aá]s|por|menos)\b)\s*\b[cpnmx]\b|\b[cpnmx]\b\s*(?:[=+×÷*]|\b(?:igual|m[aá]s|por|menos)\b)/;

export function lintClase(ficha: Ficha, leerSvg: (src: string) => string | null): { hallazgos: Hallazgo[]; letra?: string } {
  const h: Hallazgo[] = [];
  const clave = ficha.clave, c = ficha.claseGuiada;
  const add = (donde: string, regla: string, nivel: Hallazgo["nivel"], detalle: string) => h.push({ clave, donde, regla, nivel, detalle });
  if (!c) { add("-", "sin-claseGuiada", "error", "la ficha no tiene claseGuiada"); return { hallazgos: h }; }
  // 1) estructura
  if (c.momentos.length !== 10) add("momentos", "10-momentos", "aviso", c.momentos.length + " momentos");
  if (c.momentos[0]?.recursoRef) add(c.momentos[0].id, "primer-momento-sin-recurso", "error", "el primero lleva recurso");
  const ids = new Set(c.recursos.map(r => r.id)), usados = new Set(c.momentos.map(m => m.recursoRef).filter(Boolean));
  for (const m of c.momentos) if (m.recursoRef && !ids.has(m.recursoRef)) add(m.id, "recursoRef-inexistente", "error", m.recursoRef);
  for (const r of c.recursos) if (!usados.has(r.id)) add(r.id, "recurso-sin-uso", "error", "ningún momento lo usa");
  // 2) textos de recurso y SVG
  for (const r of c.recursos) {
    if (!r.alt.trim() || r.alt.length > 200) add(r.id, "alt", "error", "alt vacío o >200 (" + r.alt.length + ")");
    if (!r.descripcion.trim() || r.descripcion.length > 500) add(r.id, "descripcion", "error", "descripcion vacía o >500 (" + r.descripcion.length + ")");
    else if (r.descripcion.length > 300) add(r.id, "descripcion-larga", "aviso", r.descripcion.length + " caracteres");
    const svg = leerSvg(r.src);
    if (svg === null) { add(r.id, "src-inexistente", "error", r.src); continue; }
    if (r.src.endsWith(".svg")) for (const f of lintSvg(svg)) add(r.id, f.regla, f.nivel, f.detalle);
  }
  // 3) narración
  for (const m of c.momentos) {
    for (const [campo, t] of [["narracion", m.narracion], ["titulo", m.titulo]] as const) {
      const sinNumeracion = campo === "titulo" ? t.replace(/^(?:Ejemplo|Paso)\s+\d+\b/i, "") : t; // «Ejemplo 1», «Paso 2» son rótulos
      if (SIN_DIGITOS.test(sinNumeracion)) add(m.id, "digitos-" + campo, "error", "dígitos en " + campo + ": " + /\S*\d\S*/.exec(sinNumeracion)?.[0]);
      if (PARTE_N.test(t)) add(m.id, "parte-n-de-m", "error", campo);
    }
    const tit = m.titulo.trim().replace(/[.:!?]+$/, "").toLowerCase();
    if (tit.length > 3 && m.narracion.toLowerCase().includes(tit)) add(m.id, "titulo-repetido", "error", "el título aparece literal en la narración");
    if (!m.recursoRef && VISUAL.test(m.narracion)) add(m.id, "alude-imagen-sin-recurso", "error", "«" + VISUAL.exec(m.narracion)?.[0] + "» sin recurso");
    if (LETRA.test(m.narracion)) add(m.id, "letra-suelta", "aviso", "posible variable suelta: «" + LETRA.exec(m.narracion)?.[0] + "» (revisar voz)");
  }
  // 4) comprobación
  const { opciones, respuesta, pista } = c.comprobacion;
  const correctas = opciones.filter(o => o.id === respuesta);
  if (correctas.length !== 1) add("comprobacion", "respuesta-unica", "error", correctas.length + " correctas");
  if (opciones.length < 3) add("comprobacion", "opciones-min-3", "error", opciones.length + " opciones");
  opciones.forEach((o, i) => { if (o.id.toLowerCase() !== "abcd"[i]) add("comprobacion", "letra-opcion", "error", "opción " + (i + 1) + " tiene id «" + o.id + "»"); });
  const largos = opciones.map(o => o.texto.length), dif = Math.max(...largos) - Math.min(...largos);
  if (dif > 5) add("comprobacion", "longitud-opciones", "error", "diferencia " + dif);
  else if (dif > 3) add("comprobacion", "longitud-opciones", "aviso", "diferencia " + dif);
  const ok = correctas[0];
  if (ok && ok.texto.length - Math.max(...opciones.filter(o => o !== ok).map(o => o.texto.length)) > 3) add("comprobacion", "correcta-mas-larga", "error", "la correcta supera a las demás por >3");
  if (ok && ok.texto.trim().length >= 2 && new RegExp("(?<![\\p{L}\\d])" + ok.texto.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\p{L}\\d])", "iu").test(pista)) add("comprobacion", "pista-revela", "error", "la pista contiene «" + ok.texto + "»");
  // 7) informativo sobre la ficha
  const largas = (ficha.ejercicios ?? []).filter(e => {
    const ok2 = e.opciones?.find(o => o.id === e.respuesta);
    return e.tipo === "opcion_multiple" && ok2 && ok2.texto.length - Math.max(...e.opciones!.filter(o => o !== ok2).map(o => o.texto.length)) > 8;
  }).map(e => e.id);
  if (largas.length) add("ejercicios", "ficha-correcta-mas-larga", "info", largas.join(","));
  return { hallazgos: h, letra: respuesta.toUpperCase() };
}

function* archivos(dir: string): Generator<string> {
  for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) yield* archivos(p); else if (p.includes("/fichas/") && n.endsWith(".json")) yield p; }
}
export function cargarFichas(claves: Set<string>): Map<string, Ficha> {
  const m = new Map<string, Ficha>();
  for (const p of archivos(raizBanco)) for (const f of JSON.parse(readFileSync(p, "utf8")) as Ficha[]) if (claves.has(f.clave)) m.set(f.clave, f);
  return m;
}
const leerPublic = (src: string) => { const p = join(raizPublic, src); return existsSync(p) ? readFileSync(p, "utf8") : null; };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2), i = args.indexOf("--lote-json");
  const claves = i >= 0 ? (() => { const j = JSON.parse(readFileSync(args[i + 1], "utf8")); return (Array.isArray(j) ? j : Object.values(j).flat()) as string[]; })() : args;
  const fichas = cargarFichas(new Set(claves));
  let errores = 0, avisos = 0;
  const porRegla = new Map<string, [number, number]>(), tabla: string[] = [];
  for (const k of claves) {
    const f = fichas.get(k);
    const { hallazgos, letra } = f ? lintClase(f, leerPublic) : { hallazgos: [{ clave: k, donde: "-", regla: "clave-no-encontrada", nivel: "error" as const, detalle: "" }], letra: undefined };
    tabla.push(k + "\tletra " + (letra ?? "?"));
    for (const x of hallazgos) {
      if (x.nivel === "error") errores++; else if (x.nivel === "aviso") avisos++;
      const t = porRegla.get(x.regla) ?? [0, 0]; t[x.nivel === "error" ? 0 : 1]++; porRegla.set(x.regla, t);
      console.log((x.nivel === "error" ? "E " : x.nivel === "aviso" ? "A " : "i ") + x.clave + " [" + x.donde + "] " + x.regla + (x.detalle ? ": " + x.detalle : ""));
    }
  }
  console.log("\nClave\tLetra correcta\n" + tabla.join("\n"));
  console.log("\nPor regla (errores/avisos): " + [...porRegla].map(([r, [e, a]]) => r + " " + e + "/" + a).join("; "));
  console.log(errores + " errores, " + avisos + " avisos");
  if (errores) process.exitCode = 1;
}
