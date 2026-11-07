import { describe, expect, it } from "vitest";
import { puedeTransicionarSolicitud, puedeTransicionarDestinatario, vencida, entregaTardia, expandirAreas, cumplimiento, resumenDestinatarios } from "@/lib/solicitudes";

describe("solicitudes documentales", () => {
  it("acepta solo las transiciones del circuito", () => {
    expect(puedeTransicionarSolicitud("borrador", "publicada")).toBe(true);
    expect(puedeTransicionarSolicitud("anulada", "publicada")).toBe(false);
    expect(puedeTransicionarDestinatario("pendiente", "entregado")).toBe(true);
    expect(puedeTransicionarDestinatario("entregado", "entregado")).toBe(false);
    expect(puedeTransicionarDestinatario("observado", "entregado")).toBe(true);
    expect(puedeTransicionarDestinatario("aprobado", "en_revision")).toBe(true);
  });
  it("deriva el vencimiento del estado y conserva la tardanza inicial", () => {
    const limite = new Date("2026-10-01T12:00:00Z"); const ahora = new Date("2026-10-02T12:00:00Z");
    expect(vencida("pendiente", limite, null, ahora)).toBe(true);
    expect(vencida("entregado", limite, null, ahora)).toBe(false);
    expect(vencida("observado", limite, null, ahora)).toBe(false);
    expect(vencida("observado", limite, limite, ahora)).toBe(true);
    expect(entregaTardia(ahora, limite)).toBe(true);
    expect(entregaTardia(limite, limite)).toBe(false);
  });
  it("expande áreas sin repetir al profesor y calcula el cumplimiento", () => {
    expect(expandirAreas([{ profesorId: "a", areaCneb: "matematica", nombre: "Matemática" }, { profesorId: "a", areaCneb: "matematica", nombre: "Matemática" }, { profesorId: "b", areaCneb: "comunicacion", nombre: "Comunicación" }], ["matematica"])).toEqual([{ membershipId: "a", grupo: "matematica" }]);
    expect(cumplimiento(2, 3)).toBe(66.67);
    expect(resumenDestinatarios([{ estado: "pendiente", versionActual: 0, entregaTardia: false, fechaLimite: new Date(0), plazoCorreccion: null }], new Date(1))).toMatchObject({ pendientes: 1, vencidas: 1, fueraDePlazo: 1 });
  });
});
