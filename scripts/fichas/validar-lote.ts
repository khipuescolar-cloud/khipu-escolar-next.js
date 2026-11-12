/* eslint-disable @typescript-eslint/no-explicit-any -- script utilitario de validación de lotes */
// Uso (desde el worktree del grado): ./node_modules/.bin/tsx ../_briefs/validar-lote.ts <lote.json> <claves.txt>
import { readFileSync } from "node:fs";
const [lote, clavesTxt] = process.argv.slice(2);
async function main() {
const { esquemaFicha } = await import(process.cwd() + "/src/lib/nudito/conocimiento/esquema.ts");
const { mayorGrupoParecido } = await import(process.cwd() + "/scripts/nudito-validar-banco.ts");
const pedidas = new Set(readFileSync(clavesTxt, "utf8").split("\n").filter(Boolean));
const datos = JSON.parse(readFileSync(lote, "utf8"));
const err: string[] = [];
if (!Array.isArray(datos)) throw new Error("se espera un arreglo de fichas");
const vistas = new Set<string>();
for (const crudo of datos) {
  const r = esquemaFicha.safeParse(crudo);
  if (!r.success) { err.push(String(crudo?.clave) + ": esquema " + r.error.message.slice(0, 300)); continue; }
  const f = r.data;
  if (!pedidas.has(f.clave)) err.push(f.clave + ": no estaba en el lote");
  vistas.add(f.clave);
  const dif = new Set(f.ejercicios.map((e: any) => e.dificultad)); if (dif.size < 3) err.push(f.clave + ": faltan dificultades");
  const ids = new Set(), pistas = new Set<string>(), enun = new Set<string>();
  for (const e of f.ejercicios as any[]) {
    if (ids.has(e.id)) err.push(f.clave + ": id repetido " + e.id); ids.add(e.id);
    if (enun.has(e.enunciado)) err.push(f.clave + ": enunciado repetido " + e.id); enun.add(e.enunciado);
    for (const p of e.pistas) { if (pistas.has(p)) err.push(f.clave + ": pista repetida " + e.id); pistas.add(p); }
    if (e.tipo === "opcion_multiple" && new Set(e.opciones.map((o: any) => o.texto)).size !== e.opciones.length) err.push(f.clave + ": opciones duplicadas " + e.id);
    if (/\b(opci[oó]n|alternativa|letra)\s+[«"(]?[a-d]\b/i.test(e.retroalimentacion + e.pistas.join(" "))) err.push(f.clave + ": nombra la opción por letra " + e.id);
  }
  const mc = (f.ejercicios as any[]).filter(e => e.tipo === "opcion_multiple");
  const cuenta = new Map<string, number>(); for (const e of mc) cuenta.set(e.respuesta, (cuenta.get(e.respuesta) ?? 0) + 1);
  if (mc.length >= 4 && Math.max(...cuenta.values()) > Math.ceil(mc.length * 0.6)) err.push(f.clave + ": la respuesta correcta casi siempre en la misma posición");
  const g = mayorGrupoParecido(f.ejercicios.map((e: any) => e.enunciado)); if (g >= 6) err.push(f.clave + ": " + g + " enunciados casi iguales");
  const pre = (f.ejercicios as any[]).filter(e => /^(En|Durante|Al|Para|Con|Después|Antes|Cuando|Sobre)[^:.]{3,80}: /.test(e.pistas[0])).length; if (pre >= 3) err.push(f.clave + ": " + pre + " pistas con prefijo de contexto repetido");
  const mira = (f.ejercicios as any[]).filter(e => /\bMira (los|las|el|la) [a-zñáéíóú]+ (en|de) /.test(e.pistas[0])).length; if (mira >= 3) err.push(f.clave + ": " + mira + " pistas «Mira los X en el Y»");
  const gp = mayorGrupoParecido(f.ejercicios.map((e: any) => e.pistas[0])); if (gp >= 6) err.push(f.clave + ": " + gp + " primeras pistas casi iguales");
}
for (const k of pedidas) if (!vistas.has(k)) err.push(k + ": falta la ficha");
console.log(err.length ? err.join("\n") : "OK " + datos.length + " fichas");
process.exitCode = err.length ? 1 : 0;
}
main();
