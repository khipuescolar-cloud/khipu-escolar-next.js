// Catálogo del Currículo Nacional de la Educación Básica (CNEB, MINEDU) y lógica pura de importación (specs/30).
// Solo datos y funciones puras: sin BD. Los JSON de esta carpeta transcriben los Programas Curriculares oficiales
// (Inicial, Primaria y Secundaria, MINEDU 2016–2017); cada uno indica su fuente. Lo que no se pudo verificar está en PENDIENTES.md.
import type { Nivel } from "@/generated/prisma/enums";
import arteCultura from "./arte-cultura.json";
import castellanoSegundaLengua from "./castellano-segunda-lengua.json";
import cienciaTecnologia from "./ciencia-tecnologia.json";
import cienciasSociales from "./ciencias-sociales.json";
import comunicacion from "./comunicacion.json";
import dpcc from "./dpcc.json";
import educacionFisica from "./educacion-fisica.json";
import educacionReligiosa from "./educacion-religiosa.json";
import ept from "./ept.json";
import ingles from "./ingles.json";
import matematica from "./matematica.json";
import personalSocial from "./personal-social.json";
import psicomotriz from "./psicomotriz.json";
import transversales from "./transversales.json";

export type NivelCneb = "inicial" | "primaria" | "secundaria";
export const NIVELES_CNEB: readonly NivelCneb[] = ["inicial", "primaria", "secundaria"];

export type CompetenciaCatalogo = {
  /** Número oficial de la competencia en el CNEB (1–31). */
  numero: number;
  nombre: string;
  /** Niveles en los que el área desarrolla esta competencia. */
  niveles: NivelCneb[];
  /** Capacidades oficiales por nivel (los programas de inicial a veces listan menos). */
  capacidades: Partial<Record<NivelCneb, string[]>>;
  /** nivel → grado ("1".."6"; en inicial la edad "3".."5") → textos oficiales. Grado ausente o vacío = sin desempeños (ver PENDIENTES.md). */
  desempenos: Partial<Record<NivelCneb, Record<string, string[]>>>;
};
/** Referencia estable compartida por grados y secciones para la misma competencia CNEB. */
export function codigoOficialCompetencia(numero: number): string {
  return `CNEB-${String(numero).padStart(2, "0")}`;
}

export type ReferenciaCompetenciaOficial = {
  codigoOficial: string;
  area: string;
  nivel: NivelCneb;
  grados: readonly number[];
  gradosConDesempenos: readonly number[];
  nombre: string;
  capacidades: readonly string[];
  versionCurricular: string;
};

/** Metadatos de la plantilla local; la vigencia normativa posterior a 2017 queda por verificar. */
export function competenciasOficiales(area: AreaCatalogo, nivel: NivelCneb): ReferenciaCompetenciaOficial[] {
  return area.competencias.filter((c) => c.niveles.includes(nivel)).map((c) => ({
    codigoOficial: codigoOficialCompetencia(c.numero),
    area: area.area,
    nivel,
    grados: GRADOS_POR_NIVEL[nivel],
    gradosConDesempenos: GRADOS_POR_NIVEL[nivel].filter((grado) => (c.desempenos[nivel]?.[String(grado)]?.length ?? 0) > 0),
    nombre: c.nombre,
    capacidades: c.capacidades[nivel] ?? [],
    versionCurricular: "Programas curriculares MINEDU 2016–2017 (vigencia por verificar)",
  }));
}
export type FuenteCatalogo = { documento: string; url: string; anio: number; nivel?: NivelCneb; paginas?: string };
export type AreaCatalogo = {
  area: string;
  nombre: string;
  prefijo: string;
  niveles: NivelCneb[];
  /** Nombres de curso normalizados (sin tildes, minúsculas) que se asocian a esta área. */
  sinonimos: string[];
  fuentes: FuenteCatalogo[];
  competencias: CompetenciaCatalogo[];
};

const transversalesArea = transversales as AreaCatalogo;
/** «TIC» es la misma competencia 28 de las transversales, para cursos de Computación o Informática. */
const tic: AreaCatalogo = {
  ...transversalesArea,
  area: "tic",
  nombre: "TIC (Computación)",
  prefijo: "TIC",
  sinonimos: ["tic", "tics", "computacion", "computo", "informatica", "computacion e informatica", "tecnologias de la informacion", "educacion digital"],
  competencias: transversalesArea.competencias.filter((c) => c.numero === 28),
};

