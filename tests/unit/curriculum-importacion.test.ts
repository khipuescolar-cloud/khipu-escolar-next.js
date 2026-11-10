import { describe, expect, it } from 'vitest';
import { clavePropuesta, fusionar, simularSegundaCorrida, validarCandidato, type Candidato, type TemaBanco } from '@/lib/curriculum/importacion/fusion';
const candidato: Candidato = { stable_code: 'KH-P1-MAT-ARI-001', level: 'Primaria', grade: 'P1', cycle: 'III', area_code: 'MAT', area_name: 'Matemática', discipline_code: 'ARI', topic_title: 'Conteo hasta 20', editorial_status: 'imported_draft', provenance_type: 'EDITORIAL_PROPOSAL', source_mapping_status: 'PENDING_GRADE_VALIDATION', is_official_topic: false, license_status: 'ORIGINAL_METADATA_PENDING_REVIEW' };
const tema: TemaBanco = { clave: 'mat.p1.conteo-hasta-20', nombre: 'Conteo hasta 20', area: 'matematica', nivel: 'primaria', grado: 1, disciplina: 'aritmetica' };
describe('fusión curricular', () => {
  it('valida la propuesta editorial', () => expect(validarCandidato(candidato)).toBeNull());
  it('conserva la clave existente ante nombre equivalente', () => expect(fusionar([{ ...candidato, topic_title: 'CONTEO, hasta 20' }], [tema])[0]).toMatchObject({ tipo: 'emparejado', clave: tema.clave }));
  it('propone clave estable y segunda corrida sin altas', () => {
    const nuevo = { ...candidato, topic_title: 'Medición con semillas' };
    const primera = fusionar([nuevo], [tema]);
    expect(primera[0]).toMatchObject({ tipo: 'nuevo', clave: clavePropuesta(nuevo) });
    expect(simularSegundaCorrida([nuevo], [tema], primera)[0]).toMatchObject({ tipo: 'emparejado', clave: clavePropuesta(nuevo) });
  });
  it('separa coincidencia ambigua y código repetido', () => {
    expect(fusionar([candidato], [tema, { ...tema, clave: 'mat.p1.otro' }])[0].tipo).toBe('conflicto');
    expect(fusionar([candidato, candidato], [])[1].motivo).toBe('Código estable repetido');
  });
  it('rechaza grado y estado inválidos', () => {
    expect(validarCandidato({ ...candidato, grade: 'P7' })).toMatch(/grado/);
    expect(validarCandidato({ ...candidato, grade: null as unknown as string })).toMatch(/Columnas/);
    expect(validarCandidato({ ...candidato, editorial_status: 'published' })).toMatch(/Estado/);
  });
  it('inventaría áreas sin banco', () => {
    const otro = { ...candidato, stable_code: 'KH-P1-ENG-GEN-001', area_code: 'ENG', area_name: 'Inglés', discipline_code: 'GEN' };
    expect(fusionar([otro], [])[0].tipo).toBe('inventario');
  });
});
