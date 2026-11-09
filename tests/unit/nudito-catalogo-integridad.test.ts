// Integridad del catálogo global de Nudito (specs/42): esquema, claves, prerrequisitos, CNEB, fuentes y repasos.
import { describe, expect, it } from "vitest";
import { CATALOGO_CNEB, codigoDesempeno, type NivelCneb } from "@/lib/cneb/catalogo";
import { cicloDePrerrequisitos, clavesPorFuente, FUENTES_CONOCIDAS, fuenteConocida, idDeFuente, posicionTema, temaPorClave, temasDe, temasGlobales } from "@/lib/nudito/catalogo";
import { CLAVES_POR_FUENTE } from "@/lib/nudito/catalogo/claves";
import { AREAS_NUDITO, esquemaTema } from "@/lib/nudito/contratos";
import { normalizar } from "@/lib/cneb/catalogo";
import { TERMINOS_AVANZADOS } from "@/lib/nudito/validar-tema";

const temas = temasGlobales();
const PREFIJO: Record<string, string> = { matematica: "mat", comunicacion: "com", "ciencia-tecnologia": "cyt" };
/** Dominios que siembra prisma/seed-nudito-plus.ts en `sitios_permitidos` (la BD manda en producción). */
const DOMINIOS_PERMITIDOS = ["perueduca.pe", "khanacademy.org", "aprendoencasa.pe", "minedu.gob.pe"];

/** Todos los códigos de desempeño del CNEB del repo → { área, competencia, nivel, grado }. */
const desempenos = new Map<string, { area: string; competencia: number; nivel: NivelCneb; grado: number }>();
for (const a of CATALOGO_CNEB) {
  for (const c of a.competencias) {
    for (const [nivel, grados] of Object.entries(c.desempenos) as [NivelCneb, Record<string, string[]>][]) {
      for (const [grado, textos] of Object.entries(grados)) {
        textos.forEach((_, i) => desempenos.set(codigoDesempeno(a.prefijo, c.numero, nivel, Number(grado), i), { area: a.area, competencia: c.numero, nivel, grado: Number(grado) }));
      }
    }
  }
}