export const CATALOGO_CNEB: readonly AreaCatalogo[] = [
  matematica, comunicacion, personalSocial, psicomotriz, educacionFisica, arteCultura, castellanoSegundaLengua, ingles,
  cienciaTecnologia, educacionReligiosa, dpcc, cienciasSociales, ept, tic, transversalesArea,
] as AreaCatalogo[];

/** Grados válidos por nivel (en inicial, la edad). Academia no usa el CNEB. */
export const GRADOS_POR_NIVEL: Record<Nivel, number[]> = {
  inicial: [3, 4, 5],
  primaria: [1, 2, 3, 4, 5, 6],
  secundaria: [1, 2, 3, 4, 5],
  academia: [],
};

export const ETIQUETA_NIVEL: Record<Nivel, string> = { inicial: "Inicial", primaria: "Primaria", secundaria: "Secundaria", academia: "Academia" };

export function gradoValido(nivel: Nivel, grado: number | null | undefined): grado is number {
  return typeof grado === "number" && GRADOS_POR_NIVEL[nivel].includes(grado);
}

export function esNivelCneb(nivel: Nivel): nivel is NivelCneb {
  return (NIVELES_CNEB as readonly string[]).includes(nivel);
}

/** «3.° de primaria» o «4 años» en inicial. */
export function textoGrado(nivel: Nivel, grado: number): string {
  return nivel === "inicial" ? `${grado} años` : `${grado}.° de ${ETIQUETA_NIVEL[nivel].toLowerCase()}`;
}

/** Minúsculas, sin tildes ni signos, espacios simples. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Dos nombres de competencia o capacidad son «el mismo» si coinciden normalizados, o si uno empieza con el otro
 * (p. ej. «Lee diversos tipos de textos escritos» ⊂ «… en su lengua materna»). Exige 15+ caracteres para el prefijo.
 */
export function mismoNombre(a: string, b: string): boolean {
  const x = normalizar(a);
  const y = normalizar(b);
  if (x === y) return true;
  const [corto, largo] = x.length <= y.length ? [x, y] : [y, x];
  return corto.length >= 15 && largo.startsWith(corto);
}

/** Áreas del catálogo que tienen competencias en ese nivel (todas si el nivel no usa el CNEB). */
export function areasDelNivel(nivel?: Nivel): AreaCatalogo[] {
  if (!nivel || !esNivelCneb(nivel)) return [...CATALOGO_CNEB];
  return CATALOGO_CNEB.filter((a) => a.niveles.includes(nivel));
}

/**
 * Área del catálogo según el nombre del curso («Matemática», «DPCC», «Religión»…), o null. Gana el sinónimo más largo
 * («Castellano como segunda lengua» no es «Comunicación»), y con `nivel` se prefieren las áreas de ese nivel
 * («Educación Física» en inicial es Psicomotriz).
 */
export function detectarArea(nombreCurso: string, nivel?: Nivel): AreaCatalogo | null {
  const n = normalizar(nombreCurso);
  if (!n) return null;
  const candidatas = (lista: readonly AreaCatalogo[]) => {
    let mejor: { area: AreaCatalogo; largo: number } | null = null;
    for (const a of lista) {
      for (const s of a.sinonimos) {
        if ((n === s || n.startsWith(`${s} `)) && (!mejor || s.length > mejor.largo)) mejor = { area: a, largo: s.length };
      }
    }
    return mejor?.area ?? null;
  };
  return (nivel ? candidatas(areasDelNivel(nivel)) : null) ?? candidatas(CATALOGO_CNEB);
}

export function areaPorClave(area: string): AreaCatalogo | null {
  return CATALOGO_CNEB.find((a) => a.area === area) ?? null;
}

export type PlantillaCompetencia = {
  nombre: string;
  capacidades: string[];
  desempenos: { capacidad: string | null; descripcion: string; codigo: string }[];
};

const LETRA_NIVEL: Record<NivelCneb, string> = { inicial: "I", primaria: "P", secundaria: "S" };

