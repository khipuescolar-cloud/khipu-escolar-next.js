import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { esquemaFicha, type FichaConocimiento } from "../src/lib/nudito/conocimiento/esquema";
import { temasDe } from "../src/lib/nudito/catalogo";
import matematica from "../src/lib/nudito/conocimiento/cneb/matematica.json";
import comunicacion from "../src/lib/nudito/conocimiento/cneb/comunicacion.json";
import cienciaTecnologia from "../src/lib/nudito/conocimiento/cneb/ciencia-tecnologia.json";
import type { AreaNudito, NivelNudito } from "../src/lib/nudito/contratos";
import { esDisciplinaDe } from "../src/lib/nudito/conocimiento/disciplinas";

const raiz = fileURLToPath(new URL("../src/lib/nudito/conocimiento/banco/", import.meta.url));
const fuentes = { matematica, comunicacion, "ciencia-tecnologia": cienciaTecnologia };
const areas = Object.keys(fuentes) as AreaNudito[];
type TemaPropuesto = { clave: string; nombre: string; disciplina?: string; desempenosOrigen: string[]; prerrequisitos: string[]; competencia?: number };
type TemarioPropuesto = { competencias: { numero: number; capacidades: { bloques: { temas: TemaPropuesto[] }[] }[] }[] };
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const forma = (s: string) => normalizar(s).replace(/\b\d+(?:[.,]\d+)?\b/g, "#");
const archivosJson = (carpeta: string) => existsSync(carpeta) ? readdirSync(carpeta).filter(a => a.endsWith(".json")).sort() : [];

function revisarCiclos(temas: TemaPropuesto[], prefijo: string, errores: string[]) {
  const porClave = new Map(temas.map(t => [t.clave, t]));
  const visitados = new Set<string>();
  const activos = new Set<string>();
  const visitar = (clave: string) => {
    if (activos.has(clave)) { errores.push(prefijo + ": ciclo de prerrequisitos en " + clave); return; }
    if (visitados.has(clave)) return;
    activos.add(clave);
    for (const pre of porClave.get(clave)?.prerrequisitos ?? []) if (porClave.has(pre)) visitar(pre);
    activos.delete(clave);
    visitados.add(clave);
  };
  for (const t of temas) visitar(t.clave);
}

