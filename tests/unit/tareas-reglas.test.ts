// Reglas puras de tareas (specs/39): plazo efectivo, tarde/vencida, envío, enlaces y extensiones.
import { describe, expect, it } from "vitest";
import { instanteEnZona } from "@/lib/fechas";
import { agendaDeRevision, esTarde, estaVencida, extensionCoincide, limiteEfectivo, limitesAdjuntosTarea, normalizarEnlace, puedeEnviar } from "@/lib/tareas";

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

describe("agendaDeRevision", () => {
  const ahora = instanteEnZona("2026-11-07", "10:00");
  const sec = (id: string, limite: Date | null, porRevisar = 0) => ({ id, limite, contadores: { porRevisar } });
  const tarea = (secciones: ReturnType<typeof sec>[], estado = "publicada", programada = false) => ({ estado, programada, secciones });
  const fin = (iso: string) => instanteEnZona(iso, "23:59");

  it("hoy: vence hoy, o venció / sin fecha con entregas por revisar; próximos: vence en 7 días", () => {
    const { hoy, proximos } = agendaDeRevision([
      tarea([sec("vence-hoy", fin("2026-11-07")), sec("vencida-con-pendientes", fin("2026-11-03"), 2), sec("vencida-sin-pendientes", fin("2026-11-03"))]),
      tarea([sec("sin-fecha-pendiente", null, 1), sec("sin-fecha", null), sec("en-3-dias", fin("2026-11-10")), sec("en-9-dias", fin("2026-11-16"))]),
    ], ahora, "America/Lima");
    expect(hoy.map((i) => i.seccion.id)).toEqual(["vencida-con-pendientes", "vence-hoy", "sin-fecha-pendiente"]);
    expect(proximos.map((i) => [i.seccion.id, i.dias])).toEqual([["en-3-dias", 3]]);
  });

  it("ignora borradores, archivadas y programadas; incluye cerradas con entregas por revisar", () => {
    const pendiente = () => [sec("x", fin("2026-11-01"), 1)];
    const { hoy } = agendaDeRevision([tarea(pendiente(), "borrador"), tarea(pendiente(), "archivada"), tarea(pendiente(), "publicada", true), tarea([sec("cerrada", fin("2026-11-01"), 1)], "cerrada")], ahora, "America/Lima");
    expect(hoy.map((i) => i.seccion.id)).toEqual(["cerrada"]);
  });

  it("una hora límite ya pasada hoy sigue en «hoy»", () => {
    const { hoy } = agendaDeRevision([tarea([sec("a-las-8", instanteEnZona("2026-11-07", "08:00"))])], ahora, "America/Lima");
    expect(hoy).toHaveLength(1);
  });
});
