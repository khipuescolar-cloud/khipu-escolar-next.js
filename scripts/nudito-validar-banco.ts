import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { esquemaFicha, type FichaConocimiento } from "../src/lib/nudito/conocimiento/esquema";
import cneb from "../src/lib/nudito/conocimiento/cneb/matematica.json";
import cnebOriginal from "../src/lib/cneb/matematica.json";
import catalogoAnterior from "../src/lib/nudito/catalogo/matematica.json";

const carpeta = fileURLToPath(new URL("../src/lib/nudito/conocimiento/banco/matematica/primaria-3/", import.meta.url));
export function validarBanco(): { fichas: FichaConocimiento[]; errores: string[] } {
  const errores: string[] = [];
  const fichas: FichaConocimiento[] = [];
  for (const archivo of readdirSync(carpeta).filter(a => a.endsWith(".json"))) {
    const datos: unknown = JSON.parse(readFileSync(join(carpeta, archivo), "utf8"));
    if (!Array.isArray(datos)) { errores.push(archivo + ": se espera un arreglo"); continue; }
    for (const crudo of datos) {
      const r = esquemaFicha.safeParse(crudo);
      if (!r.success) { errores.push(archivo + ": " + r.error.message); continue; }
      fichas.push(r.data);
    }
  }
  for (const competencia of cneb.competencias) {
    const original = cnebOriginal.competencias.find(c => c.numero === competencia.numero);
    if (!original || original.nombre !== competencia.nombre || JSON.stringify(original.capacidades.primaria) !== JSON.stringify(competencia.capacidades) || JSON.stringify(original.desempenos.primaria["3"]) !== JSON.stringify(competencia.desempenos["3"].map(d => d.texto))) errores.push("Transcripción CNEB diferente en competencia " + competencia.numero);
  }
  const claves = new Set<string>();
  const nombres = new Set<string>();
  const codigos = new Map(cneb.competencias.flatMap(c => c.desempenos["3"].map(d => [d.codigo, c.numero] as const)));
  for (const f of fichas) {
    if (claves.has(f.clave)) errores.push("Clave repetida: " + f.clave);
    claves.add(f.clave);
    const nombre = f.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (nombres.has(nombre)) errores.push("Nombre repetido: " + f.nombre);
    nombres.add(nombre);
    if (!f.desempenosOrigen.every(c => codigos.get(c) === f.competenciaCneb)) errores.push("Desempeño ajeno: " + f.clave);
    const ids = new Set<string>();
    const enunciados = new Set<string>();
    for (const e of f.ejercicios) {
      if (ids.has(e.id)) errores.push(f.clave + ": ejercicio repetido " + e.id);
      ids.add(e.id);
      if (enunciados.has(e.enunciado)) errores.push(f.clave + ": enunciado repetido " + e.id);
      enunciados.add(e.enunciado);
      if (e.operacion) {
        const { tipo, a, b } = e.operacion;
        const valor = tipo === "suma" ? a + b : tipo === "resta" ? a - b : tipo === "multiplicacion" ? a * b : tipo === "division" ? a / b : 2 * (a + b);
        if (!Number.isFinite(valor)) errores.push(f.clave + ": operación inválida " + e.id);
        const correcta = e.tipo === "numerico" ? e.respuesta : e.tipo === "opcion_multiple" ? e.opciones?.find(o => o.id === e.respuesta)?.texto : null;
        if (correcta !== null && Number(correcta) !== valor) errores.push(f.clave + ": respuesta aritmética incorrecta " + e.id);
        if (e.tipo === "verdadero_falso") {
          const afirmado = Number(e.enunciado.match(/=\s*(-?\d+)/)?.[1]);
          if (!Number.isFinite(afirmado) || e.respuesta !== (afirmado === valor)) errores.push(f.clave + ": verdadero/falso incorrecto " + e.id);
        }
      }
      if (e.tipo === "opcion_multiple" && new Set(e.opciones?.map(o => o.texto)).size !== e.opciones?.length) errores.push(f.clave + ": opciones duplicadas " + e.id);
    }
    const texto = JSON.stringify(f);
    if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(texto) || /\b\d{8}\b/.test(texto)) errores.push(f.clave + ": posible dato personal");
  }
  const clavesAnteriores = new Set(catalogoAnterior.map(t => t.clave));
  for (const f of fichas) for (const pre of f.prerrequisitos) {
    if (!claves.has(pre) && !clavesAnteriores.has(pre)) errores.push(f.clave + ": prerrequisito inexistente " + pre);
  }
  const porClave = new Map(fichas.map(f => [f.clave, f]));
  const visitados = new Set<string>();
  const activos = new Set<string>();
  const visitar = (clave: string) => {
    if (activos.has(clave)) { errores.push("Ciclo de prerrequisitos: " + clave); return; }
    if (visitados.has(clave)) return;
    activos.add(clave);
    for (const pre of porClave.get(clave)?.prerrequisitos ?? []) if (porClave.has(pre)) visitar(pre);
    activos.delete(clave); visitados.add(clave);
  };
  for (const f of fichas) visitar(f.clave);
  if (fichas.length < 200 || fichas.length > 300) errores.push("Se esperaban 200–300 fichas; hay " + fichas.length);
  return { fichas, errores };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { fichas, errores } = validarBanco();
  if (errores.length) { console.error(errores.join("\n")); process.exitCode = 1; }
  else console.log("Banco válido: " + fichas.length + " temas; " + fichas.reduce((a, f) => a + f.ejercicios.length, 0) + " ejercicios.");
}