export function validarBanco(): { fichas: FichaConocimiento[]; errores: string[] } {
  const errores: string[] = [];
  const fichas: FichaConocimiento[] = [];
  const catalogo = new Set(areas.flatMap(area => (["primaria", "secundaria"] as const).flatMap(nivel => temasDe(area, nivel).map(t => t.clave))));
  const temarios = new Map<string, TemaPropuesto[]>();
  const combinaciones: { area: AreaNudito; nivel: NivelNudito; grado: number; carpeta: string; archivos: string[] }[] = [];
  for (const area of areas) for (const nivel of ["primaria", "secundaria"] as const) for (let grado = 1; grado <= (nivel === "primaria" ? 6 : 5); grado++) {
    const carpeta = join(raiz, area, nivel + "-" + grado);
    const archivos = archivosJson(join(carpeta, "fichas"));
    const ruta = join(carpeta, "temario-propuesto.json");
    if (existsSync(ruta)) {
      const temario = JSON.parse(readFileSync(ruta, "utf8")) as TemarioPropuesto;
      const temas = temario.competencias.flatMap(c => c.capacidades.flatMap(cap => cap.bloques.flatMap(b => b.temas.map(t => ({ ...t, competencia: c.numero })))));
      temarios.set(area + ":" + nivel + ":" + grado, temas);
      for (const t of temas) catalogo.add(t.clave);
    }
    if (archivos.length || existsSync(ruta)) combinaciones.push({ area, nivel, grado, carpeta, archivos });
  }
  const temasActivos: TemaPropuesto[] = [];
  for (const { area, nivel, grado, carpeta, archivos } of combinaciones) {
    const etiqueta = area + "/" + nivel + "-" + grado;
    const temas = temarios.get(area + ":" + nivel + ":" + grado);
    if (!temas) { errores.push(etiqueta + ": falta temario-propuesto.json"); continue; }
    if (temas.length < 100 || temas.length > 180) errores.push(etiqueta + ": el temario debe tener 100–180 temas; hay " + temas.length);
    const clavesTemario = new Set<string>();
    for (const t of temas) {
      if (clavesTemario.has(t.clave)) errores.push(etiqueta + ": clave repetida en temario " + t.clave);
      clavesTemario.add(t.clave);
      for (const pre of t.prerrequisitos) if (!catalogo.has(pre)) errores.push(etiqueta + ": prerrequisito inexistente " + pre);
      if (!esDisciplinaDe(area, t.disciplina)) errores.push(etiqueta + ": disciplina inválida o ausente en " + t.clave);
    }
    temasActivos.push(...temas);
    const fuente = fuentes[area];
    const oficiales = new Map(fuente.competencias.flatMap(c => ((nivel === "primaria" ? c.desempenos : c.secundaria.desempenos) as Record<string, { codigo: string }[]>)[String(grado)]?.map(d => [d.codigo, c.numero] as const) ?? []));
    for (const codigo of oficiales.keys()) if (!temas.some(t => t.desempenosOrigen.includes(codigo))) errores.push(etiqueta + ": desempeño sin tema " + codigo);
    for (const t of temas) for (const codigo of t.desempenosOrigen) if (oficiales.get(codigo) !== t.competencia) errores.push(etiqueta + ": desempeño ajeno a la competencia o grado " + codigo);
    if (!archivos.length) continue;
    const fichasLocal: FichaConocimiento[] = [];
    for (const archivo of archivos) {
      const datos: unknown = JSON.parse(readFileSync(join(carpeta, "fichas", archivo), "utf8"));
      if (!Array.isArray(datos)) { errores.push(etiqueta + "/" + archivo + ": se esperaba un arreglo"); continue; }
      for (const crudo of datos) {
        const resultado = esquemaFicha.safeParse(crudo);
        if (!resultado.success) { errores.push(etiqueta + "/" + archivo + ": " + resultado.error.message); continue; }
        fichasLocal.push(resultado.data);
      }
    }
    if (fichasLocal.length < 100 || fichasLocal.length > 180) errores.push(etiqueta + ": se esperaban 100–180 fichas; hay " + fichasLocal.length);
    const clavesFichas = new Set<string>();
    const nombres = new Set<string>();
    for (const f of fichasLocal) {
      fichas.push(f);
      if (f.area !== area || f.nivel !== nivel || f.grado !== grado) errores.push(etiqueta + ": ficha en carpeta incorrecta " + f.clave);
      if (clavesFichas.has(f.clave)) errores.push(etiqueta + ": clave repetida " + f.clave);
      clavesFichas.add(f.clave);
      if (!clavesTemario.has(f.clave)) errores.push(etiqueta + ": ficha fuera del temario " + f.clave);
      else if (temas.find(t => t.clave === f.clave)?.disciplina !== f.disciplina) errores.push(f.clave + ": disciplina distinta a la del temario");
      const nombre = normalizar(f.nombre);
      if (nombres.has(nombre)) errores.push(etiqueta + ": nombre repetido " + f.nombre);
      nombres.add(nombre);
      if (f.desempenosOrigen.some(c => oficiales.get(c) !== f.competenciaCneb)) errores.push(f.clave + ": desempeño ajeno a la competencia");
      for (const pre of f.prerrequisitos) if (!catalogo.has(pre)) errores.push(f.clave + ": prerrequisito inexistente " + pre);
      const ids = new Set<string>();
      const pistas = new Set<string>();
      const formas = new Map<string, number>();
      const niveles = new Set<number>();
      for (const e of f.ejercicios) {
        niveles.add(e.dificultad);
        if (ids.has(e.id)) errores.push(f.clave + ": id de ejercicio repetido " + e.id);
        ids.add(e.id);
        const patron = forma(e.enunciado);
        formas.set(patron, (formas.get(patron) ?? 0) + 1);
        for (const pista of e.pistas) {
          const normal = normalizar(pista);
          if (pistas.has(normal)) errores.push(f.clave + ": pista repetida " + e.id);
          pistas.add(normal);
        }
        if (e.tipo === "opcion_multiple") {
          if (new Set(e.opciones?.map(o => o.id)).size !== e.opciones?.length || new Set(e.opciones?.map(o => normalizar(o.texto))).size !== e.opciones?.length) errores.push(f.clave + ": opciones duplicadas " + e.id);
        }
        if (e.operacion) {
          const { tipo, a, b } = e.operacion;
          const valor = tipo === "suma" ? a + b : tipo === "resta" ? a - b : tipo === "multiplicacion" ? a * b : tipo === "division" ? a / b : 2 * (a + b);
          const correcta = e.tipo === "numerico" ? e.respuesta : e.tipo === "opcion_multiple" ? e.opciones?.find(o => o.id === e.respuesta)?.texto : null;
          if (!Number.isFinite(valor) || (correcta !== null && Number(String(correcta).replace(",", ".")) !== valor)) errores.push(f.clave + ": respuesta aritmética incorrecta " + e.id);
          if (e.tipo === "verdadero_falso") {
            const afirmado = Number((e.enunciado.match(/=\s*(-?\d+)/) ?? e.enunciado.match(/sigue\s*(-?\d+)/))?.[1]);
            if (!Number.isFinite(afirmado) || e.respuesta !== (afirmado === valor)) errores.push(f.clave + ": verdadero/falso incorrecto " + e.id);
          }
        }
      }
      if (![1, 2, 3].every(d => niveles.has(d))) errores.push(f.clave + ": faltan dificultades 1, 2 o 3");
      for (const [patron, n] of formas) if (n >= 3) errores.push(f.clave + ": plantilla de enunciado repetida " + n + " veces: " + patron);
      const texto = JSON.stringify(f);
      if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(texto) || /\b\d{8}\b/.test(texto)) errores.push(f.clave + ": posible dato personal");
    }
    for (const f of fichasLocal) for (const pre of f.prerrequisitos) if (clavesFichas.has(pre) && !clavesTemario.has(pre)) errores.push(f.clave + ": prerrequisito fuera del temario " + pre);
  }
  const nombresPorArea = new Map<string, string>();
  for (const [combinacion, temas] of temarios) for (const t of temas) {
    const llave = combinacion.split(":")[0] + ":" + normalizar(t.nombre);
    const previo = nombresPorArea.get(llave);
    if (previo && previo !== combinacion) errores.push("Banco: nombre de tema repetido entre grados (" + previo + " y " + combinacion + "): " + t.nombre);
    else if (previo === combinacion) errores.push(combinacion + ": nombre de tema repetido " + t.nombre);
    nombresPorArea.set(llave, combinacion);
  }
  const clavesGlobales = new Set<string>();
  for (const tema of temasActivos) {
    if (clavesGlobales.has(tema.clave)) errores.push("Banco: clave repetida entre combinaciones " + tema.clave);
    clavesGlobales.add(tema.clave);
  }
  revisarCiclos(temasActivos, "banco", errores);
  return { fichas, errores };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { fichas, errores } = validarBanco();
  if (errores.length) { console.error(errores.join("\n")); process.exitCode = 1; }
  else console.log("Banco válido: " + fichas.length + " fichas activas; " + fichas.reduce((a, f) => a + f.ejercicios.length, 0) + " ejercicios.");
}
