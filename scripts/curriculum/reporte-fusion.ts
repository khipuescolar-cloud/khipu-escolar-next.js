import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fusionar, simularSegundaCorrida, type Candidato, type FilaFusion, type TemaBanco } from '../../src/lib/curriculum/importacion/fusion';

async function main() {
const args = process.argv.slice(2);
if (args.includes('--help') || !args.includes('--paquete')) {
  console.log('Uso: pnpm exec tsx scripts/curriculum/reporte-fusion.ts --paquete /ruta/KHIPU-CURRICULUM [--dry-run]');
  process.exit(args.includes('--help') ? 0 : 1);
}
if (args.some(a => a.startsWith('--') && !['--paquete', '--dry-run'].includes(a))) throw new Error('Solo se permite --dry-run; la aplicación requiere revisión humana.');
const paquete = args[args.indexOf('--paquete') + 1];
if (!paquete || paquete.startsWith('--')) throw new Error('Falta la ruta del paquete.');
const candidatos = JSON.parse(await readFile(resolve(paquete, 'data/catalogo-inicial.json'), 'utf8')) as Candidato[];
const bancoRoot = resolve('src/lib/nudito/conocimiento/banco');
const archivos: string[] = [];
for (const area of await readdir(bancoRoot)) for (const grado of await readdir(join(bancoRoot, area))) {
  const archivo = join(bancoRoot, area, grado, 'temario-propuesto.json');
  try { await readFile(archivo); archivos.push(archivo); } catch { /* carpeta sin temario */ }
}
const banco: TemaBanco[] = [];
for (const archivo of archivos.sort()) {
  const temario = JSON.parse(await readFile(archivo, 'utf8')) as { area: string; nivel: 'primaria' | 'secundaria'; grado: number; competencias: { capacidades: { bloques: { temas: { clave: string; nombre: string; disciplina?: string }[] }[] }[] }[] };
  for (const comp of temario.competencias) for (const cap of comp.capacidades) for (const bloque of cap.bloques) for (const tema of bloque.temas) banco.push({ ...tema, area: temario.area, nivel: temario.nivel, grado: temario.grado });
}
const filas = fusionar(candidatos, banco);
const segunda = simularSegundaCorrida(candidatos, banco, filas);
const tipos = ['emparejado', 'nuevo', 'conflicto', 'inventario'] as const;
const conteo = (lista: readonly FilaFusion[]) => Object.fromEntries(tipos.map(t => [t, lista.filter(f => f.tipo === t).length]));
function tabla(lista: readonly FilaFusion[], campo: 'area' | 'grado'): string {
  const grupos = [...new Set(lista.map(f => f[campo]))].sort();
  return '| ' + (campo === 'area' ? 'Área' : 'Grado') + ' | Emparejados | Nuevos | Conflictos | Inventario | Total |\n|---|---:|---:|---:|---:|---:|\n' +
    grupos.map(g => { const x = lista.filter(f => f[campo] === g); const n = conteo(x); return '| ' + g + ' | ' + tipos.map(t => n[t]).join(' | ') + ' | ' + x.length + ' |'; }).join('\n');
}
function detalle(tipo: FilaFusion['tipo']): string {
  return filas.filter(f => f.tipo === tipo).map(f => '| ' + [f.codigo, f.titulo.replaceAll('|', '\\|'), f.area, f.grado, f.disciplina ?? '—', f.clave ?? '—', f.similitud === undefined ? '—' : f.similitud.toFixed(3), (f.motivo ?? '—').replaceAll('|', '\\|')].join(' | ') + ' |').join('\n');
}
const totales = conteo(filas), segundaCuenta = conteo(segunda);
const reporte = ['# Reporte de fusión editorial (dry-run)', '', 'Origen: paquete KHIPU-CURRICULUM v0.1, metadatos originales con licencia pendiente de revisión. No se copian ni aplican datos al banco.', '', 'Método: misma área y grado; nombre normalizado idéntico o similitud de bigramas ≥ 0,90 con margen ≥ 0,12 para emparejar. Similitud ≥ 0,62 se remite a revisión. El resto recibe una clave propuesta derivada de stable_code. Los emparejamientos conservan la clave actual. RMA se clasifica en aritmética para esta previsualización. Para áreas sin banco Nudito solo hay inventario.', '', 'Banco leído: ' + archivos.length + ' temarios, ' + banco.length + ' entradas de tema. Candidatos: ' + candidatos.length + '.', '', '## Totales', '', '| Emparejados | Nuevos | Conflictos | Inventario |', '|---:|---:|---:|---:|', '| ' + tipos.map(t => totales[t]).join(' | ') + ' |', '', 'Segunda corrida simulada después de incorporar únicamente las claves nuevas: ' + segundaCuenta.nuevo + ' altas.', '', '## Por área', '', tabla(filas, 'area'), '', '## Por grado', '', tabla(filas, 'grado'), '', ...tipos.map(t => '## ' + t[0].toUpperCase() + t.slice(1) + '\n\n| Código | Título | Área | Grado | Disciplina | Clave | Similitud | Motivo |\n|---|---|---|---|---|---|---:|---|\n' + detalle(t) + '\n')].join('\n');
await mkdir(resolve('docs/curriculum'), { recursive: true });
await writeFile(resolve('docs/curriculum/reporte-fusion.md'), reporte.trimEnd() + '\n');
console.log(JSON.stringify({ archivos: archivos.length, banco: banco.length, candidatos: candidatos.length, totales, segundaCuenta }));

}
main().catch(error => { console.error(error); process.exitCode = 1; });