/** Código estable de un desempeño del catálogo: MAT-C23-P3-02 (área, n.° de competencia del CNEB, nivel+grado, número). */
export function codigoDesempeno(prefijo: string, numeroCompetencia: number, nivel: NivelCneb, grado: number, numero: number): string {
  return `${prefijo}-C${numeroCompetencia}-${LETRA_NIVEL[nivel]}${grado}-${String(numero + 1).padStart(2, "0")}`;
}

export type ResultadoPlantilla =
  | { ok: true; competencias: PlantillaCompetencia[]; /** Competencias sin desempeños en el catálogo para ese grado. */ sinDesempenos: string[] }
  | { ok: false; error: string };

/**
 * Competencias, capacidades y desempeños del catálogo para un nivel y grado. Las competencias del nivel se importan
 * aunque falten desempeños de ese grado (quedan en `sinDesempenos`). Error si el área no es de ese nivel.
 */
export function plantillaCneb(area: AreaCatalogo, nivel: Nivel, grado: number): ResultadoPlantilla {
  if (!esNivelCneb(nivel)) return { ok: false, error: `El CNEB no se usa en ${ETIQUETA_NIVEL[nivel].toLowerCase()}.` };
  if (!gradoValido(nivel, grado)) return { ok: false, error: "El grado del salón no es válido para su nivel." };
  const propias = area.competencias.filter((c) => c.niveles.includes(nivel));
  if (propias.length === 0) return { ok: false, error: `El área ${area.nombre} no tiene competencias en ${ETIQUETA_NIVEL[nivel].toLowerCase()} según el CNEB. Elige otra área.` };
  const competencias = propias.map((c) => ({
    nombre: c.nombre,
    capacidades: c.capacidades[nivel] ?? [],
    desempenos: (c.desempenos[nivel]?.[String(grado)] ?? []).map((texto, i) => ({
      capacidad: null,
      descripcion: texto,
      codigo: codigoDesempeno(area.prefijo, c.numero, nivel, grado, i),
    })),
  }));
  return { ok: true, competencias, sinDesempenos: competencias.filter((c) => c.desempenos.length === 0).map((c) => c.nombre) };
}

// ───────────── Plan de importación (idempotente) ─────────────

export type CompetenciaExistente = {
  id: string;
  nombre: string;
  orden: number;
  capacidades: { id: string; nombre: string; orden: number }[];
  /** Solo los desempeños del mismo nivel y grado. */
  desempenos: { codigo: string | null; descripcion: string; orden: number }[];
};

export type PasoImportacion = {
  /** null = crear la competencia. */
  competenciaId: string | null;
  nombre: string;
  orden: number;
  capacidadesNuevas: { nombre: string; orden: number }[];
  /** Capacidades que ya existían, por nombre del catálogo → id (para enlazar los desempeños). */
  capacidadesExistentes: Record<string, string>;
  desempenosNuevos: { capacidad: string | null; descripcion: string; codigo: string; orden: number }[];
};

export type PlanImportacion = {
  pasos: PasoImportacion[];
  resumen: { competencias: number; capacidades: number; desempenos: number; omitidos: number };
};

/**
 * Empareja cada competencia de la plantilla con una existente (a lo más una cada una). Primero los nombres iguales y luego
 * los abreviados, del más parecido al menos parecido: así «Construye su identidad» no se queda con la competencia 30
 * («Construye su identidad como persona humana…») si esta también está en la plantilla.
 */
function emparejarCompetencias(plantilla: PlantillaCompetencia[], existentes: CompetenciaExistente[]): Map<number, CompetenciaExistente> {
  const pares: { i: number; e: CompetenciaExistente; parecido: number }[] = [];
  plantilla.forEach((p, i) => {
    const np = normalizar(p.nombre);
    for (const e of existentes) {
      if (!mismoNombre(e.nombre, p.nombre)) continue;
      const ne = normalizar(e.nombre);
      pares.push({ i, e, parecido: Math.min(np.length, ne.length) / Math.max(np.length, ne.length) });
    }
  });
  pares.sort((a, b) => b.parecido - a.parecido || a.i - b.i);
  const resultado = new Map<number, CompetenciaExistente>();
  const usadas = new Set<string>();
  for (const { i, e } of pares) {
    if (resultado.has(i) || usadas.has(e.id)) continue;
    resultado.set(i, e);
    usadas.add(e.id);
  }
  return resultado;
}

