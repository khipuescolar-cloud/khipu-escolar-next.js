// Catálogo inicial del Currículo Nacional de Educación Básica (CNEB, MINEDU) y lógica pura de importación (specs/30).
// Solo datos y funciones puras: sin BD. Los textos de los desempeños deben revisarse con el texto oficial del CNEB.
import type { Nivel } from "@/generated/prisma/enums";
import comunicacion from "./comunicacion.json";
import matematica from "./matematica.json";

export type DesempenoCatalogo = { capacidad: number | null; texto: string };
export type CompetenciaCatalogo = {
  nombre: string;
  capacidades: string[];
  /** nivel → grado ("1".."6") → desempeños. */
  desempenos: Partial<Record<"primaria" | "secundaria", Record<string, DesempenoCatalogo[]>>>;
};
export type AreaCatalogo = { area: string; nombre: string; prefijo: string; sinonimos: string[]; competencias: CompetenciaCatalogo[] };

export const CATALOGO_CNEB: readonly AreaCatalogo[] = [matematica as AreaCatalogo, comunicacion as AreaCatalogo];

export type NivelCneb = "primaria" | "secundaria";

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

/** «3.° de primaria» o «4 años» en inicial. */
export function textoGrado(nivel: Nivel, grado: number): string {
  return nivel === "inicial" ? `${grado} años` : `${grado}.° de ${ETIQUETA_NIVEL[nivel].toLowerCase()}`;
}

/** Minúsculas, sin tildes ni signos, espacios simples. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

/** Área del catálogo según el nombre del curso («Matemática», «Comunicación»…), o null. */
export function detectarArea(nombreCurso: string): AreaCatalogo | null {
  const n = normalizar(nombreCurso);
  return CATALOGO_CNEB.find((a) => a.sinonimos.some((s) => n === s || n.startsWith(`${s} `))) ?? null;
}

export function areaPorClave(area: string): AreaCatalogo | null {
  return CATALOGO_CNEB.find((a) => a.area === area) ?? null;
}

export type PlantillaCompetencia = {
  nombre: string;
  capacidades: string[];
  desempenos: { capacidad: string | null; descripcion: string; codigo: string }[];
};

/** Código estable de un desempeño del catálogo: MAT-C1-P3-02 (área, competencia, nivel+grado, número). */
export function codigoDesempeno(prefijo: string, competencia: number, nivel: NivelCneb, grado: number, numero: number): string {
  return `${prefijo}-C${competencia + 1}-${nivel === "primaria" ? "P" : "S"}${grado}-${String(numero + 1).padStart(2, "0")}`;
}

/** Competencias, capacidades y desempeños del catálogo para un nivel y grado. Error si no hay datos. */
export function plantillaCneb(area: AreaCatalogo, nivel: Nivel, grado: number): { ok: true; competencias: PlantillaCompetencia[] } | { ok: false; error: string } {
  if (nivel !== "primaria" && nivel !== "secundaria") return { ok: false, error: `El catálogo incluido aún no tiene desempeños de ${ETIQUETA_NIVEL[nivel].toLowerCase()}.` };
  if (!gradoValido(nivel, grado)) return { ok: false, error: "El grado del salón no es válido para su nivel." };
  const competencias = area.competencias.map((c, ci) => ({
    nombre: c.nombre,
    capacidades: c.capacidades,
    desempenos: (c.desempenos[nivel]?.[String(grado)] ?? []).map((d, di) => ({
      capacidad: d.capacidad === null ? null : (c.capacidades[d.capacidad] ?? null),
      descripcion: d.texto,
      codigo: codigoDesempeno(area.prefijo, ci, nivel, grado, di),
    })),
  }));
  if (competencias.every((c) => c.desempenos.length === 0)) return { ok: false, error: `El catálogo no tiene desempeños de ${area.nombre} para ${textoGrado(nivel, grado)}.` };
  return { ok: true, competencias };
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
 * Compara la plantilla con lo que ya tiene el curso y devuelve solo lo que falta: no duplica competencias
 * (por nombre), capacidades (por nombre dentro de la competencia) ni desempeños (por código o descripción).
 * Importar dos veces da un plan vacío.
 */
export function planearImportacion(plantilla: PlantillaCompetencia[], existentes: CompetenciaExistente[]): PlanImportacion {
  const resumen = { competencias: 0, capacidades: 0, desempenos: 0, omitidos: 0 };
  let ordenCompetencia = Math.max(-1, ...existentes.map((c) => c.orden)) + 1;
  const usadas = new Set<string>();
  const pasos: PasoImportacion[] = [];

  for (const p of plantilla) {
    const existente = existentes.find((e) => !usadas.has(e.id) && mismoNombre(e.nombre, p.nombre)) ?? null;
    if (existente) usadas.add(existente.id);
    else resumen.competencias += 1;

    const capacidadesExistentes: Record<string, string> = {};
    const capacidadesNuevas: PasoImportacion["capacidadesNuevas"] = [];
    let ordenCapacidad = Math.max(-1, ...(existente?.capacidades.map((c) => c.orden) ?? [])) + 1;
    for (const nombre of p.capacidades) {
      const ya = existente?.capacidades.find((c) => mismoNombre(c.nombre, nombre));
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
    for (const d of p.desempenos) {
      const ya = existente?.desempenos.some((x) => (x.codigo && x.codigo === d.codigo) || normalizar(x.descripcion) === normalizar(d.descripcion));
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
