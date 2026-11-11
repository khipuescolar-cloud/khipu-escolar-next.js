import { describe, expect, it } from "vitest";
import { mayorGrupoParecido } from "../../scripts/nudito-validar-banco";

describe("detección de fichas hechas con plantilla", () => {
  it("agrupa el mismo enunciado con otro contexto u otros números", () => {
    const plantilla = ["En el aula", "En la mesa", "En la mochila", "En el patio", "En la casa", "En el parque"].map(
      lugar => `${lugar}, durante la clase de formas, una figura plana tiene tres lados rectos. ¿Cómo se llama esa figura?`,
    );
    expect(mayorGrupoParecido(plantilla)).toBe(6);
  });
  it("no marca ejercicios distintos del mismo tema", () => {
    expect(mayorGrupoParecido([
      "¿Cuál es la mitad de 8? Escribe solo el número.",
      "Papá corta una pizza de 12 tajadas por la mitad para dos familias. ¿Cuántas tajadas recibe cada familia?",
      "Hay 18 niños en el aula y la mitad son niñas. ¿Cuántas niñas hay?",
      "Carlos tenía 80 soles. Gastó la mitad en zapatillas y después 15 soles en un polo. ¿Cuántos soles le quedan?",
    ])).toBeLessThan(3);
  });
});