/**
 * Compara la plantilla con lo que ya tiene el curso y devuelve solo lo que falta: no duplica competencias
 * (por nombre), capacidades (por nombre dentro de la competencia) ni desempeños (por código o descripción).
 * Importar dos veces da un plan vacío.
 */
export function planearImportacion(plantilla: PlantillaCompetencia[], existentes: CompetenciaExistente[]): PlanImportacion {
  const resumen = { competencias: 0, capacidades: 0, desempenos: 0, omitidos: 0 };
  let ordenCompetencia = Math.max(-1, ...existentes.map((c) => c.orden)) + 1;
  const asignadas = emparejarCompetencias(plantilla, existentes);
  const pasos: PasoImportacion[] = [];

  for (const [i, p] of plantilla.entries()) {
    const existente = asignadas.get(i) ?? null;
    if (!existente) resumen.competencias += 1;

    const capacidadesExistentes: Record<string, string> = {};
    const capacidadesNuevas: PasoImportacion["capacidadesNuevas"] = [];
    let ordenCapacidad = Math.max(-1, ...(existente?.capacidades.map((c) => c.orden) ?? [])) + 1;
    for (const nombre of p.capacidades) {
      const ya = existente?.capacidades.find((c) => normalizar(c.nombre) === normalizar(nombre)) ?? existente?.capacidades.find((c) => mismoNombre(c.nombre, nombre));
      if (ya) {
        capacidadesExistentes[nombre] = ya.id;
        resumen.omitidos += 1;
      } else {
        capacidadesNuevas.push({ nombre, orden: ordenCapacidad++ });
        resumen.capacidades += 1;
      }
    }

    const desempenosNuevos: PasoImportacion["desempenosNuevos"] = [];
    let ordenDesempeno = Math.max(-1, ...(existente?.desempenos.map((d) => d.orden) ?? [])) + 1;
    const codigos = new Set(existente?.desempenos.map((x) => x.codigo).filter(Boolean));
    const descripciones = new Set(existente?.desempenos.map((x) => normalizar(x.descripcion)));
    for (const d of p.desempenos) {
      const ya = codigos.has(d.codigo) || descripciones.has(normalizar(d.descripcion));
      if (ya) {
        resumen.omitidos += 1;
        continue;
      }
      desempenosNuevos.push({ ...d, orden: ordenDesempeno++ });
      resumen.desempenos += 1;
    }

    if (existente) resumen.omitidos += 1;
    if (!existente || capacidadesNuevas.length > 0 || desempenosNuevos.length > 0) {
      pasos.push({
        competenciaId: existente?.id ?? null,
        nombre: p.nombre,
        orden: existente ? existente.orden : ordenCompetencia++,
        capacidadesNuevas,
        capacidadesExistentes,
        desempenosNuevos,
      });
    }
  }
  return { pasos, resumen };
}

/** Mensaje para la persona tras importar. */
export function mensajeImportacion(r: PlanImportacion["resumen"]): string {
  const total = r.competencias + r.capacidades + r.desempenos;
  if (total === 0) return "Ya estaba todo importado. No se agregó nada.";
  const partes = [
    r.competencias > 0 && `${r.competencias} ${r.competencias === 1 ? "competencia" : "competencias"}`,
    r.capacidades > 0 && `${r.capacidades} ${r.capacidades === 1 ? "capacidad" : "capacidades"}`,
    r.desempenos > 0 && `${r.desempenos} ${r.desempenos === 1 ? "desempeño" : "desempeños"}`,
  ].filter(Boolean) as string[];
  const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`;
  return `Importamos ${lista} del CNEB.`;
}

/** Nuevo orden al subir o bajar un elemento: devuelve los ids en su nueva posición (sin cambios si está en el borde). */
export function reordenar<T extends { id: string }>(lista: T[], id: string, direccion: "arriba" | "abajo"): string[] {
  const ids = lista.map((x) => x.id);
  const i = ids.indexOf(id);
  const j = direccion === "arriba" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids;
}
