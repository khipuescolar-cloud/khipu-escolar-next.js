import { describe, expect, it } from "vitest";
import { etiquetaApoderado, etiquetaProfesor } from "@/lib/mensajes";
import { nombreRol } from "@/lib/roles";
import { porcentajeApertura } from "@/lib/server/avisos-panel";

const salon = { nombre: "3.° B", tutorId: "t1", cursos: [{ nombre: "Ciencia", profesorId: "p2" }, { nombre: "Arte", profesorId: "p2" }] };

describe("etiquetas del chat", () => {
  it("la tutora se muestra con su salón", () => {
    expect(etiquetaProfesor("Lucía García", "t1", salon)).toBe("Lucía García · Tutor(a) de 3.° B");
  });
  it("un profesor de curso muestra sus cursos y el salón", () => {
    expect(etiquetaProfesor("Pedro Salas", "p2", salon)).toBe("Pedro Salas · Profesor(a) de Ciencia, Arte (3.° B)");
  });
  it("usa el género: tutora/profesora, tutor/profesor y, sin dato, Tutor(a)/Profesor(a)", () => {
    expect(etiquetaProfesor("Lucía García", "t1", salon, "femenino")).toBe("Lucía García · Tutora de 3.° B");
    expect(etiquetaProfesor("Luis Paz", "t1", salon, "masculino")).toBe("Luis Paz · Tutor de 3.° B");
    expect(etiquetaProfesor("Luis Paz", "t1", salon, "no_especifica")).toBe("Luis Paz · Tutor(a) de 3.° B");
    expect(etiquetaProfesor("Ana Ríos", "p2", salon, "femenino")).toBe("Ana Ríos · Profesora de Ciencia, Arte (3.° B)");
    expect(etiquetaProfesor("Pedro Salas", "p2", salon, "masculino")).toBe("Pedro Salas · Profesor de Ciencia, Arte (3.° B)");
  });
  it("el nombre del rol profesor sigue el género", () => {
    expect(nombreRol("profesor", "femenino")).toBe("Profesora");
    expect(nombreRol("profesor", "masculino")).toBe("Profesor");
    expect(nombreRol("profesor", null)).toBe("Profesor(a)");
    expect(nombreRol("direccion", "femenino")).toBe("Dirección");
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
