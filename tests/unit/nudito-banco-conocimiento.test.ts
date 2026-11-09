import { describe, expect, it } from "vitest";
import { validarBanco } from "../../scripts/nudito-validar-banco";
import { ejercicioDelBanco, temasDeConBanco, temaPorClaveConBanco } from "@/lib/nudito/conocimiento/servidor";
import { esquemaEjercicioConSolucion, esquemaTema } from "@/lib/nudito/contratos";

describe("banco de conocimiento de Matemática 3.°", () => {
  it("valida fichas, referencias y respuestas", () => {
    const { fichas, errores } = validarBanco();
    expect(errores).toEqual([]);
    expect(fichas).toHaveLength(239);
    expect(new Set(fichas.map(f => f.competenciaCneb))).toEqual(new Set([23, 24, 25, 26]));
    expect(fichas.every(f => f.ejercicios.length >= 12)).toBe(true);
  });
  it("conserva claves existentes y sirve ejercicios cerrados", async () => {
    const temas = await temasDeConBanco("matematica", "primaria", 3);
    expect(temas).toHaveLength(239);
    for (const tema of temas) expect(esquemaTema.safeParse(tema).success, tema.clave).toBe(true);
    for (const clave of ["mat.p3.suma-resta-hasta-1000", "mat.p3.multiplicacion", "mat.p3.division", "mat.p3.fracciones-parte-todo", "mat.p3.igualdades-valor-desconocido", "mat.p3.patrones-numericos", "mat.p3.perimetro-inicial"]) {
      expect(await temaPorClaveConBanco(clave)).not.toBeNull();
    }
    for (const tema of temas) for (let semilla = 0; semilla < 12; semilla++) {
      const ejercicio = await ejercicioDelBanco(tema, 3, semilla);
      expect(esquemaEjercicioConSolucion.safeParse(ejercicio).success, tema.clave + ":" + semilla).toBe(true);
    }
  });
});
