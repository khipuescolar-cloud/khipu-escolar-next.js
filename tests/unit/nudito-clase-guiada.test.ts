import { describe, expect, it } from "vitest";
import { clasePublica, esquemaClaseGuiada, narracionAccesibleDeComprobacion, narracionAccesibleDeMomento, partirEnFrases, sinAperturaRedundante } from "@/lib/nudito/conocimiento/clase-guiada";

const clase = {
  version: 1,
  momentos: [
    { id: "inicio", tipo: "idea", titulo: "Empezamos", narracion: "Observa la situación." },
    { id: "imagen", tipo: "recurso", titulo: "Imagen", narracion: "Hay tres grupos.", recursoRef: "grupos" },
    { id: "paso", tipo: "paso", titulo: "Cuenta", narracion: "Suma los grupos." },
  ],
  recursos: [{ id: "grupos", src: "/nudito/grupos.svg", alt: "Tres grupos", descripcion: "Tres grupos iguales." }],
  comprobacion: { pregunta: "¿Cuántos grupos hay?", opciones: [{ id: "a", texto: "Dos" }, { id: "b", texto: "Tres" }], respuesta: "b", mensajeCorrecto: "Hay tres grupos.", pista: "Cuenta los conjuntos." },
} as const;

describe("clase guiada", () => {
  it("relaciona recursos por ID y oculta la solución pública", () => {
    const validada = esquemaClaseGuiada.parse(clase);
    expect(clasePublica(validada).comprobacion).not.toHaveProperty("respuesta");
    expect(clasePublica(validada).momentos[1].recursoRef).toBe("grupos");
  });
  it("rechaza recursos ausentes y respuestas fuera de opciones", () => {
    expect(esquemaClaseGuiada.safeParse({ ...clase, recursos: [] }).success).toBe(false);
    expect(esquemaClaseGuiada.safeParse({ ...clase, comprobacion: { ...clase.comprobacion, respuesta: "c" } }).success).toBe(false);
  });
  it("orienta la voz con parte, título, imagen y propósito de la comprobación", () => {
    const validada = esquemaClaseGuiada.parse(clase);
    expect(narracionAccesibleDeMomento(validada.momentos[1], validada.recursos[0].descripcion)).toBe(
      "Imagen. Hay tres grupos. La imagen relacionada con esta parte muestra lo siguiente: Tres grupos iguales.",
    );
    expect(narracionAccesibleDeComprobacion(clasePublica(validada).comprobacion)).toBe(
      "Llegamos a la comprobación final. Escucha la pregunta y luego las alternativas. ¿Cuántos grupos hay? Opción 1. Dos Opción 2. Tres",
    );
  });
  it("no quita la entonación de pregunta al título", () => {
    expect(narracionAccesibleDeMomento({ titulo: "Ejemplo 2: ¿cuántas bolsas de paja?", narracion: "Cuenta." })).toBe("Ejemplo 2: ¿cuántas bolsas de paja? Cuenta.");
    expect(narracionAccesibleDeMomento({ titulo: "Ojo", narracion: "Mira." })).toBe("Ojo. Mira.");
  });
  it("parte frases sin utterances huérfanos", () => {
    expect(partirEnFrases("Hola. ¿Cómo estás? Bien.")).toEqual(["Hola.", "¿Cómo estás?", "Bien."]);
    expect(partirEnFrases("El primero dice «1. La feria fue en junio.» y el segundo «2. Fue la mejor feria.» Fin.")).toEqual([
      "El primero dice «1. La feria fue en junio.»", "y el segundo «2. Fue la mejor feria.»", "Fin."]);
    expect(partirEnFrases("Llega a las 3:00 p. m. Luego cena a las 8 a. m. del lunes.")).toEqual(["Llega a las 3:00 p. m.", "Luego cena a las 8 a. m. del lunes."]);
    expect(partirEnFrases("Cuesta S/ 15. El Sr. López paga 0.5 de más.")).toEqual(["Cuesta S/ 15.", "El Sr. López paga 0.5 de más."]);
    expect(partirEnFrases("Dijo «sí». ».")).toEqual(["Dijo «sí». »."]);
    expect(partirEnFrases("1. Primero. 2. Segundo.")).toEqual(["1. Primero.", "2. Segundo."]);
  });

  it("quita la apertura repetida del mensaje de acierto", () => {
    expect(sinAperturaRedundante("Correcto. Cinco por tres son quince.")).toBe("Cinco por tres son quince.");
    expect(sinAperturaRedundante("Muy bien. La regla es sumar tres.")).toBe("La regla es sumar tres.");
    expect(sinAperturaRedundante("La indicación aparece al final del cartel.")).toBe("La indicación aparece al final del cartel.");
    expect(sinAperturaRedundante("Correcto. Sí.")).toBe("Correcto. Sí.");
  });
});
