import { describe, expect, it } from "vitest";
import { cupoDiario, esperaReintentoMs, leerLimites, MAX_INTENTOS, pausaEntreCorreosMs, tocaResumen } from "@/lib/server/notificaciones/limites";

describe("tope diario y ritmo de la cola de avisos", () => {
  it("el cupo es el límite menos lo enviado en 24 h, sin bajar de cero", () => {
    expect(cupoDiario(0, 2000)).toBe(2000);
    expect(cupoDiario(1999, 2000)).toBe(1);
    expect(cupoDiario(2000, 2000)).toBe(0);
    expect(cupoDiario(2500, 2000)).toBe(0);
  });

  it("la pausa entre correos sigue EMAIL_RATE_PER_SECOND", () => {
    expect(pausaEntreCorreosMs(1)).toBe(1000);
    expect(pausaEntreCorreosMs(14)).toBe(72);
    expect(pausaEntreCorreosMs(0)).toBe(1000);
  });

  it("lee los límites del entorno con valores por defecto seguros", () => {
    expect(leerLimites({ EMAIL_DAILY_LIMIT: "500", EMAIL_RATE_PER_SECOND: "2" })).toEqual({ limiteDiario: 500, porSegundo: 2 });
    expect(leerLimites({})).toEqual({ limiteDiario: 2000, porSegundo: 1 });
    expect(leerLimites({ EMAIL_DAILY_LIMIT: "abc", EMAIL_RATE_PER_SECOND: "-1" })).toEqual({ limiteDiario: 2000, porSegundo: 1 });
  });

  it("hace 3 reintentos con espera creciente", () => {
    expect(MAX_INTENTOS).toBe(4);
    const esperas = [1, 2, 3].map(esperaReintentoMs);
    expect(esperas[0]).toBeLessThan(esperas[1]);
    expect(esperas[1]).toBeLessThan(esperas[2]);
  });

  it("el resumen de llegadas se envía desde la hora configurada", () => {
    expect(tocaResumen("08:59", "09:00")).toBe(false);
    expect(tocaResumen("09:00", "09:00")).toBe(true);
    expect(tocaResumen("13:10", "09:00")).toBe(true);
  });
});
