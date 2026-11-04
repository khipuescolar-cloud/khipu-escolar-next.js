// Reglas puras de tareas (specs/39): plazo efectivo, tarde/vencida, envío, enlaces y extensiones.
import { describe, expect, it } from "vitest";
import { instanteEnZona } from "@/lib/fechas";
import { esTarde, estaVencida, extensionCoincide, limiteEfectivo, limitesAdjuntosTarea, normalizarEnlace, puedeEnviar } from "@/lib/tareas";

describe("instanteEnZona", () => {
  it("convierte fecha y hora locales a un instante (Lima UTC−5 y una zona con horario de verano)", () => {
    expect(instanteEnZona("2026-11-20", "10:00").toISOString()).toBe("2026-11-20T15:00:00.000Z");
    expect(instanteEnZona("2026-07-01", "10:00", "America/Santiago").toISOString()).toBe("2026-07-01T14:00:00.000Z");
    expect(instanteEnZona("2026-12-01", "10:00", "America/Santiago").toISOString()).toBe("2026-12-01T13:00:00.000Z");
  });
});

describe("plazo", () => {
  const fecha = instanteEnZona("2026-11-20", "08:00");
  it("sin hora vence al final del día; con hora, en ese instante; sin fecha nunca", () => {
    expect(limiteEfectivo(fecha, false)!.toISOString()).toBe("2026-11-21T04:59:59.999Z");
    expect(limiteEfectivo(fecha, true)).toBe(fecha);
    expect(limiteEfectivo(null, true)).toBeNull();
    expect(estaVencida(null, new Date("2099-01-01"))).toBe(false);
  });
  it("tarde solo después del límite", () => {
    const l = instanteEnZona("2026-11-20", "10:00");
    expect(esTarde(instanteEnZona("2026-11-20", "09:59"), l)).toBe(false);
    expect(esTarde(instanteEnZona("2026-11-20", "10:01"), l)).toBe(true);
    expect(esTarde(new Date(), null)).toBe(false);
  });
  it("puedeEnviar: cerrada, no publicada y sin tardías", () => {
    const limite = instanteEnZona("2026-11-20", "10:00");
    const despues = instanteEnZona("2026-11-20", "11:00");
    expect(puedeEnviar({ estado: "publicada", permiteTardias: true, limite }, despues)).toEqual({ ok: true, tarde: true });
    expect(puedeEnviar({ estado: "publicada", permiteTardias: false, limite }, despues).ok).toBe(false);
    expect(puedeEnviar({ estado: "cerrada", permiteTardias: true, limite: null }).ok).toBe(false);
    expect(puedeEnviar({ estado: "borrador", permiteTardias: true, limite: null }).ok).toBe(false);
    expect(puedeEnviar({ estado: "publicada", permiteTardias: false, limite: null })).toEqual({ ok: true, tarde: false });
  });
});

describe("enlaces y archivos", () => {
  it("solo http/https sin credenciales", () => {
    expect(normalizarEnlace(" https://es.khanacademy.org/math ")).toBe("https://es.khanacademy.org/math");
    expect(normalizarEnlace("javascript:alert(1)")).toBeNull();
    expect(normalizarEnlace("ftp://x.pe/a")).toBeNull();
    expect(normalizarEnlace("https://user:clave@x.pe")).toBeNull();
    expect(normalizarEnlace("no es url")).toBeNull();
  });
  it("la extensión debe corresponder al tipo real", () => {
    expect(extensionCoincide("Trabajo.PDF", "application/pdf")).toBe(true);
    expect(extensionCoincide("foto.jpeg", "image/jpeg")).toBe(true);
    expect(extensionCoincide("tarea.pdf", "image/png")).toBe(false);
    expect(extensionCoincide("sin-extension", "application/pdf")).toBe(false);
    expect(extensionCoincide("expo.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe(true);
  });
  it("los límites del colegio no pasan el techo duro", () => {
    expect(limitesAdjuntosTarea({ tareasMaxArchivos: 50, tareasMaxMb: 100 })).toMatchObject({ archivos: 5, mb: 10 });
    expect(limitesAdjuntosTarea({ tareasMaxArchivos: 2, tareasMaxMb: 3 })).toMatchObject({ archivos: 2, mb: 3, bytes: 3 * 1024 * 1024 });
  });
});
