import { CURSOS_KHIPU } from '@/lib/cursos-khipu/catalogo';
import { DISCIPLINAS } from '@/lib/nudito/conocimiento/disciplinas';

export type Candidato = { stable_code: string; level: string; grade: string; cycle: string; area_code: string; area_name: string; discipline_code: string; topic_title: string; editorial_status: string; provenance_type: string; source_mapping_status: string; is_official_topic: boolean; license_status: string };
export type TemaBanco = { clave: string; nombre: string; area: string; nivel: 'primaria' | 'secundaria'; grado: number; disciplina?: string };
export type FilaFusion = { codigo: string; titulo: string; area: string; grado: string; disciplina: string | null; tipo: 'emparejado' | 'nuevo' | 'conflicto' | 'inventario'; clave?: string; motivo?: string; similitud?: number };
const AREA: Record<string, string> = { MAT: 'matematica', COM: 'comunicacion', CYT: 'ciencia-tecnologia', PS: 'personal-social', ENG: 'ingles', AYC: 'arte-cultura', EFI: 'educacion-fisica', REL: 'educacion-religiosa', CSL: 'castellano-segunda-lengua', CCS: 'ciencias-sociales', DPC: 'dpcc', EPT: 'ept' };
const DISCIPLINA: Record<string, Record<string, string>> = {
  MAT: { ARI: 'aritmetica', ALG: 'algebra', GEO: 'geometria', EST: 'estadistica', RMA: 'aritmetica', TRI: 'trigonometria' },
  COM: { ORA: 'oralidad', LEC: 'comprension-lectora', ESC: 'escritura', GRA: 'lenguaje', LIT: 'literatura', RVB: 'razonamiento-verbal' },
  CYT: { BIO: 'biologia', FIS: 'fisica', QUI: 'quimica', TIE: 'tierra-universo', IND: 'indagacion', TEC: 'tecnologia' },
};
const CICLO: Record<string, string> = { P1: 'III', P2: 'III', P3: 'IV', P4: 'IV', P5: 'V', P6: 'V', S1: 'VI', S2: 'VI', S3: 'VII', S4: 'VII', S5: 'VII' };
export function normalizarTitulo(s: string): string { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' '); }
export function similitud(a: string, b: string): number {
  const x = normalizarTitulo(a), y = normalizarTitulo(b);
  if (x === y) return 1;
  if (!x || !y) return 0;
  const pares = (s: string) => { const m = new Map<string, number>(); for (let i = 0; i < s.length - 1; i++) { const p = s.slice(i, i + 2); m.set(p, (m.get(p) ?? 0) + 1); } return m; };
  const p = pares(x), q = pares(y); let iguales = 0;
  for (const [k, n] of p) iguales += Math.min(n, q.get(k) ?? 0);
  return 2 * iguales / (Math.max(1, x.length - 1) + Math.max(1, y.length - 1));
}
export function validarCandidato(c: Candidato): string | null {
  if (!c || typeof c.stable_code !== 'string' || typeof c.grade !== 'string' || typeof c.area_code !== 'string' || typeof c.discipline_code !== 'string' || typeof c.topic_title !== 'string') return 'Columnas obligatorias inválidas';
  if (!/^KH-[PS][1-6]-[A-Z]{2,3}-[A-Z]{3}-\d{3}$/.test(c.stable_code)) return 'Código estable inválido';
  const grado = c.grade.toUpperCase(), partes = c.stable_code.split('-');
  if (!(grado in CICLO) || partes[1] !== grado || c.cycle !== CICLO[grado] || c.level !== (grado[0] === 'P' ? 'Primaria' : 'Secundaria')) return 'Nivel, grado o ciclo inválido';
  if (!AREA[c.area_code] || partes[2] !== c.area_code || partes[3] !== c.discipline_code) return 'Área o disciplina incoherente';
  const nivel = grado[0] === 'P' ? 'primaria' : 'secundaria';
  if (!CURSOS_KHIPU.some(k => k.clave === AREA[c.area_code] && k.niveles.includes(nivel))) return 'Área fuera de nivel';
  if (DISCIPLINA[c.area_code] && !DISCIPLINA[c.area_code][c.discipline_code]) return 'Disciplina desconocida';
  if (DISCIPLINA[c.area_code] && !(DISCIPLINAS[AREA[c.area_code] as keyof typeof DISCIPLINAS] as readonly string[]).includes(DISCIPLINA[c.area_code][c.discipline_code])) return 'Disciplina sin mapeo Nudito';
  if (!c.topic_title?.trim()) return 'Título vacío';
  if (c.editorial_status !== 'imported_draft' || c.provenance_type !== 'EDITORIAL_PROPOSAL' || c.source_mapping_status !== 'PENDING_GRADE_VALIDATION' || c.is_official_topic !== false || c.license_status !== 'ORIGINAL_METADATA_PENDING_REVIEW') return 'Estado o procedencia inválidos';
  return null;
}
export function clavePropuesta(c: Candidato): string {
  const area = ({ MAT: 'mat', COM: 'com', CYT: 'cyt' } as Record<string,string>)[c.area_code] ?? c.area_code.toLowerCase();
  return area + '.' + c.grade.toLowerCase() + '.kh-' + c.discipline_code.toLowerCase() + '-' + c.stable_code.slice(-3);
}
export function fusionar(candidatos: readonly Candidato[], banco: readonly TemaBanco[]): FilaFusion[] {
  const codigos = new Set<string>(), claves = new Set(banco.map(t => t.clave)); const filas: FilaFusion[] = [];
  for (const c of [...candidatos].sort((a, b) => a.stable_code.localeCompare(b.stable_code, 'en'))) {
    const base = { codigo: c.stable_code, titulo: c.topic_title, area: AREA[c.area_code] ?? c.area_code, grado: c.grade, disciplina: DISCIPLINA[c.area_code]?.[c.discipline_code] ?? null };
    const error = validarCandidato(c);
    if (codigos.has(c.stable_code)) { filas.push({ ...base, tipo: 'conflicto', motivo: 'Código estable repetido' }); continue; }
    codigos.add(c.stable_code);
    if (error) { filas.push({ ...base, tipo: 'conflicto', motivo: error }); continue; }
    if (!DISCIPLINA[c.area_code]) { filas.push({ ...base, tipo: 'inventario' }); continue; }
    const propuesta = clavePropuesta(c);
    const existentePorCodigo = banco.find(t => t.clave === propuesta);
    if (existentePorCodigo) {
      filas.push(normalizarTitulo(existentePorCodigo.nombre) === normalizarTitulo(c.topic_title) ? { ...base, tipo: 'emparejado', clave: propuesta, similitud: 1 } : { ...base, tipo: 'conflicto', motivo: 'Clave propuesta ya ocupada: ' + propuesta });
      continue;
    }
    const comparables = banco.filter(t => t.area === base.area && t.nivel === (c.grade[0] === 'P' ? 'primaria' : 'secundaria') && t.grado === Number(c.grade.slice(1)));
    const puntuados = comparables.map(t => ({ tema: t, valor: similitud(c.topic_title, t.nombre) })).sort((a, b) => b.valor - a.valor || a.tema.clave.localeCompare(b.tema.clave));
    const [primero, segundo] = puntuados;
    if (primero?.valor === 1 && segundo?.valor === 1) filas.push({ ...base, tipo: 'conflicto', motivo: 'Varios temas idénticos: ' + primero.tema.clave + ', ' + segundo.tema.clave });
    else if (primero?.valor === 1 || (primero?.valor >= 0.9 && (segundo?.valor ?? 0) <= primero.valor - 0.12)) filas.push({ ...base, tipo: 'emparejado', clave: primero.tema.clave, similitud: primero.valor });
    else if (primero?.valor >= 0.62) filas.push({ ...base, tipo: 'conflicto', motivo: 'Posible coincidencia: ' + primero.tema.clave, similitud: primero.valor });
    else { const clave = clavePropuesta(c); filas.push(claves.has(clave) ? { ...base, tipo: 'emparejado', clave, similitud: 1 } : { ...base, tipo: 'nuevo', clave }); claves.add(clave); }
  }
  return filas;
}
export function simularSegundaCorrida(candidatos: readonly Candidato[], banco: readonly TemaBanco[], filas: readonly FilaFusion[]): FilaFusion[] {
  const agregados: TemaBanco[] = filas.filter(f => f.tipo === 'nuevo' && f.clave).map(f => ({ clave: f.clave!, nombre: f.titulo, area: f.area, nivel: f.grado[0] === 'P' ? 'primaria' : 'secundaria', grado: Number(f.grado.slice(1)), disciplina: f.disciplina ?? undefined }));
  return fusionar(candidatos, [...banco, ...agregados]);
}
