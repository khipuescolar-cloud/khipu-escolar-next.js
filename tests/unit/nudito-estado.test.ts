import { describe, expect, it } from "vitest";
import { elegirEstadoNudito, esHorarioEscolar, horaEnLima } from "@/lib/nudito/estado";

// Lima = UTC-5 todo el año.
const lima = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 28, h + 5, m));

describe("estado visual de Nudito", () => {
  it("calcula la hora de Lima", () => {
    expect(horaEnLima(lima(7))).toBe(7);
    expect(horaEnLima(new Date(Date.UTC(2026, 9, 29, 4, 59)))).toBe(23);
  });

  it("horario escolar: 7:00 incluido, 17:00 excluido", () => {
    expect(esHorarioEscolar(lima(6, 59))).toBe(false);
    expect(esHorarioEscolar(lima(7))).toBe(true);
    expect(esHorarioEscolar(lima(16, 59))).toBe(true);
    expect(esHorarioEscolar(lima(17))).toBe(false);
  });

  it("reposo en horario escolar", () => {
    expect(elegirEstadoNudito({ ahora: lima(10) })).toBe("reposo");
  });

  it("durmiendo fuera de horario", () => {
    expect(elegirEstadoNudito({ ahora: lima(22) })).toBe("durmiendo");
    expect(elegirEstadoNudito({ ahora: lima(5), saludando: true, avisos: 2 })).toBe("durmiendo");
  });

  it("el horario es configurable", () => {
    expect(elegirEstadoNudito({ ahora: lima(18), horario: { inicio: 7, fin: 19 } })).toBe("reposo");
  });

  it("pensando manda sobre todo, aun de noche", () => {
    expect(elegirEstadoNudito({ ahora: lima(22), pensando: true })).toBe("pensando");
  });

  it("preocupado > celebrando > saludo > avisando", () => {
    const base = { ahora: lima(10) };
    expect(elegirEstadoNudito({ ...base, preocupado: true, celebrando: true })).toBe("preocupado");
    expect(elegirEstadoNudito({ ...base, celebrando: true, saludando: true })).toBe("celebrando");
    expect(elegirEstadoNudito({ ...base, saludando: true, avisos: 3 })).toBe("saludo");
    expect(elegirEstadoNudito({ ...base, avisos: 3 })).toBe("avisando");
    expect(elegirEstadoNudito({ ...base, avisos: 0 })).toBe("reposo");
  });
});
