import { describe, expect, it } from "vitest";
import { armarItem, tipoDeItem } from "@/lib/nudito/banco/items";
import { esquemaEjercicioConSolucion, esquemaRubrica, esquemaTemaClave } from "@/lib/nudito/contratos";
import { evaluar } from "@/lib/nudito/evaluadores";
import { ejercicioPara } from "@/lib/nudito/generadores/registro";
import { COLECCION_ESCRITURA_ID, COLECCION_LECTURAS_ID, itemsComunicacion } from "@/lib/nudito/lecturas/comunicacion";
import { CRITERIOS_ESCRITURA, rubricaEscritura } from "@/lib/nudito/rubricas/escritura";
import { temaPrueba } from "../fixtures/nudito/temas-prueba";

const items = itemsComunicacion();
const GRADOS = ["p1", "p2", "p3", "p4", "p5", "p6", "s1", "s2"];
/** Palabras máximas del texto de una lectura por grado. */
const MAX_PALABRAS: Record<string, number> = { p1: 60, p2: 90, p3: 120, p4: 150, p5: 190, p6: 210, s1: 260, s2: 290 };
const palabras = (t: string) => t.trim().split(/\s+/).length;

describe("lecturas y escritura de Comunicación", () => {
  it("cada ítem cumple el contrato, con fuente, revisión pendiente y clave com.<grado>.<slug>", () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const i of items) {
      expect(esquemaEjercicioConSolucion.safeParse(armarItem(COLECCION_LECTURAS_ID, i, 0)).success, i.id).toBe(true);
      expect(esquemaTemaClave.safeParse(i.temaClave).success).toBe(true);
      expect(i.temaClave.startsWith(`com.${i.nivel[0]}${i.grado}.`), i.id).toBe(true);
      expect(i.fuente.length).toBeGreaterThan(10);
      expect(i.revisadoPor).toBeNull();
    }
  });

  it("cubre primaria 1.°–6.° y secundaria 1.°–2.°: lecturas y consignas por grado", () => {
    for (const g of GRADOS) {
      const delGrado = items.filter((i) => `${i.nivel[0]}${i.grado}` === g);
      expect(delGrado.some((i) => tipoDeItem(i) === "lectura"), `${g} lectura`).toBe(true);
      expect(delGrado.some((i) => tipoDeItem(i) === "escritura_rubrica"), `${g} escritura`).toBe(true);
    }
  });

  it("lecturas: textos con longitud de su grado, preguntas literal/inferencial/crítica y respuestas que verifican", () => {
    const textos = new Set<string>();
    for (const i of items.filter((x) => tipoDeItem(x) === "lectura")) {
      const ej = armarItem(COLECCION_LECTURAS_ID, i, 0);
      if (ej.publico.tipo !== "lectura" || ej.solucion.tipo !== "lectura") throw new Error("tipo");
      const g = `${i.nivel[0]}${i.grado}`;
      expect(palabras(ej.publico.texto), i.id).toBeLessThanOrEqual(MAX_PALABRAS[g]);
      expect(textos.has(ej.publico.texto), `${i.id}: texto duplicado`).toBe(false);
      textos.add(ej.publico.texto);
      const tipos = new Set(ej.publico.preguntas.map((q) => q.tipo));
      for (const t of ["literal", "inferencial", "critica"] as const) expect(tipos.has(t), `${i.id} sin ${t}`).toBe(true);
      const respuestas = Object.fromEntries(
        Object.entries(ej.solucion.respuestas).map(([q, r]) => [q, typeof r === "string" ? r : r.aceptadas[0]]),
      );
      expect(evaluar(ej, { respuesta: { tipo: "lectura", respuestas } }).resultado, i.id).toBe("correcto");
    }
  });

  it("ítems cerrados (opción, texto corto, VF): la respuesta guardada verifica", () => {
    for (const i of items) {
      const ej = armarItem(COLECCION_LECTURAS_ID, i, 0);
      const s = ej.solucion;
      const r =
        s.tipo === "opcion_multiple" ? { tipo: "opcion" as const, opcionId: s.correcta }
        : s.tipo === "texto_corto" ? { tipo: "texto" as const, texto: s.aceptadas[0] }
        : s.tipo === "verdadero_falso" ? { tipo: "vf" as const, valores: s.valores }
        : null;
      if (r) expect(evaluar(ej, { respuesta: r }).resultado, i.id).toBe("correcto");
    }
  });

  it("escritura: rango de palabras creciente por grado, rúbrica formativa de 4 criterios y 4 niveles", () => {
    for (const i of items.filter((x) => tipoDeItem(x) === "escritura_rubrica")) {
      const ej = armarItem(COLECCION_ESCRITURA_ID, i, 0);
      if (ej.publico.tipo !== "escritura_rubrica" || ej.solucion.tipo !== "escritura_rubrica") throw new Error("tipo");
      expect(ej.publico.minPalabras).toBeLessThan(ej.publico.maxPalabras);
      expect(ej.publico.maxPalabras).toBeLessThanOrEqual(220);
      expect(ej.solucion.rubrica.criterios.map((c) => c.id)).toEqual([...CRITERIOS_ESCRITURA]);
      expect(ej.publico.criteriosVisibles).toHaveLength(4);
    }
    for (const nivel of ["primaria", "secundaria"] as const) {
      for (let g = 1; g <= 6; g++) expect(esquemaRubrica.safeParse(rubricaEscritura(nivel, g)).success).toBe(true);
    }
    expect(rubricaEscritura("primaria", 2).criterios[0].descripcion).not.toBe(rubricaEscritura("secundaria", 2).criterios[0].descripcion);
  });

  it("ejercicioPara usa la colección pedida y los tipos del tema; colección desconocida → error claro", () => {
    const l = items.find((x) => tipoDeItem(x) === "lectura")!;
    const tema = temaPrueba({ clave: l.temaClave, nivel: l.nivel, grado: l.grado, tipos: ["lectura"], fuente: { tipo: "lecturas", coleccionId: COLECCION_LECTURAS_ID } });
    const ej = ejercicioPara(tema, l.dificultad, 1);
    expect(ej.publico.tipo).toBe("lectura");
    expect(ej.publico.fuenteId).toMatch(/^com\.lecturas:/);
    expect(() => ejercicioPara({ ...tema, fuente: { tipo: "lecturas", coleccionId: "com.otra" } }, 1, 1)).toThrow(/no existe/);
  });
});
