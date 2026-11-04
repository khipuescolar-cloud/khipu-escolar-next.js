import { describe, expect, it } from "vitest";
import { BANCO_CIENCIA_ID, itemsCiencia, seleccionarItemCiencia } from "@/lib/nudito/banco/ciencia";
import { armarItem, tipoDeItem } from "@/lib/nudito/banco/items";
import { esquemaEjercicioConSolucion, esquemaTemaClave } from "@/lib/nudito/contratos";
import { evaluar } from "@/lib/nudito/evaluadores";
import { ejercicioPara } from "@/lib/nudito/generadores/registro";
import { temaPrueba } from "../fixtures/nudito/temas-prueba";

const items = itemsCiencia();
const GRADOS = ["p1", "p2", "p3", "p4", "p5", "p6", "s1", "s2"];

describe("banco de Ciencia y Tecnología (cyt.banco)", () => {
  it("cada ítem cumple el contrato, tiene fuente, revisión pendiente y clave cyt.<grado>.<slug> coherente", () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const i of items) {
      expect(esquemaEjercicioConSolucion.safeParse(armarItem(BANCO_CIENCIA_ID, i, 0)).success, i.id).toBe(true);
      expect(esquemaTemaClave.safeParse(i.temaClave).success).toBe(true);
      expect(i.temaClave.startsWith(`cyt.${i.nivel[0]}${i.grado}.`), i.id).toBe(true);
      expect(i.fuente).toMatch(/CNEB/);
      expect(i.revisadoPor).toBeNull();
      expect(["opcion_multiple", "verdadero_falso", "relacionar"]).toContain(tipoDeItem(i));
    }
  });

  it("cubre primaria 1.°–6.° y secundaria 1.°–2.° con al menos 4 ítems por grado", () => {
    for (const g of GRADOS) expect(items.filter((i) => `${i.nivel[0]}${i.grado}` === g).length, g).toBeGreaterThanOrEqual(4);
  });

  it("respuestas presentes: distractores con código, VF con justificación, relacionar completo, sin enunciados duplicados", () => {
    const enunciados = new Set<string>();
    for (const i of items) {
      const ej = armarItem(BANCO_CIENCIA_ID, i, 0);
      const clave = `${ej.publico.enunciado}|${JSON.stringify(ej.publico)}`;
      expect(enunciados.has(clave), i.id).toBe(false);
      enunciados.add(clave);
      if (ej.publico.tipo === "opcion_multiple" && ej.solucion.tipo === "opcion_multiple") {
        expect(Object.keys(ej.solucion.distractores).length, i.id).toBe(ej.publico.opciones.length - 1);
      }
      if (ej.publico.tipo === "verdadero_falso" && ej.solucion.tipo === "verdadero_falso") {
        for (const a of ej.publico.afirmaciones) expect(ej.solucion.justificacion?.[a.id], `${i.id} ${a.id}`).toBeTruthy();
      }
      // La respuesta guardada se verifica con el evaluador.
      const s = ej.solucion;
      const envio =
        s.tipo === "opcion_multiple" ? { tipo: "opcion" as const, opcionId: s.correcta }
        : s.tipo === "verdadero_falso" ? { tipo: "vf" as const, valores: s.valores }
        : s.tipo === "relacionar" ? { tipo: "relacionar" as const, pares: s.pares }
        : null;
      expect(envio).not.toBeNull();
      expect(evaluar(ej, { respuesta: envio! }).resultado, i.id).toBe("correcto");
    }
  });

  it("hay variedad: opción múltiple, VF, relacionar, datos, causa-efecto/hipótesis", () => {
    const tipos = new Set(items.map(tipoDeItem));
    for (const t of ["opcion_multiple", "verdadero_falso", "relacionar"]) expect(tipos).toContain(t);
    const categorias = new Set(items.map((i) => i.categoria));
    expect(categorias).toContain("datos");
    expect(categorias.has("causa_efecto") || categorias.has("hipotesis")).toBe(true);
  });

  it("selector: determinista por semilla, prefiere la dificultad pedida y no repite en la sesión", () => {
    const clave = items[0].temaClave;
    const delTema = items.filter((i) => i.temaClave === clave);
    const base = { temaClave: clave, nivel: items[0].nivel, grado: items[0].grado, dificultad: items[0].dificultad, semilla: 5 };
    expect(seleccionarItemCiencia(base)).toEqual(seleccionarItemCiencia(base));
    expect(seleccionarItemCiencia(base)!.temaClave).toBe(clave);
    const usados: string[] = [];
    for (let k = 0; k < delTema.length; k++) {
      const it = seleccionarItemCiencia({ ...base, semilla: k, usados })!;
      expect(usados).not.toContain(it.id);
      usados.push(`${BANCO_CIENCIA_ID}:${it.id}`.split(":")[1]);
    }
    // Agotados: vuelve a ofrecer ítems del tema.
    expect(seleccionarItemCiencia({ ...base, usados })!.temaClave).toBe(clave);
    // Sin ítems de la clave (clave nueva del colegio): usa el mismo grado.
    const otro = seleccionarItemCiencia({ ...base, temaClave: "cyt.p3.no-existe", nivel: "primaria", grado: 3 })!;
    expect(otro.grado).toBe(3);
  });

  it("ejercicioPara usa el banco con el fuenteId «cyt.banco:<id>» y respeta los tipos del tema", () => {
    const i = items.find((x) => tipoDeItem(x) === "verdadero_falso")!;
    const tema = temaPrueba({ clave: i.temaClave, nivel: i.nivel, grado: i.grado, tipos: ["verdadero_falso"], fuente: { tipo: "banco", bancoId: BANCO_CIENCIA_ID } });
    const ej = ejercicioPara(tema, i.dificultad, 3);
    expect(ej.publico.tipo).toBe("verdadero_falso");
    expect(ej.publico.fuenteId).toMatch(/^cyt\.banco:/);
    expect(() => ejercicioPara({ ...tema, fuente: { tipo: "banco", bancoId: "cyt.otro" } }, 1, 1)).toThrow(/Banco desconocido/);
  });
});
