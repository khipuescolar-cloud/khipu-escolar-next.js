import { describe, expect, it } from "vitest";
import {
  CATALOGO_CNEB, GRADOS_POR_NIVEL, areasDelNivel, codigoDesempeno, detectarArea, gradoValido, mensajeImportacion, mismoNombre, planearImportacion,
  plantillaCneb, reordenar, type CompetenciaExistente, type NivelCneb,
} from "@/lib/cneb/catalogo";

const area = (clave: string) => CATALOGO_CNEB.find((a) => a.area === clave)!;
const mate = area("matematica");
const comu = area("comunicacion");

/** Número de capacidades de cada competencia según el CNEB (tabla de la sección 3.1, RM 281-2016-MINEDU). */
const CAPACIDADES_CNEB: Record<number, number> = {
  1: 4, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3, 7: 6, 8: 3, 9: 4, 10: 6, 11: 3, 12: 4, 13: 6, 14: 3, 15: 4, 16: 5,
  17: 3, 18: 3, 19: 2, 20: 5, 21: 2, 22: 4, 23: 4, 24: 4, 25: 4, 26: 4, 27: 4, 28: 4, 29: 3, 30: 2, 31: 2,
};

const todas = CATALOGO_CNEB.flatMap((a) => a.competencias.map((c) => ({ area: a, c })));

