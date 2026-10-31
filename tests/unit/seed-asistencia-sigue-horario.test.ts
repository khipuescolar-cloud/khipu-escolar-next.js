// Datos demo (specs/35): la asistencia por curso sigue el horario (specs/34). `clasesDelDia` decide qué cursos tuvo un salón cada fecha.
import { describe, expect, it } from "vitest";
import { clasesDelDia, type BloqueCurso } from "../../prisma/seed-horario";

const bloques: BloqueCurso[] = [
  { salonId: "s1", dia: 1, cursoId: "mate", horaInicio: "08:45" },
  { salonId: "s1", dia: 1, cursoId: "mate", horaInicio: "08:00" }, // dos horas el mismo día: una sola lista, a la primera hora
  { salonId: "s1", dia: 1, cursoId: "comu", horaInicio: "10:45" },
  { salonId: "s1", dia: 1, cursoId: null, horaInicio: "12:15" }, // Tutoría (sin curso): no genera lista
  { salonId: "s1", dia: 2, cursoId: "ingles", horaInicio: "09:30" },
  { salonId: "s2", dia: 1, cursoId: "otro", horaInicio: "08:00" },
];

describe("clasesDelDia", () => {
  it("solo los cursos con bloque ese día de la semana, una vez cada uno, a la hora de inicio del primer periodo", () => {
    // 2026-11-02 es lunes.
    expect(clasesDelDia(bloques, "s1", "2026-11-02")).toEqual([{ cursoId: "mate", hora: "08:00" }, { cursoId: "comu", hora: "10:45" }]);
    expect(clasesDelDia(bloques, "s1", "2026-11-03")).toEqual([{ cursoId: "ingles", hora: "09:30" }]);
  });

  it("sin clases el fin de semana, los días sin bloques ni en salones sin horario", () => {
    expect(clasesDelDia(bloques, "s1", "2026-11-07")).toEqual([]);
    expect(clasesDelDia(bloques, "s1", "2026-11-04")).toEqual([]);
    expect(clasesDelDia(bloques, "s3", "2026-11-02")).toEqual([]);
  });
});
