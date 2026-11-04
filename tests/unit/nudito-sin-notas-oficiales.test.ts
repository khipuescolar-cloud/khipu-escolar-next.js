import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Arquitectura (specs/41, specs/44): Nudito es práctica formativa. Nada en su código importa los módulos de notas,
// libretas, NSP ni eventos académicos, ni escribe en sus tablas. El dominio de Nudito nunca cambia una calificación.

const RAIZ = path.resolve(__dirname, "../..");
const CARPETAS = ["src/lib/server/nudito", "src/lib/nudito"];

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = path.join(dir, n);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(ts|tsx)$/.test(n) ? [ruta] : [];
  });
}

const fuentes = CARPETAS.flatMap((c) => archivos(path.join(RAIZ, c))).map((ruta) => ({ ruta: path.relative(RAIZ, ruta), texto: readFileSync(ruta, "utf8") }));

/** Módulos prohibidos (por el último segmento de la ruta importada). */
const MODULO_PROHIBIDO = /(^|\/)(notas|notas-[\w-]+|libreta[\w-]*|nsp[\w-]*|eventos-academicos|calificaciones|integridad-notas|libreta-publicacion)(\.tsx?)?$/;

/** Delegados de Prisma de las tablas oficiales de evaluación. */
const DELEGADOS_PROHIBIDOS = [
  "nota", "historialNota", "calificacionPeriodo", "evaluacion", "evaluacionDesempeno", "criterioEvaluacion", "competencia",
  "cierreCurso", "libretaEmitida", "rectificacionLibreta", "eventoAcademico",
];

describe("Nudito no toca notas oficiales", () => {
  it("encuentra el código de Nudito", () => {
    expect(fuentes.length).toBeGreaterThan(5);
  });

  it("no importa notas, libretas, NSP ni eventos académicos", () => {
    const malos: string[] = [];
    for (const f of fuentes) {
      for (const m of f.texto.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g)) {
        if (MODULO_PROHIBIDO.test(m[1])) malos.push(`${f.ruta} → ${m[1]}`);
      }
    }
    expect(malos).toEqual([]);
  });

  it("no usa las tablas de evaluación oficial (ni lectura ni escritura)", () => {
    const malos: string[] = [];
    const re = new RegExp(`\\.(${DELEGADOS_PROHIBIDOS.join("|")})\\s*\\.\\s*(find\\w*|create\\w*|update\\w*|upsert|delete\\w*|count|aggregate|groupBy)\\b`, "g");
    for (const f of fuentes) for (const m of f.texto.matchAll(re)) malos.push(`${f.ruta}: ${m[0]}`);
    expect(malos).toEqual([]);
    // Tampoco SQL crudo contra esas tablas.
    for (const f of fuentes) expect(f.texto).not.toMatch(/\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+"?(notas|calificaciones_periodo|libretas_emitidas|eventos_academicos)/i);
  });
});
