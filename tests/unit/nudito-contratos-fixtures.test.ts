import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGO_CNEB, codigoDesempeno, type NivelCneb } from "@/lib/cneb/catalogo";
import {
  AREAS_NUDITO,
  esquemaConfigNudito,
  esquemaEjercicioConSolucion,
  esquemaEnvioRespuesta,
  esquemaTema,
  RESPUESTA_DE_TIPO,
  TIPOS_EJERCICIO,
} from "@/lib/nudito/contratos";
import { evaluarDominio, POLITICA_DOMINIO_POR_DEFECTO } from "@/lib/nudito/politica-dominio";
import { CASOS_FIXTURE, OPCION_MULTIPLE_FRACCIONES, RELACIONAR_CELULA } from "../fixtures/nudito/ejercicios";
import { TEMAS_FIXTURE } from "../fixtures/nudito/temas";

// Paso 0 de Nudito (specs/41): los fixtures cumplen los contratos y los esquemas rechazan lo incoherente.

const PREFIJO_AREA: Record<string, string> = { matematica: "MAT", comunicacion: "COM", "ciencia-tecnologia": "CYT" };

function codigosCneb(): Set<string> {
  const codigos = new Set<string>();
  for (const area of CATALOGO_CNEB) {
    for (const c of area.competencias) {
      for (const [nivel, porGrado] of Object.entries(c.desempenos)) {
        for (const [grado, lista] of Object.entries(porGrado ?? {})) {
          lista.forEach((_, i) => codigos.add(codigoDesempeno(area.prefijo, c.numero, nivel as NivelCneb, Number(grado), i)));
        }
      }
    }
  }
  return codigos;
}

describe("fixtures de temas de Nudito", () => {
  const temas = new Map(TEMAS_FIXTURE.map((t) => [t.clave, t]));

  it("cumplen esquemaTema y tienen claves únicas", () => {
    for (const t of TEMAS_FIXTURE) expect(esquemaTema.safeParse(t).error?.issues ?? []).toEqual([]);
    expect(temas.size).toBe(TEMAS_FIXTURE.length);
  });

  it("hay 2 temas por cada área de la primera versión", () => {
    for (const area of AREAS_NUDITO) expect(TEMAS_FIXTURE.filter((t) => t.area === area)).toHaveLength(2);
  });

  it("cada desempeño existe en el catálogo CNEB y es de su área, competencia, nivel y grado", () => {
    const codigos = codigosCneb();
    for (const t of TEMAS_FIXTURE) {
      if (!t.desempenoCodigo) continue;
      expect(codigos.has(t.desempenoCodigo), t.desempenoCodigo).toBe(true);
      const nivel = t.nivel === "primaria" ? "P" : "S";
      expect(t.desempenoCodigo.startsWith(`${PREFIJO_AREA[t.area]}-C${t.competenciaCneb}-${nivel}${t.grado}-`)).toBe(true);
    }
  });

  it("los prerrequisitos apuntan a temas existentes", () => {
    for (const t of TEMAS_FIXTURE) for (const p of t.prerrequisitos) expect(temas.has(p)).toBe(true);
  });
});

describe("fixtures de ejercicios de Nudito", () => {
  const temas = new Map(TEMAS_FIXTURE.map((t) => [t.clave, t]));

  it("cumplen esquemaEjercicioConSolucion y son coherentes con su tema", () => {
    for (const { ejercicio } of CASOS_FIXTURE) {
      expect(esquemaEjercicioConSolucion.safeParse(ejercicio).error?.issues ?? []).toEqual([]);
      const tema = temas.get(ejercicio.publico.temaClave);
      expect(tema, ejercicio.publico.temaClave).toBeDefined();
      expect(tema!.tipos).toContain(ejercicio.publico.tipo);
      expect(ejercicio.publico.dificultad).toBeGreaterThanOrEqual(tema!.dificultad.min);
      expect(ejercicio.publico.dificultad).toBeLessThanOrEqual(tema!.dificultad.max);
    }
  });

  it("cubren los 8 tipos de ejercicio", () => {
    expect(new Set(CASOS_FIXTURE.map((c) => c.ejercicio.publico.tipo))).toEqual(new Set(TIPOS_EJERCICIO));
  });

  it("las respuestas de ejemplo cumplen esquemaEnvioRespuesta y son del tipo que espera el ejercicio", () => {
    for (const caso of CASOS_FIXTURE) {
      for (const envio of [caso.correcta, caso.incorrecta]) {
        expect(esquemaEnvioRespuesta.safeParse(envio).success).toBe(true);
        expect(envio.respuesta.tipo).toBe(RESPUESTA_DE_TIPO[caso.ejercicio.publico.tipo]);
      }
    }
  });

  it("el esquema rechaza una solución de otro tipo o con ids que no existen", () => {
    const { ejercicio } = OPCION_MULTIPLE_FRACCIONES;
    expect(esquemaEjercicioConSolucion.safeParse({ ...ejercicio, solucion: { tipo: "numerico", valor: 1, tolerancia: 0 } }).success).toBe(false);
    expect(esquemaEjercicioConSolucion.safeParse({ ...ejercicio, solucion: { ...ejercicio.solucion, correcta: "z" } }).success).toBe(false);
    const rel = RELACIONAR_CELULA.ejercicio;
    expect(esquemaEjercicioConSolucion.safeParse({ ...rel, solucion: { tipo: "relacionar", pares: { nucleo: "f1" } } }).success).toBe(false);
  });
});

describe("contratos de Nudito", () => {
  it("la política de dominio por defecto es válida y la configuración la acepta parcial", () => {
    expect(POLITICA_DOMINIO_POR_DEFECTO.version).toBe("v1");
    const config = {
      activo: false, areas: [...AREAS_NUDITO], niveles: ["primaria", "secundaria"], gradoMinimoPrimaria: 1, permitirModoHijo: true,
      permitirFotos: false, minutosPorDia: null, sesionesPorDia: 6, topeCostoUsdMes: null, retencionDias: 180,
      horaDesde: null, horaHasta: null, politicaDominio: { minSesionesDistintas: 3 },
    };
    expect(esquemaConfigNudito.safeParse(config).success).toBe(true);
    expect(esquemaConfigNudito.safeParse({ ...config, retencionDias: 5 }).success).toBe(false);
  });

  it("los esqueletos del paso 0 lanzan «pendiente»", () => {
    expect(() => evaluarDominio(
      { estado: "no_iniciado", dificultad: 1, evidencia: [], sesionesDistintas: 0, politicaVersion: "v1" },
      { resultado: "correcto", dificultad: 1, pistas: 0, sesionId: "s", comprobacion: false, at: "2026-11-14T12:00:00Z" },
      POLITICA_DOMINIO_POR_DEFECTO,
    )).toThrow("pendiente");
  });

  it("contratos.ts es puro: sin Prisma, BD ni server-only", () => {
    const fuente = readFileSync(path.resolve(import.meta.dirname, "../../src/lib/nudito/contratos.ts"), "utf8");
    const imports = [...fuente.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
    expect(imports).toEqual(["zod"]);
  });
});
