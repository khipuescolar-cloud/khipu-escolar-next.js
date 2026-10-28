import { describe, expect, it } from "vitest";
import { duracionLegible, etiquetaSla, haceCuanto, minutosHabiles, nombreEstado, promedioMinutos } from "@/lib/soporte";

// Hora de Lima = UTC−5. 2026-10-28 es miércoles.
const lima = (iso: string) => new Date(`${iso}-05:00`);

describe("mesa de ayuda: SLA en horas hábiles (lun–vie 8:00–18:00, Lima)", () => {
  it("cuenta solo el horario hábil del mismo día", () => {
    expect(minutosHabiles(lima("2026-10-28T07:00:00"), lima("2026-10-28T10:30:00"))).toBe(150);
    expect(minutosHabiles(lima("2026-10-28T17:00:00"), lima("2026-10-28T23:00:00"))).toBe(60);
  });

  it("salta noches y fines de semana", () => {
    // Viernes 17:00 → lunes 9:00 = 1 h + 1 h.
    expect(minutosHabiles(lima("2026-10-30T17:00:00"), lima("2026-11-02T09:00:00"))).toBe(120);
    expect(minutosHabiles(lima("2026-10-31T09:00:00"), lima("2026-11-01T18:00:00"))).toBe(0);
  });

  it("ámbar después de 2 h hábiles y rojo después de 8 h hábiles; el texto usa el tiempo de reloj", () => {
    const desde = lima("2026-10-28T08:00:00");
    expect(etiquetaSla(desde, lima("2026-10-28T09:30:00")).nivel).toBe("normal");
    expect(etiquetaSla(desde, lima("2026-10-28T11:00:00"))).toEqual({ nivel: "ambar", texto: "Sin respuesta hace 3 h" });
    expect(etiquetaSla(desde, lima("2026-10-29T09:00:00")).nivel).toBe("rojo");
    // Viernes 18:00 → lunes 8:30: 62 h de reloj pero 30 min hábiles.
    expect(etiquetaSla(lima("2026-10-30T18:00:00"), lima("2026-11-02T08:30:00")).nivel).toBe("normal");
  });

  it("textos de tiempo y estado según el lado", () => {
    const t = new Date("2026-10-28T12:00:00Z");
    expect(haceCuanto(new Date(t.getTime() - 5 * 60_000), t)).toBe("hace 5 min");
    expect(haceCuanto(new Date(t.getTime() - 72 * 3_600_000), t)).toBe("hace 3 días");
    expect(duracionLegible(45)).toBe("45 min");
    expect(duracionLegible(200)).toBe("3 h 20 min");
    expect(duracionLegible(60 * 26)).toBe("1 d 2 h");
    expect(nombreEstado("esperando_colegio", "colegio")).toBe("Esperando tu respuesta");
    expect(nombreEstado("esperando_colegio", "khipu")).toBe("Esperando al colegio");
    expect(promedioMinutos([{ createdAt: t, primeraRespuestaAt: new Date(t.getTime() + 30 * 60_000) }, { createdAt: t, primeraRespuestaAt: null }])).toBe(30);
    expect(promedioMinutos([])).toBeNull();
  });
});