describe("catálogo global de Nudito", () => {
  it("carga y valida con esquemaTema", () => {
    expect(temas.length).toBeGreaterThanOrEqual(120);
    for (const t of temas) expect(esquemaTema.safeParse(t).success, t.clave).toBe(true);
  });

  it("cubre primaria 1.°–6.° y secundaria 1.°–2.° en las 3 áreas, con 5 a 8 temas por grado", () => {
    for (const area of AREAS_NUDITO) {
      for (const g of [1, 2, 3, 4, 5, 6]) expect(temasDe(area, "primaria", g).length, `${area} p${g}`).toBeGreaterThanOrEqual(5);
      for (const g of [1, 2]) expect(temasDe(area, "secundaria", g).length, `${area} s${g}`).toBeGreaterThanOrEqual(5);
      for (const t of temasDe(area, "primaria").concat(temasDe(area, "secundaria"))) expect(temasDe(area, t.nivel, t.grado).length).toBeLessThanOrEqual(8);
    }
  });

  it("claves únicas, con prefijo de área y el nivel y grado de la clave", () => {
    expect(new Set(temas.map((t) => t.clave)).size).toBe(temas.length);
    for (const t of temas) {
      expect(t.clave.startsWith(`${PREFIJO[t.area]}.${t.nivel === "primaria" ? "p" : "s"}${t.grado}.`), t.clave).toBe(true);
      expect(temaPorClave(t.clave)).toBe(t);
    }
  });

  it("nombres únicos por área (para que el alumno los distinga)", () => {
    for (const area of AREAS_NUDITO) {
      const nombres = temas.filter((t) => t.area === area).map((t) => normalizar(t.nombre));
      expect(new Set(nombres).size).toBe(nombres.length);
    }
  });

  it("prerrequisitos: existen, son de la misma área y de un grado igual o menor, sin ciclos", () => {
    for (const t of temas) {
      for (const p of t.prerrequisitos) {
        const pre = temaPorClave(p);
        expect(pre, `${t.clave} → ${p}`).not.toBeNull();
        expect(pre!.area).toBe(t.area);
        expect(posicionTema(pre!)).toBeLessThanOrEqual(posicionTema(t));
      }
    }
    expect(cicloDePrerrequisitos(temas)).toBeNull();
    expect(cicloDePrerrequisitos([{ clave: "a", prerrequisitos: ["b"] }, { clave: "b", prerrequisitos: ["a"] }])).toEqual(["a", "b", "a"]);
  });

  it("los códigos CNEB existen y concuerdan en área, competencia, nivel y grado", () => {
    for (const t of temas) {
      expect(t.desempenoCodigo, t.clave).toBeDefined();
      const d = desempenos.get(t.desempenoCodigo!);
      expect(d, `${t.clave}: ${t.desempenoCodigo}`).toBeDefined();
      expect(d).toEqual({ area: t.area, competencia: t.competenciaCneb, nivel: t.nivel, grado: t.grado });
    }
  });

  it("las fuentes usan los IDs acordados con specs/43 y coinciden con el área", () => {
    const tipoPorArea = { matematica: "generador", comunicacion: "lecturas", "ciencia-tecnologia": "banco" } as const;
    for (const t of temas) {
      expect(fuenteConocida(t.fuente), `${t.clave}: ${idDeFuente(t.fuente)}`).toBe(true);
      expect(t.fuente.tipo).toBe(tipoPorArea[t.area]);
    }
    for (const lista of Object.values(FUENTES_CONOCIDAS)) for (const id of lista) if (id !== "mat.banco") expect(clavesPorFuente(id).length, id).toBeGreaterThan(0);
  });

  it("claves.ts está sincronizado con los JSON (lo usa specs/43 para etiquetar ítems)", () => {
    const esperado = Object.fromEntries(
      [...new Set(temas.map((t) => idDeFuente(t.fuente)))].sort().map((id) => [id, clavesPorFuente(id)]),
    );
    expect(Object.fromEntries(Object.entries(CLAVES_POR_FUENTE).sort(([a], [b]) => a.localeCompare(b)))).toEqual(esperado);
  });

  it("repaso no vacío y breve; tipos coherentes con la fuente", () => {
    for (const t of temas) {
      expect(t.repaso.idea.length, t.clave).toBeGreaterThanOrEqual(30);
      expect(t.repaso.idea.length, t.clave).toBeLessThanOrEqual(400);
      expect(t.repaso.ejemplo.length, t.clave).toBeGreaterThanOrEqual(20);
      expect(t.repaso.ejemplo.length, t.clave).toBeLessThanOrEqual(400);
      expect((t.repaso.errorFrecuente ?? "").length).toBeLessThanOrEqual(300);
      if (t.fuente.tipo === "banco") expect(t.tipos.every((x) => ["opcion_multiple", "verdadero_falso", "relacionar"].includes(x))).toBe(true);
      if (t.fuente.tipo === "lecturas" && t.fuente.coleccionId === "com.lecturas") expect(t.tipos).toContain("lectura");
      if (t.tipos.includes("fraccion")) expect(idDeFuente(t.fuente)).toBe("mat.fracciones");
    }
  });

  it("borrador honesto: origen CNEB, versión 1, sin revisión docente y recursos solo de sitios permitidos", () => {
    for (const t of temas) {
      expect(t.origen).toBe("cneb");
      expect(t.revisado).toBeNull();
      for (const r of t.recursos) {
        const host = new URL(r.url).hostname.replace(/^www\./, "");
        expect(DOMINIOS_PERMITIDOS.some((d) => host === d || host.endsWith(`.${d}`)), r.url).toBe(true);
      }
    }
  });

  it("los términos avanzados no aparecen en el catálogo por debajo del grado desde el que se consideran «de su grado»", () => {
    for (const termino of TERMINOS_AVANZADOS) {
      for (const t of temas.filter((x) => x.area === termino.area && posicionTema(x) < termino.desde)) {
        const frases = [...t.palabrasClave, ...(t.sinonimos ?? []), t.nombre].map(normalizar);
        for (const f of termino.frases) expect(frases.some((x) => ` ${x} `.includes(` ${f} `)), `${t.clave} contiene «${f}»`).toBe(false);
      }
    }
  });
});
