import { describe, expect, it } from "vitest";
import {
  calcularActivacion, diasParaVencer, esVigente, estadoParaFamilia, extenderHasta, leerConsentimiento, leerLimites, leerPrecio, leerYape,
  LIMITES_POR_DEFECTO, normalizarDominio, parrafos, periodoNuevo, sumarMeses, urlPermitida,
} from "@/lib/nudito-plus";

describe("Nudito+: fechas de licencias", () => {
  it("suma meses y recorta al último día del mes", () => {
    expect(sumarMeses("2026-10-30", 1)).toBe("2026-11-30");
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMeses("2028-01-31", 1)).toBe("2028-02-29");
    expect(sumarMeses("2026-11-15", 3)).toBe("2027-02-15");
    expect(sumarMeses("2026-12-31", 12)).toBe("2027-12-31");
  });

  it("periodo nuevo: desde hoy hasta el día anterior N meses después", () => {
    expect(periodoNuevo("2026-10-30", 1)).toEqual({ desde: "2026-10-30", hasta: "2026-11-29" });
    expect(periodoNuevo("2026-11-01", 1)).toEqual({ desde: "2026-11-01", hasta: "2026-11-30" });
    expect(periodoNuevo("2026-12-15", 12)).toEqual({ desde: "2026-12-15", hasta: "2027-12-14" });
  });

  it("extender: el periodo nuevo empieza al día siguiente del hasta actual", () => {
    expect(extenderHasta("2026-11-29", 1)).toBe("2026-12-29");
    expect(extenderHasta("2026-11-30", 1)).toBe("2026-12-31");
    expect(extenderHasta("2026-12-31", 2)).toBe("2027-02-28");
  });

  it("verificar: extiende si hay licencia activa que no venció; si no, crea una desde hoy", () => {
    expect(calcularActivacion({ hasta: "2026-11-10" }, "2026-10-30", 3)).toEqual({ tipo: "extender", hasta: "2027-02-10" });
    expect(calcularActivacion({ hasta: "2026-10-30" }, "2026-10-30", 1)).toEqual({ tipo: "extender", hasta: "2026-11-29" });
    expect(calcularActivacion({ hasta: "2026-10-29" }, "2026-10-30", 1)).toEqual({ tipo: "nueva", desde: "2026-10-30", hasta: "2026-11-29" });
    expect(calcularActivacion(null, "2026-10-30", 1)).toEqual({ tipo: "nueva", desde: "2026-10-30", hasta: "2026-11-29" });
  });

  it("vigencia incluye desde y hasta; vencida o cancelada no", () => {
    const l = { estado: "activa" as const, desde: "2026-10-01", hasta: "2026-10-31" };
    expect(esVigente(l, "2026-10-01")).toBe(true);
    expect(esVigente(l, "2026-10-31")).toBe(true);
    expect(esVigente(l, "2026-11-01")).toBe(false);
    expect(esVigente(l, "2026-09-30")).toBe(false);
    expect(esVigente({ ...l, estado: "cancelada" }, "2026-10-15")).toBe(false);
    expect(diasParaVencer("2026-11-02", "2026-10-30")).toBe(3);
    expect(diasParaVencer("2026-10-30", "2026-10-30")).toBe(0);
  });

  it("estado para la familia: activa, en revisión, vencida o sin licencia", () => {
    const hoy = "2026-10-30";
    const activa = { estado: "activa" as const, desde: "2026-10-01", hasta: "2026-11-15" };
    const vieja = { estado: "vencida" as const, desde: "2026-08-01", hasta: "2026-08-31" };
    expect(estadoParaFamilia([activa], false, hoy)).toEqual({ tipo: "activa", hasta: "2026-11-15", pagoEnRevision: false });
    expect(estadoParaFamilia([activa], true, hoy)).toEqual({ tipo: "activa", hasta: "2026-11-15", pagoEnRevision: true });
    expect(estadoParaFamilia([vieja], true, hoy)).toEqual({ tipo: "revision" });
    expect(estadoParaFamilia([vieja], false, hoy)).toEqual({ tipo: "vencida", hasta: "2026-08-31" });
    // Activa sin marcar pero con hasta pasado (antes del cron): se ve vencida.
    expect(estadoParaFamilia([{ ...vieja, estado: "activa" }], false, hoy)).toEqual({ tipo: "vencida", hasta: "2026-08-31" });
    expect(estadoParaFamilia([{ ...vieja, estado: "cancelada" }], false, hoy)).toEqual({ tipo: "sin" });
    expect(estadoParaFamilia([], false, hoy)).toEqual({ tipo: "sin" });
  });
});

describe("Nudito+: configuración", () => {
  it("usa valores por defecto si la configuración falta o es inválida", () => {
    expect(leerLimites(null)).toEqual(LIMITES_POR_DEFECTO);
    expect(leerLimites({ mensajesPorMes: 500, tokensPorMes: "x" })).toEqual({ ...LIMITES_POR_DEFECTO, mensajesPorMes: 500 });
    expect(LIMITES_POR_DEFECTO).toEqual({ mensajesPorMes: 300, tokensPorMes: 300_000, costoMaxUsdPorMes: 1.5 });
    expect(leerPrecio(undefined)).toEqual({ montoMensual: 20, moneda: "PEN" });
    expect(leerPrecio({ montoMensual: 25 })).toEqual({ montoMensual: 25, moneda: "PEN" });
    expect(leerYape({})).toBeNull();
    expect(leerYape({ numero: "999 999 999", titular: "Khipu" })).toEqual({ numero: "999 999 999", titular: "Khipu" });
    expect(leerConsentimiento(null).version).toBe("v1");
    expect(parrafos("Uno.\n\n  Dos.\n \nTres.")).toEqual(["Uno.", "Dos.", "Tres."]);
  });
});

describe("Nudito+: sitios permitidos", () => {
  it("normaliza el dominio: minúsculas, sin esquema, www, ruta ni puerto", () => {
    expect(normalizarDominio("https://www.PeruEduca.pe/cursos?x=1")).toBe("perueduca.pe");
    expect(normalizarDominio("es.khanacademy.org")).toBe("es.khanacademy.org");
    expect(normalizarDominio("  MINEDU.gob.pe. ")).toBe("minedu.gob.pe");
    expect(normalizarDominio("http://aprendoencasa.pe:8080")).toBe("aprendoencasa.pe");
    expect(normalizarDominio("youtube")).toBeNull();
    expect(normalizarDominio("javascript:alert(1)")).toBeNull();
    expect(normalizarDominio("")).toBeNull();
  });

  it("acepta el dominio y sus subdominios, nada más", () => {
    const lista = ["khanacademy.org", "perueduca.pe"];
    expect(urlPermitida("https://es.khanacademy.org/math", lista)).toBe(true);
    expect(urlPermitida("https://perueduca.pe", lista)).toBe(true);
    expect(urlPermitida("https://falsoperueduca.pe", lista)).toBe(false);
    expect(urlPermitida("https://perueduca.pe.evil.com", lista)).toBe(false);
    expect(urlPermitida("no es url", lista)).toBe(false);
  });
});
