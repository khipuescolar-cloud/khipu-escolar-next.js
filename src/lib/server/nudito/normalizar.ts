// Normalización de texto en español: minúsculas, sin tildes ni signos, con sinónimos comunes.

const SINONIMOS: [RegExp, string][] = [
  [/\bdeberes\b/g, "tareas"],
  [/\bpendientes\b/g, "tareas pendientes"],
  [/\bprofe\b/g, "profesor"],
  [/\bmiss\b/g, "tutora"],
  [/\bcole\b/g, "colegio"],
  [/\bhijito\b/g, "hijo"],
  [/\bhijita\b/g, "hija"],
];

export function normalizar(texto: string): string {
  let t = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [re, por] of SINONIMOS) t = t.replace(re, por);
  return t;
}

export function palabras(norm: string): string[] {
  return norm.split(" ").filter(Boolean);
}
