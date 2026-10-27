import { describe, expect, it } from "vitest";
import { etiquetaApoderado, etiquetaProfesor } from "@/lib/mensajes";
import { porcentajeApertura } from "@/lib/server/avisos-panel";

const salon = { nombre: "3.° B", tutorId: "t1", cursos: [{ nombre: "Ciencia", profesorId: "p2" }, { nombre: "Arte", profesorId: "p2" }] };

describe("etiquetas del chat", () => {
  it("la tutora se muestra con su salón", () => {
    expect(etiquetaProfesor("Lucía García", "t1", salon)).toBe("Lucía García · Tutor(a) de 3.° B");
  });
  it("un profesor de curso muestra sus cursos y el salón", () => {
    expect(etiquetaProfesor("Pedro Salas", "p2", salon)).toBe("Pedro Salas · Profesor(a) de Ciencia, Arte (3.° B)");
  });
  it("el apoderado muestra parentesco y alumno, sin contacto", () => {
    expect(etiquetaApoderado("Rosa Quispe", "Madre", "Mateo Quispe")).toBe("Rosa Quispe · madre de Mateo Quispe");
  });
});

describe("porcentajeApertura", () => {
  it("redondea y maneja cero envíos", () => {
    expect(porcentajeApertura(0, 0)).toBeNull();
    expect(porcentajeApertura(3, 2)).toBe(67);
    expect(porcentajeApertura(10, 7)).toBe(70);
  });
});
