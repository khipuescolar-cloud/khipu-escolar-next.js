import { describe, expect, it } from "vitest";
import {
  CATALOGO_CNEB, codigoDesempeno, detectarArea, gradoValido, mensajeImportacion, mismoNombre, planearImportacion, plantillaCneb, reordenar,
  type CompetenciaExistente,
} from "@/lib/cneb/catalogo";

const GRADOS = { primaria: [1, 2, 3, 4, 5, 6], secundaria: [1, 2, 3, 4, 5] } as const;
const mate = CATALOGO_CNEB.find((a) => a.area === "matematica")!;
const comu = CATALOGO_CNEB.find((a) => a.area === "comunicacion")!;

describe("catálogo CNEB: integridad", () => {
  it("trae Matemática y Comunicación con sus competencias oficiales", () => {
    expect(mate.competencias.map((c) => c.nombre)).toEqual([
      "Resuelve problemas de cantidad",
      "Resuelve problemas de regularidad, equivalencia y cambio",
      "Resuelve problemas de forma, movimiento y localización",
      "Resuelve problemas de gestión de datos e incertidumbre",
    ]);
    expect(comu.competencias.map((c) => c.nombre)).toEqual([
      "Se comunica oralmente en su lengua materna",
      "Lee diversos tipos de textos escritos en su lengua materna",
      "Escribe diversos tipos de textos en su lengua materna",
    ]);
    expect(comu.competencias[0].capacidades).toHaveLength(6);
    expect(comu.competencias[1].capacidades).toHaveLength(3);
    for (const c of mate.competencias) expect(c.capacidades).toHaveLength(4);
  });

  it("cada competencia tiene desempeños en todos los grados de primaria y secundaria, con capacidad válida y sin repetir", () => {
    for (const area of CATALOGO_CNEB) {
      expect(new Set(CATALOGO_CNEB.map((a) => a.prefijo)).size).toBe(CATALOGO_CNEB.length);
      for (const c of area.competencias) {
        expect(new Set(c.capacidades.map((x) => x.toLowerCase())).size).toBe(c.capacidades.length);
        for (const nivel of ["primaria", "secundaria"] as const) {
          expect(Object.keys(c.desempenos[nivel] ?? {}).map(Number).sort()).toEqual([...GRADOS[nivel]]);
          for (const grado of GRADOS[nivel]) {
            const lista = c.desempenos[nivel]![String(grado)];
            expect(lista.length, `${c.nombre} ${nivel} ${grado}`).toBeGreaterThanOrEqual(2);
            expect(new Set(lista.map((d) => d.texto)).size).toBe(lista.length);
            for (const d of lista) {
              expect(d.texto.length).toBeGreaterThan(30);
              expect(d.texto.length).toBeLessThanOrEqual(1000);
              expect(d.capacidad === null || (d.capacidad >= 0 && d.capacidad < c.capacidades.length)).toBe(true);
            }
          }
        }
      }
    }
  });

  it("detecta el área por el nombre del curso", () => {
    expect(detectarArea("Matemática")?.area).toBe("matematica");
    expect(detectarArea("MATEMÁTICAS")?.area).toBe("matematica");
    expect(detectarArea("Comunicación")?.area).toBe("comunicacion");
    expect(detectarArea("Ciencia y Tecnología")).toBeNull();
    expect(detectarArea("Álgebra")).toBeNull();
  });

  it("valida grados por nivel", () => {
    expect(gradoValido("primaria", 6)).toBe(true);
    expect(gradoValido("secundaria", 6)).toBe(false);
    expect(gradoValido("primaria", null)).toBe(false);
    expect(gradoValido("academia", 1)).toBe(false);
  });

  it("arma la plantilla de un grado con códigos estables y capacidades por nombre", () => {
    const p = plantillaCneb(mate, "primaria", 3);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.competencias).toHaveLength(4);
    expect(p.competencias[0].desempenos[0].codigo).toBe("MAT-C1-P3-01");
    expect(p.competencias[0].desempenos[0].capacidad).toBe("Traduce cantidades a expresiones numéricas");
    expect(codigoDesempeno("COM", 1, "secundaria", 5, 9)).toBe("COM-C2-S5-10");
    expect(plantillaCneb(mate, "inicial", 4).ok).toBe(false);
    expect(plantillaCneb(mate, "secundaria", 6).ok).toBe(false);
  });
});

