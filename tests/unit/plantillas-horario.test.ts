import { describe, expect, it } from "vitest";
import { generarPeriodos, horasDeIngreso, validarPlantilla, type DatosPlantilla } from "@/lib/plantillas-horario";

const primaria: DatosPlantilla = {
  horaEntrada: "07:45",
  horaSalida: "13:15",
  duracionClase: 45,
  recreos: [{ horaInicio: "10:00", horaFin: "10:30" }, { horaInicio: "12:00", horaFin: "12:15" }],
};

describe("plantillas de horario", () => {
  it("calcula las horas de clase entre la entrada, los recreos y la salida", () => {
    const { periodos, sobrantes } = generarPeriodos(primaria);
    expect(periodos.map((p) => `${p.nombre} ${p.horaInicio}-${p.horaFin}`)).toEqual([
      "1.ª hora 07:45-08:30", "2.ª hora 08:30-09:15", "3.ª hora 09:15-10:00", "Recreo 1 10:00-10:30",
      "4.ª hora 10:30-11:15", "5.ª hora 11:15-12:00", "Recreo 2 12:00-12:15", "6.ª hora 12:15-13:00",
    ]);
    expect(sobrantes).toEqual([{ horaInicio: "13:00", horaFin: "13:15" }]);
  });

  it("con un solo recreo lo llama «Recreo»", () => {
    const { periodos } = generarPeriodos({ ...primaria, recreos: [{ horaInicio: "10:00", horaFin: "10:30" }] });
    expect(periodos.filter((p) => p.tipo === "recreo").map((p) => p.nombre)).toEqual(["Recreo"]);
  });

  it("valida horas, duración y recreos", () => {
    expect(validarPlantilla(primaria)).toBeNull();
    expect(validarPlantilla({ ...primaria, horaSalida: "07:00" })).toBe("La salida debe ser después de la entrada.");
    expect(validarPlantilla({ ...primaria, duracionClase: 5 })).toMatch(/entre 20 y 120/);
    expect(validarPlantilla({ ...primaria, recreos: [{ horaInicio: "13:00", horaFin: "13:30" }] })).toMatch(/entre la entrada y la salida/);
    expect(validarPlantilla({ ...primaria, recreos: [{ horaInicio: "10:00", horaFin: "10:30" }, { horaInicio: "10:15", horaFin: "10:45" }] })).toBe("Dos recreos se cruzan.");
    expect(validarPlantilla({ ...primaria, horaSalida: "08:00", recreos: [] })).toBe("Con esas horas no entra ninguna hora de clase.");
  });

  it("un salón con plantilla usa su entrada para la tardanza; sin plantilla, las horas del colegio", () => {
    const colegio = { horaLimiteTardanza: "08:00", horaLimiteFalta: "09:00" };
    expect(horasDeIngreso({ horaEntrada: "07:45", horaLimiteFalta: "08:45" }, colegio)).toEqual({ tardanza: "07:45", falta: "08:45" });
    expect(horasDeIngreso(null, colegio)).toEqual({ tardanza: "08:00", falta: "09:00" });
  });
});