describe("catálogo CNEB: integridad", () => {
  it("cubre las 31 competencias con su número oficial y el mismo nombre en todas las áreas", () => {
    const porNumero = new Map<number, string>();
    for (const { c } of todas) {
      expect(c.numero).toBeGreaterThanOrEqual(1);
      expect(c.numero).toBeLessThanOrEqual(31);
      const previo = porNumero.get(c.numero);
      if (previo) expect(c.nombre, `competencia ${c.numero}`).toBe(previo);
      porNumero.set(c.numero, c.nombre);
    }
    expect([...porNumero.keys()].sort((a, b) => a - b)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(new Set(porNumero.values()).size).toBe(31);
  });

  it("no repite áreas, prefijos ni competencias dentro de un área", () => {
    expect(new Set(CATALOGO_CNEB.map((a) => a.area)).size).toBe(CATALOGO_CNEB.length);
    expect(new Set(CATALOGO_CNEB.map((a) => a.prefijo)).size).toBe(CATALOGO_CNEB.length);
    for (const a of CATALOGO_CNEB) {
      expect(new Set(a.competencias.map((c) => c.numero)).size, a.nombre).toBe(a.competencias.length);
      expect(a.fuentes.length, a.nombre).toBeGreaterThan(0);
      for (const f of a.fuentes) expect(f.url).toMatch(/^https?:\/\/(www\.)?minedu\.gob\.pe\//);
      for (const c of a.competencias) for (const n of c.niveles) expect(a.niveles).toContain(n);
    }
  });

  it("las áreas de cada nivel son las del CNEB", () => {
    const nombres = (n: NivelCneb) => areasDelNivel(n).map((a) => a.area).sort();
    expect(nombres("inicial")).toEqual(["castellano-segunda-lengua", "ciencia-tecnologia", "comunicacion", "matematica", "personal-social", "psicomotriz", "tic", "transversales"]);
    expect(nombres("primaria")).toEqual([
      "arte-cultura", "castellano-segunda-lengua", "ciencia-tecnologia", "comunicacion", "educacion-fisica", "educacion-religiosa", "ingles", "matematica",
      "personal-social", "tic", "transversales",
    ]);
    expect(nombres("secundaria")).toEqual([
      "arte-cultura", "castellano-segunda-lengua", "ciencia-tecnologia", "ciencias-sociales", "comunicacion", "dpcc", "educacion-fisica", "educacion-religiosa",
      "ept", "ingles", "matematica", "tic", "transversales",
    ]);
    expect(area("dpcc").competencias.map((c) => c.numero)).toEqual([1, 16]);
    expect(area("ciencias-sociales").competencias.map((c) => c.numero)).toEqual([17, 18, 19]);
    expect(area("personal-social").competencias.filter((c) => c.niveles.includes("primaria")).map((c) => c.numero)).toEqual([1, 16, 17, 18, 19]);
  });

  it("cada competencia trae sus capacidades oficiales en cada nivel, sin repetir", () => {
    for (const { area: a, c } of todas) {
      for (const nivel of c.niveles) {
        const caps = c.capacidades[nivel] ?? [];
        expect(new Set(caps.map((x) => x.toLowerCase())).size, `${c.nombre} ${nivel}`).toBe(caps.length);
        // Inicial a veces lista menos capacidades que el CNEB (p. ej. «Construye su identidad»: 2 de 4).
        if (nivel === "inicial") expect(caps.length, `${a.nombre} ${c.numero} ${nivel}`).toBeGreaterThan(0);
        else if (caps.length > 0) expect(caps.length, `${a.nombre} ${c.numero} ${nivel}`).toBe(CAPACIDADES_CNEB[c.numero]);
        for (const x of caps) expect(x.length).toBeGreaterThan(5);
      }
    }
    expect(mate.competencias[0].capacidades.primaria).toEqual([
      "Traduce cantidades a expresiones numéricas", "Comunica su comprensión sobre los números y las operaciones",
      "Usa estrategias y procedimientos de estimación y cálculo", "Argumenta afirmaciones sobre las relaciones numéricas y las operaciones",
    ]);
  });

  it("los desempeños son de grados válidos, sin repetir y sin restos del PDF", () => {
    for (const { area: a, c } of todas) {
      for (const [nivel, porGrado] of Object.entries(c.desempenos) as [NivelCneb, Record<string, string[]>][]) {
        expect(c.niveles).toContain(nivel);
        for (const [grado, lista] of Object.entries(porGrado)) {
          const donde = `${a.nombre} C${c.numero} ${nivel} ${grado}`;
          expect(gradoValido(nivel, Number(grado)), donde).toBe(true);
          expect(lista.length, donde).toBeGreaterThan(0);
          expect(new Set(lista).size, donde).toBe(lista.length);
          for (const t of lista) {
            expect(t.length, donde).toBeGreaterThan(20);
            expect(t.length, donde).toBeLessThanOrEqual(2000);
            expect(t, donde).toBe(t.normalize("NFC"));
            expect(t, donde).toBe(t.trim());
            expect(t, donde).not.toMatch(/Ministerio de Educación|Currículo Nacional|Programa curricular|DESEMPEÑOS|\s{2,}/);
            expect(t, donde).toMatch(/^[A-ZÁÉÍÓÚÑ«“(¿]/);
          }
        }
      }
    }
  });

  const huecos = (nivel: NivelCneb) => {
    const sin: string[] = [];
    for (const a of areasDelNivel(nivel)) {
      for (const c of a.competencias.filter((x) => x.niveles.includes(nivel))) {
        if (!(c.capacidades[nivel]?.length)) sin.push(`C${c.numero}-capacidades`);
        for (const g of GRADOS_POR_NIVEL[nivel]) if (!c.desempenos[nivel]?.[String(g)]?.length) sin.push(`C${c.numero}-${g}`);
      }
    }
    return [...new Set(sin)].sort();
  };

  it("cada nivel trae capacidades y desempeños oficiales de todas sus competencias y grados (salvo lo que el programa no define)", () => {
    // Inglés lee y escribe empiezan en 3.° (ciclo IV), según el programa.
    expect(huecos("primaria")).toEqual(["C14-1", "C14-2", "C15-1", "C15-2"]);
    expect(huecos("secundaria")).toEqual([]);
    // Inicial: «Escribe…» no tiene desempeños a los 3 años; Castellano L2, TIC y «Gestiona su aprendizaje» solo a los 5.
    expect(huecos("inicial")).toEqual(["C10-3", "C10-4", "C28-3", "C28-4", "C29-3", "C29-4", "C9-3"]);
    expect(mate.competencias[0].desempenos.primaria?.["1"]?.[0]).toMatch(/^Establece relaciones entre datos y acciones de agregar, quitar y juntar cantidades/);
  });

  it("detecta el área por el nombre del curso, con alias y según el nivel", () => {
    expect(detectarArea("Matemática")?.area).toBe("matematica");
    expect(detectarArea("MATEMÁTICAS")?.area).toBe("matematica");
    expect(detectarArea("Comunicación")?.area).toBe("comunicacion");
    expect(detectarArea("Ciencia y Tecnología")?.area).toBe("ciencia-tecnologia");
    expect(detectarArea("Ciencia y Ambiente")?.area).toBe("ciencia-tecnologia");
    expect(detectarArea("CTA")?.area).toBe("ciencia-tecnologia");
    expect(detectarArea("DPCC")?.area).toBe("dpcc");
    expect(detectarArea("Desarrollo Personal, Ciudadanía y Cívica")?.area).toBe("dpcc");
    expect(detectarArea("CCSS")?.area).toBe("ciencias-sociales");
    expect(detectarArea("Historia, Geografía y Economía")?.area).toBe("ciencias-sociales");
    expect(detectarArea("EPT")?.area).toBe("ept");
    expect(detectarArea("Religión")?.area).toBe("educacion-religiosa");
    expect(detectarArea("Educación Religiosa")?.area).toBe("educacion-religiosa");
    expect(detectarArea("Psicomotriz")?.area).toBe("psicomotriz");
    expect(detectarArea("Inglés")?.area).toBe("ingles");
    expect(detectarArea("Arte y Cultura")?.area).toBe("arte-cultura");
    expect(detectarArea("Computación")?.area).toBe("tic");
    expect(detectarArea("Personal Social")?.area).toBe("personal-social");
    // El sinónimo más largo gana: no es «Comunicación» por empezar con «castellano».
    expect(detectarArea("Castellano como segunda lengua")?.area).toBe("castellano-segunda-lengua");
    expect(detectarArea("Castellano")?.area).toBe("comunicacion");
    // Educación Física: en inicial es Psicomotriz.
    expect(detectarArea("Educación Física", "primaria")?.area).toBe("educacion-fisica");
    expect(detectarArea("Educación Física", "inicial")?.area).toBe("psicomotriz");
    expect(detectarArea("Álgebra y Trigonometría")?.area).toBe("matematica");
    expect(detectarArea("Tutoría")).toBeNull();
    expect(detectarArea("")).toBeNull();
  });

  it("valida grados por nivel", () => {
    expect(gradoValido("primaria", 6)).toBe(true);
    expect(gradoValido("secundaria", 6)).toBe(false);
    expect(gradoValido("primaria", null)).toBe(false);
    expect(gradoValido("academia", 1)).toBe(false);
    expect(gradoValido("inicial", 4)).toBe(true);
  });

  it("arma la plantilla de un grado con códigos estables por número de competencia", () => {
    const p = plantillaCneb(mate, "primaria", 3);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.competencias).toHaveLength(4);
    expect(p.competencias[0].desempenos[0].codigo).toBe("MAT-C23-P3-01");
    expect(p.competencias[2].nombre).toBe("Resuelve problemas de forma, movimiento y localización");
    expect(p.competencias[2].desempenos[0].codigo).toBe("MAT-C26-P3-01");
    expect(p.competencias[0].capacidades).toHaveLength(4);
    expect(p.sinDesempenos).toEqual([]);
    expect(codigoDesempeno("COM", 8, "secundaria", 5, 9)).toBe("COM-C8-S5-10");
    expect(codigoDesempeno("PS", 1, "inicial", 4, 0)).toBe("PS-C1-I4-01");
    expect(plantillaCneb(mate, "secundaria", 6).ok).toBe(false);
    expect(plantillaCneb(mate, "academia", 1).ok).toBe(false);
  });

  it("inicial: plantilla por edad con las competencias y capacidades del programa de inicial", () => {
    const p = plantillaCneb(mate, "inicial", 4);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.competencias.map((c) => c.nombre)).toEqual(["Resuelve problemas de cantidad", "Resuelve problemas de forma, movimiento y localización"]);
    expect(p.competencias[0].capacidades).toHaveLength(3);
    expect(p.competencias[0].desempenos[0].codigo).toBe("MAT-C23-I4-01");
    const ps = plantillaCneb(area("personal-social"), "inicial", 3);
    expect(ps.ok && ps.competencias.map((c) => c.nombre.slice(0, 22))).toEqual(["Construye su identidad", "Convive y participa de", "Construye su identidad"]);
    // «Escribe…» no tiene desempeños a los 3 años: el programa dice «No se evidencian desempeños en esta edad».
    const com3 = plantillaCneb(comu, "inicial", 3);
    expect(com3.ok && com3.sinDesempenos).toEqual(["Escribe diversos tipos de textos en su lengua materna"]);
    // Un área que no es del nivel.
    const dpcc = plantillaCneb(area("dpcc"), "primaria", 3);
    expect(dpcc.ok).toBe(false);
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

  it("empareja «Construye su identidad» y la competencia 30 sin confundirlas", () => {
    const ps = plantillaCneb(area("personal-social"), "inicial", 5);
    if (!ps.ok) throw new Error(ps.error);
    // El curso ya tenía la 30 con el nombre abreviado del seed y nada más.
    const existentes: CompetenciaExistente[] = [
      { id: "c30", nombre: "Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente", orden: 0, capacidades: [], desempenos: [] },
    ];
    const plan = planearImportacion(ps.competencias, existentes);
    expect(plan.pasos.find((p) => p.competenciaId === "c30")?.nombre).toMatch(/^Construye su identidad como persona humana/);
    expect(plan.pasos.filter((p) => p.competenciaId === null).map((p) => p.nombre.slice(0, 22))).toEqual(["Construye su identidad", "Convive y participa de"]);
    expect(plan.resumen.competencias).toBe(2);
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
