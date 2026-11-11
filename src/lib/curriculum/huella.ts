import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { temaPorClave } from "@/lib/nudito/catalogo";

type NodoTema = { clave: string; nombre?: string } & Record<string, unknown>;
const raiz = join(process.cwd(), "src/lib/nudito/conocimiento/banco");
let propuestas: Promise<Map<string, NodoTema>> | undefined;
let fichas: Promise<Map<string, unknown>> | undefined;

async function archivosJson(directorio: string): Promise<string[]> {
  const entradas = await readdir(directorio, { withFileTypes: true }).catch((e: NodeJS.ErrnoException) => e.code === "ENOENT" ? [] : Promise.reject(e));
  const hijos = await Promise.all(entradas.map(async (entrada) => {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) return archivosJson(ruta);
    return entrada.isFile() && entrada.name.endsWith(".json") ? [ruta] : [];
  }));
  return hijos.flat();
}

function indexarPropuestas(valor: unknown, salida: Map<string, NodoTema>): void {
  if (Array.isArray(valor)) { for (const item of valor) indexarPropuestas(item, salida); return; }
  if (!valor || typeof valor !== "object") return;
  const nodo = valor as Record<string, unknown>;
  if (typeof nodo.clave === "string" && typeof nodo.nombre === "string") salida.set(nodo.clave, nodo as NodoTema);
  for (const hijo of Object.values(nodo)) indexarPropuestas(hijo, salida);
}

async function propuestasDelRepo(): Promise<Map<string, NodoTema>> {
  const salida = new Map<string, NodoTema>();
  const rutas = (await archivosJson(raiz)).filter((ruta) => ruta.endsWith("temario-propuesto.json"));
  for (const ruta of rutas) indexarPropuestas(JSON.parse(await readFile(ruta, "utf8")), salida);
  return salida;
}

async function fichasDelRepo(): Promise<Map<string, unknown>> {
  const salida = new Map<string, unknown>();
  const rutas = (await archivosJson(raiz)).filter((ruta) => ruta.includes("/fichas/"));
  for (const ruta of rutas) {
    const datos: unknown = JSON.parse(await readFile(ruta, "utf8"));
    if (Array.isArray(datos)) for (const ficha of datos) {
      if (ficha && typeof ficha === "object" && typeof (ficha as { clave?: unknown }).clave === "string") salida.set((ficha as { clave: string }).clave, ficha);
    }
  }
  return salida;
}

/** SHA-256 del tema editorial y su ficha JSON actual, global y compartida entre seed, servidor y CLI. */
export async function huellaActualDeTema(clave: string): Promise<string | null> {
  propuestas ??= propuestasDelRepo();
  fichas ??= fichasDelRepo();
  const [porClave, fichasPorClave] = await Promise.all([propuestas, fichas]);
  const tema = temaPorClave(clave) ?? porClave.get(clave);
  if (!tema) return null;
  const ficha = fichasPorClave.get(clave) ?? null;
  return createHash("sha256").update(JSON.stringify({ tema, ficha })).digest("hex");
}
