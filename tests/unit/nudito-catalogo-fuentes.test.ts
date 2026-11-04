import { describe, expect, it } from "vitest";
import { itemsCiencia } from "@/lib/nudito/banco/ciencia";
import { tipoDeItem } from "@/lib/nudito/banco/items";
import { CLAVES_POR_FUENTE } from "@/lib/nudito/catalogo/claves";
import { temasGlobales } from "@/lib/nudito/catalogo";
import { esquemaEjercicioConSolucion, type Dificultad } from "@/lib/nudito/contratos";
import { ejercicioPara, fuentesDisponibles, obtenerGenerador } from "@/lib/nudito/generadores/registro";
import { itemsComunicacion } from "@/lib/nudito/lecturas/comunicacion";

// Prueba cruzada catálogo (A, specs/42) ↔ fuentes de ejercicios (B, specs/43).
const temas = temasGlobales();

describe("catálogo de Nudito ↔ generadores, banco y lecturas", () => {
  it("cada fuente del catálogo existe en el registro", () => {
    const f = fuentesDisponibles();
    for (const t of temas) {
      const fu = t.fuente;
      if (fu.tipo === "generador") expect(obtenerGenerador(fu.generadorId), `${t.clave} → ${fu.generadorId}`).not.toBeNull();
      if (fu.tipo === "banco") expect(f.bancos).toContain(fu.bancoId);
      if (fu.tipo === "lecturas") expect(f.lecturas).toContain(fu.coleccionId);
    }
    for (const id of Object.keys(CLAVES_POR_FUENTE)) expect([...f.generadores, ...f.bancos, ...f.lecturas]).toContain(id);
  });

  it("cada tema de banco/lecturas/escritura tiene ≥ 1 ítem de un tipo que el tema admite, dentro de su rango de dificultad", () => {
    const items = [...itemsCiencia(), ...itemsComunicacion()];
    const sinItems: string[] = [];
    for (const t of temas) {
      if (t.fuente.tipo === "generador") continue;
      const propios = items.filter((i) => i.temaClave === t.clave && t.tipos.includes(tipoDeItem(i)));
      if (!propios.length) sinItems.push(t.clave);
      for (const i of propios) {
        expect(i.dificultad, `${i.id}`).toBeGreaterThanOrEqual(t.dificultad.min);
        expect(i.dificultad, `${i.id}`).toBeLessThanOrEqual(t.dificultad.max);
        expect(`${i.nivel}${i.grado}`).toBe(`${t.nivel}${t.grado}`);
      }
    }
    expect(sinItems).toEqual([]);
  });

  it("todos los ítems usan claves existentes en CLAVES_POR_FUENTE de su área", () => {
    const cyt = new Set<string>(CLAVES_POR_FUENTE["cyt.banco"]);
    const com = new Set<string>([...CLAVES_POR_FUENTE["com.lecturas"], ...CLAVES_POR_FUENTE["com.escritura"]]);
    for (const i of itemsCiencia()) expect(cyt.has(i.temaClave), `${i.id}: ${i.temaClave}`).toBe(true);
    for (const i of itemsComunicacion()) expect(com.has(i.temaClave), `${i.id}: ${i.temaClave}`).toBe(true);
  });

  it("ejercicioPara produce un ejercicio válido, del tema y de un tipo admitido para TODOS los temas del catálogo", () => {
    for (const t of temas) {
      for (let d = t.dificultad.min; d <= t.dificultad.max; d++) {
        for (let semilla = 0; semilla < 20; semilla++) {
          const ej = ejercicioPara(t, d as Dificultad, semilla);
          const r = esquemaEjercicioConSolucion.safeParse(ej);
          if (!r.success) throw new Error(`${t.clave} d${d} s${semilla}: ${r.error.message}`);
          expect(t.tipos, `${t.clave} d${d} s${semilla}`).toContain(ej.publico.tipo);
          expect(ej.publico.temaClave).toBe(t.clave);
        }
      }
    }
  });
});
