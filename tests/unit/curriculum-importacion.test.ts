import { describe, expect, it } from "vitest";
import {
  clavePropuesta,
  fusionar,
  simularSegundaCorrida,
  validarCandidato,
  type Candidato,
  type MapeoEditorial,
  type TemaBanco,
} from "@/lib/curriculum/importacion/fusion";
const candidato: Candidato = {
  stable_code: "KH-P1-MAT-ARI-001",
  level: "Primaria",
  grade: "P1",
  cycle: "III",
  area_code: "MAT",
  area_name: "Matemática",
  discipline_code: "ARI",
  topic_title: "Conteo hasta 20",
  editorial_status: "imported_draft",
  provenance_type: "EDITORIAL_PROPOSAL",
  source_mapping_status: "PENDING_GRADE_VALIDATION",
  is_official_topic: false,
  license_status: "ORIGINAL_METADATA_PENDING_REVIEW",
};
const tema: TemaBanco = {
  clave: "mat.p1.conteo-hasta-20",
  nombre: "Conteo hasta 20",
  area: "matematica",
  nivel: "primaria",
  grado: 1,
  disciplina: "aritmetica",
};
const mapa = (
  tipo: "emparejado" | "cubierto" | "nuevo" | "conflicto",
  claves: string[] = [],
  motivo = "Revisión editorial",
): MapeoEditorial => ({ [candidato.stable_code]: { tipo, claves, motivo } });
describe("fusión curricular", () => {
  it("valida la propuesta editorial y rechaza grado y estado inválidos", () => {
    expect(validarCandidato(candidato)).toBeNull();
    expect(validarCandidato({ ...candidato, grade: "P7" })).toMatch(/grado/);
    expect(
      validarCandidato({ ...candidato, grade: null as unknown as string }),
    ).toMatch(/Columnas/);
    expect(
      validarCandidato({ ...candidato, editorial_status: "published" }),
    ).toMatch(/Estado/);
  });
  it("conserva la clave editorial existente aunque cambie el título", () => {
    expect(
      fusionar(
        [{ ...candidato, topic_title: "Conteo de colecciones hasta 20" }],
        [tema],
        mapa("emparejado", [tema.clave]),
      )[0],
    ).toMatchObject({ tipo: "emparejado", clave: tema.clave });
  });
  it("declara cobertura por varios temas del mismo grado o grado vecino", () => {
    const otro = { ...tema, clave: "mat.p2.contar-hasta-100", grado: 2 };
    expect(
      fusionar(
        [candidato],
        [tema, otro],
        mapa("cubierto", [tema.clave, otro.clave]),
      )[0],
    ).toMatchObject({ tipo: "cubierto", claves: [tema.clave, otro.clave] });
    expect(
      fusionar(
        [candidato],
        [tema, { ...otro, grado: 4 }],
        mapa("cubierto", [tema.clave, otro.clave]),
      )[0].tipo,
    ).toBe("conflicto");
  });
  it("propone clave estable y segunda corrida sin altas", () => {
    const m = mapa("nuevo");
    const primera = fusionar([candidato], [tema], m);
    expect(primera[0]).toMatchObject({
      tipo: "nuevo",
      clave: clavePropuesta(candidato),
    });
    expect(simularSegundaCorrida([candidato], [tema], m)[0]).toMatchObject({
      tipo: "emparejado",
      clave: clavePropuesta(candidato),
    });
  });
  it("bloquea decisiones ausentes, claves inválidas y códigos duplicados", () => {
    expect(fusionar([candidato], [tema], {})[0].motivo).toMatch(
      /Falta decisión/,
    );
    expect(
      fusionar([candidato], [tema], mapa("emparejado", ["mat.p1.no-existe"]))[0]
        .tipo,
    ).toBe("conflicto");
    expect(
      fusionar(
        [candidato, candidato],
        [tema],
        mapa("emparejado", [tema.clave]),
      )[1].motivo,
    ).toBe("Código estable repetido");
  });
  it("inventaría áreas sin banco", () => {
    const otro = {
      ...candidato,
      stable_code: "KH-P1-ENG-GEN-001",
      area_code: "ENG",
      area_name: "Inglés",
      discipline_code: "GEN",
    };
    expect(fusionar([otro], [], {})[0].tipo).toBe("inventario");
  });
});