describe("plan de importación (idempotente)", () => {
  const plantilla = (() => {
    const p = plantillaCneb(comu, "primaria", 3);
    if (!p.ok) throw new Error(p.error);
    return p.competencias;
  })();

  it("en un curso vacío crea todo", () => {
    const plan = planearImportacion(plantilla, []);
    const capacidades = plantilla.reduce((n, c) => n + c.capacidades.length, 0);
    const desempenos = plantilla.reduce((n, c) => n + c.desempenos.length, 0);
    expect(plan.resumen).toEqual({ competencias: 3, capacidades, desempenos, omitidos: 0 });
    expect(plan.pasos.map((p) => p.orden)).toEqual([0, 1, 2]);
    expect(mensajeImportacion(plan.resumen)).toBe(`Importamos 3 competencias, ${capacidades} capacidades y ${desempenos} desempeños del CNEB.`);
  });

  it("reconoce competencias con nombre abreviado y solo agrega lo que falta", () => {
    const existentes: CompetenciaExistente[] = [
      { id: "c-lee", nombre: "Lee diversos tipos de textos escritos", orden: 4, capacidades: [{ id: "cap-1", nombre: "obtiene informacion del texto escrito", orden: 0 }], desempenos: [{ codigo: null, descripcion: plantilla[1].desempenos[0].descripcion.toUpperCase(), orden: 0 }] },
    ];
    const plan = planearImportacion(plantilla, existentes);
    const paso = plan.pasos.find((p) => p.competenciaId === "c-lee")!;
    expect(paso.capacidadesExistentes).toEqual({ "Obtiene información del texto escrito": "cap-1" });
    expect(paso.capacidadesNuevas.map((c) => c.orden)).toEqual([1, 2]);
    expect(paso.desempenosNuevos).toHaveLength(plantilla[1].desempenos.length - 1);
    expect(paso.desempenosNuevos[0].orden).toBe(1);
    // Las competencias nuevas van después de la existente (orden 4).
    expect(plan.pasos.filter((p) => p.competenciaId === null).map((p) => p.orden)).toEqual([5, 6]);
    expect(plan.resumen.competencias).toBe(2);
  });

  it("importar dos veces no agrega nada", () => {
    const primera = planearImportacion(plantilla, []);
    const simulado: CompetenciaExistente[] = primera.pasos.map((p, i) => ({
      id: `c${i}`, nombre: p.nombre, orden: p.orden,
      capacidades: p.capacidadesNuevas.map((c, j) => ({ id: `c${i}-${j}`, nombre: c.nombre, orden: c.orden })),
      desempenos: p.desempenosNuevos.map((d) => ({ codigo: d.codigo, descripcion: d.descripcion, orden: d.orden })),
    }));
    const segunda = planearImportacion(plantilla, simulado);
    expect(segunda.pasos).toEqual([]);
    expect(segunda.resumen.competencias + segunda.resumen.capacidades + segunda.resumen.desempenos).toBe(0);
    expect(mensajeImportacion(segunda.resumen)).toBe("Ya estaba todo importado. No se agregó nada.");
  });

  it("compara nombres sin tildes ni mayúsculas y por prefijo largo", () => {
    expect(mismoNombre("Resuelve problemas de cantidad", "RESUELVE PROBLEMAS DE CANTIDAD.")).toBe(true);
    expect(mismoNombre("Escribe diversos tipos de textos", "Escribe diversos tipos de textos en su lengua materna")).toBe(true);
    expect(mismoNombre("Lee", "Lee diversos tipos de textos")).toBe(false);
  });
});

describe("reordenar", () => {
  const lista = [{ id: "a" }, { id: "b" }, { id: "c" }];
  it("sube, baja y respeta los bordes", () => {
    expect(reordenar(lista, "b", "arriba")).toEqual(["b", "a", "c"]);
    expect(reordenar(lista, "b", "abajo")).toEqual(["a", "c", "b"]);
    expect(reordenar(lista, "a", "arriba")).toEqual(["a", "b", "c"]);
    expect(reordenar(lista, "x", "abajo")).toEqual(["a", "b", "c"]);
  });
});
