import { CURSOS_KHIPU } from "@/lib/cursos-khipu/catalogo";
import { DISCIPLINAS } from "@/lib/nudito/conocimiento/disciplinas";

export type Candidato = {
  stable_code: string;
  level: string;
  grade: string;
  cycle: string;
  area_code: string;
  area_name: string;
  discipline_code: string;
  topic_title: string;
  editorial_status: string;
  provenance_type: string;
  source_mapping_status: string;
  is_official_topic: boolean;
  license_status: string;
};
export type TemaBanco = {
  clave: string;
  nombre: string;
  area: string;
  nivel: "primaria" | "secundaria";
  grado: number;
  disciplina?: string;
};
export type FilaFusion = {
  codigo: string;
  titulo: string;
  area: string;
  grado: string;
  disciplina: string | null;
  tipo: "emparejado" | "cubierto" | "nuevo" | "conflicto" | "inventario";
  clave?: string;
  claves?: string[];
  motivo?: string;
};
const AREA: Record<string, string> = {
  MAT: "matematica",
  COM: "comunicacion",
  CYT: "ciencia-tecnologia",
  PS: "personal-social",
  ENG: "ingles",
  AYC: "arte-cultura",
  EFI: "educacion-fisica",
  REL: "educacion-religiosa",
  CSL: "castellano-segunda-lengua",
  CCS: "ciencias-sociales",
  DPC: "dpcc",
  EPT: "ept",
};
const DISCIPLINA: Record<string, Record<string, string>> = {
  MAT: {
    ARI: "aritmetica",
    ALG: "algebra",
    GEO: "geometria",
    EST: "estadistica",
    RMA: "aritmetica",
    TRI: "trigonometria",
  },
  COM: {
    ORA: "oralidad",
    LEC: "comprension-lectora",
    ESC: "escritura",
    GRA: "lenguaje",
    LIT: "literatura",
    RVB: "razonamiento-verbal",
  },
  CYT: {
    BIO: "biologia",
    FIS: "fisica",
    QUI: "quimica",
    TIE: "tierra-universo",
    IND: "indagacion",
    TEC: "tecnologia",
  },
};
const CICLO: Record<string, string> = {
  P1: "III",
  P2: "III",
  P3: "IV",
  P4: "IV",
  P5: "V",
  P6: "V",
  S1: "VI",
  S2: "VI",
  S3: "VII",
  S4: "VII",
  S5: "VII",
};
export function normalizarTitulo(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export function validarCandidato(c: Candidato): string | null {
  if (
    !c ||
    typeof c.stable_code !== "string" ||
    typeof c.grade !== "string" ||
    typeof c.area_code !== "string" ||
    typeof c.discipline_code !== "string" ||
    typeof c.topic_title !== "string"
  )
    return "Columnas obligatorias inválidas";
  if (!/^KH-[PS][1-6]-[A-Z]{2,3}-[A-Z]{3}-\d{3}$/.test(c.stable_code))
    return "Código estable inválido";
  const grado = c.grade.toUpperCase(),
    partes = c.stable_code.split("-");
  if (
    !(grado in CICLO) ||
    partes[1] !== grado ||
    c.cycle !== CICLO[grado] ||
    c.level !== (grado[0] === "P" ? "Primaria" : "Secundaria")
  )
    return "Nivel, grado o ciclo inválido";
  if (
    !AREA[c.area_code] ||
    partes[2] !== c.area_code ||
    partes[3] !== c.discipline_code
  )
    return "Área o disciplina incoherente";
  const nivel = grado[0] === "P" ? "primaria" : "secundaria";
  if (
    !CURSOS_KHIPU.some(
      (k) => k.clave === AREA[c.area_code] && k.niveles.includes(nivel),
    )
  )
    return "Área fuera de nivel";
  if (DISCIPLINA[c.area_code] && !DISCIPLINA[c.area_code][c.discipline_code])
    return "Disciplina desconocida";
  if (
    DISCIPLINA[c.area_code] &&
    !(
      DISCIPLINAS[
        AREA[c.area_code] as keyof typeof DISCIPLINAS
      ] as readonly string[]
    ).includes(DISCIPLINA[c.area_code][c.discipline_code])
  )
    return "Disciplina sin mapeo Nudito";
  if (!c.topic_title?.trim()) return "Título vacío";
  if (
    c.editorial_status !== "imported_draft" ||
    c.provenance_type !== "EDITORIAL_PROPOSAL" ||
    c.source_mapping_status !== "PENDING_GRADE_VALIDATION" ||
    c.is_official_topic !== false ||
    c.license_status !== "ORIGINAL_METADATA_PENDING_REVIEW"
  )
    return "Estado o procedencia inválidos";
  return null;
}
export function clavePropuesta(c: Candidato): string {
  const area =
    ({ MAT: "mat", COM: "com", CYT: "cyt" } as Record<string, string>)[
      c.area_code
    ] ?? c.area_code.toLowerCase();
  return (
    area +
    "." +
    c.grade.toLowerCase() +
    ".kh-" +
    c.discipline_code.toLowerCase() +
    "-" +
    c.stable_code.slice(-3)
  );
}
export type DecisionEditorial = {
  tipo: "emparejado" | "cubierto" | "nuevo" | "conflicto";
  claves: string[];
  motivo: string;
};
export type MapeoEditorial = Record<string, DecisionEditorial>;

/** Aplica decisiones editoriales explícitas. Una fila sin decisión queda en conflicto. */
export function fusionar(
  candidatos: readonly Candidato[],
  banco: readonly TemaBanco[],
  mapeo: MapeoEditorial,
): FilaFusion[] {
  const codigos = new Set<string>();
  const porClave = new Map(banco.map((t) => [t.clave, t]));
  const filas: FilaFusion[] = [];
  for (const c of [...candidatos].sort((a, b) =>
    String(a.stable_code).localeCompare(String(b.stable_code)),
  )) {
    const base = {
      codigo: c.stable_code,
      titulo: c.topic_title,
      area: AREA[c.area_code] ?? c.area_code,
      grado: c.grade,
      disciplina: DISCIPLINA[c.area_code]?.[c.discipline_code] ?? null,
    };
    const error = validarCandidato(c);
    if (codigos.has(c.stable_code)) {
      filas.push({
        ...base,
        tipo: "conflicto",
        motivo: "Código estable repetido",
      });
      continue;
    }
    codigos.add(c.stable_code);
    if (error) {
      filas.push({ ...base, tipo: "conflicto", motivo: error });
      continue;
    }
    if (!DISCIPLINA[c.area_code]) {
      filas.push({ ...base, tipo: "inventario" });
      continue;
    }
    const d = mapeo[c.stable_code];
    if (!d) {
      filas.push({
        ...base,
        tipo: "conflicto",
        motivo: "Falta decisión editorial versionada",
      });
      continue;
    }
    if (
      !d.motivo?.trim() ||
      !Array.isArray(d.claves) ||
      !["emparejado", "cubierto", "nuevo", "conflicto"].includes(d.tipo)
    ) {
      filas.push({
        ...base,
        tipo: "conflicto",
        motivo: "Decisión editorial inválida",
      });
      continue;
    }
    if (d.tipo === "conflicto") {
      filas.push({ ...base, tipo: "conflicto", motivo: d.motivo });
      continue;
    }
    if (d.tipo === "nuevo") {
      if (d.claves.length) {
        filas.push({
          ...base,
          tipo: "conflicto",
          motivo: "Nuevo no debe referenciar temas existentes",
        });
        continue;
      }
      const clave = clavePropuesta(c),
        anterior = porClave.get(clave);
      if (
        anterior &&
        normalizarTitulo(anterior.nombre) !== normalizarTitulo(c.topic_title)
      )
        filas.push({
          ...base,
          tipo: "conflicto",
          motivo: "Clave propuesta ocupada por otro tema",
        });
      else
        filas.push({
          ...base,
          tipo: anterior ? "emparejado" : "nuevo",
          clave,
          motivo: d.motivo,
        });
      continue;
    }
    if (
      (d.tipo === "emparejado" && d.claves.length !== 1) ||
      (d.tipo === "cubierto" && d.claves.length < 2) ||
      new Set(d.claves).size !== d.claves.length
    ) {
      filas.push({
        ...base,
        tipo: "conflicto",
        motivo: "Número de claves o duplicación inválidos",
      });
      continue;
    }
    const temas = d.claves.map((k) => porClave.get(k));
    if (
      temas.some(
        (t) =>
          !t ||
          t.area !== base.area ||
          t.nivel !== (c.grade[0] === "P" ? "primaria" : "secundaria") ||
          Math.abs(t.grado - Number(c.grade.slice(1))) >
            (d.tipo === "cubierto" ? 1 : 0),
      )
    ) {
      filas.push({
        ...base,
        tipo: "conflicto",
        motivo: "Clave inexistente o fuera de área/grado permitido",
      });
      continue;
    }
    filas.push({
      ...base,
      tipo: d.tipo,
      clave: d.tipo === "emparejado" ? d.claves[0] : undefined,
      claves: d.tipo === "cubierto" ? d.claves : undefined,
      motivo: d.motivo,
    });
  }
  return filas;
}
export function simularSegundaCorrida(
  candidatos: readonly Candidato[],
  banco: readonly TemaBanco[],
  mapeo: MapeoEditorial,
): FilaFusion[] {
  const primera = fusionar(candidatos, banco, mapeo);
  const agregados: TemaBanco[] = primera
    .filter((f) => f.tipo === "nuevo" && f.clave)
    .map((f) => ({
      clave: f.clave!,
      nombre: f.titulo,
      area: f.area,
      nivel: f.grado[0] === "P" ? "primaria" : "secundaria",
      grado: Number(f.grado.slice(1)),
      disciplina: f.disciplina ?? undefined,
    }));
  return fusionar(candidatos, [...banco, ...agregados], mapeo);
}
