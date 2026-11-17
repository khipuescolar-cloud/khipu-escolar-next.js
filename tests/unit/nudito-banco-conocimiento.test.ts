import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { validarBanco } from "../../scripts/nudito-validar-banco";
import { ejercicioDelBanco, fichasDe, temasDeConBanco, temaPorClaveConBanco } from "@/lib/nudito/conocimiento/servidor";
import { esquemaEjercicioConSolucion, esquemaTema } from "@/lib/nudito/contratos";

describe("banco de conocimiento de Nudito", () => {
  it("valida fichas, referencias y respuestas", () => {
    const { fichas, errores } = validarBanco();
    expect(errores).toEqual([]);
    expect(fichas.length === 0 || fichas.length >= 100).toBe(true);
    expect(fichas.every(f => f.ejercicios.length >= 12)).toBe(true);
  }, 20_000);
  it("conserva claves existentes y sirve ejercicios cerrados", async () => {
    const temas = await temasDeConBanco("matematica", "primaria", 3);
    expect(temas).toHaveLength((await fichasDe("matematica", "primaria", 3)).length);
    for (const tema of temas) expect(esquemaTema.safeParse(tema).success, tema.clave).toBe(true);
    if (temas.length >= 129) {
      for (const clave of ["mat.p3.suma-resta-hasta-1000", "mat.p3.multiplicacion", "mat.p3.division", "mat.p3.fracciones-parte-todo", "mat.p3.igualdades-valor-desconocido", "mat.p3.patrones-numericos", "mat.p3.perimetro-inicial"]) {
        expect(await temaPorClaveConBanco(clave)).not.toBeNull();
      }
    }
    for (const tema of temas) for (let semilla = 0; semilla < 12; semilla++) {
      const ejercicio = await ejercicioDelBanco(tema, 3, semilla);
      expect(esquemaEjercicioConSolucion.safeParse(ejercicio).success, tema.clave + ":" + semilla).toBe(true);
    }
  });
  it("la muestra de la célula orienta cada parte y ofrece apoyo visual resoluble", async () => {
    const ficha = (await fichasDe("ciencia-tecnologia", "primaria", 5)).find(f => f.clave === "cyt.p5.la-celula");
    expect(ficha?.claseGuiada).toBeDefined();
    expect(ficha?.claseGuiada?.momentos[0].recursoRef).toBeUndefined();
    expect(ficha?.claseGuiada?.momentos.slice(1).every(momento => Boolean(momento.recursoRef))).toBe(true);
    expect(ficha?.claseGuiada?.momentos[0].narracion).toContain("Como idea principal de este tema");
    expect(ficha?.claseGuiada?.momentos.some(momento => momento.narracion.includes("Observemos esta situación"))).toBe(true);
    for (const recurso of ficha?.claseGuiada?.recursos ?? []) {
      expect(existsSync(join(process.cwd(), "public", recurso.src))).toBe(true);
    }
  });
});
