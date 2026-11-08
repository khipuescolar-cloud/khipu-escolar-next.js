import { describe, expect, it } from "vitest";
import { editable, puedeTransicionar, type ContextoTransicion } from "@/lib/plan-anual/estados";

const c: ContextoTransicion = { esCoordinador: true, esDireccion: false, observacionesAbiertas: 0, participantesActivos: 2, conformesRonda: 2, cantidadTemas: 1, hayCoordinador: true };
describe("estados del plan anual", () => {
  it.each([
    ["borrador", "enviar_revision", "en_revision"],
    ["en_revision", "registrar_observacion", "con_observaciones"],
    ["con_observaciones", "reenviar_revision", "en_revision"],
    ["en_revision", "aprobar", "aprobado"],
    ["aprobado", "publicar", "publicado"],
    ["publicado", "abrir_revision", "borrador"],
  ] as const)("%s + %s → %s", (estado, accion, siguiente) => {
    expect(puedeTransicionar(estado, accion, c)).toEqual({ ok: true, siguiente });
  });
  it("bloquea estados inválidos y archivado", () => {
    expect(puedeTransicionar("borrador", "publicar", c).ok).toBe(false);
    expect(puedeTransicionar("archivado", "enviar_revision", c).ok).toBe(false);
    expect(puedeTransicionar("publicado", "archivar", { ...c, esDireccion: true })).toEqual({ ok: true, siguiente: "archivado" });
    expect(puedeTransicionar("publicado", "archivar", c).ok).toBe(false);
  });
  it("exige temas, coordinador, observaciones resueltas y conformidad total", () => {
    expect(puedeTransicionar("borrador", "enviar_revision", { ...c, cantidadTemas: 0 }).ok).toBe(false);
    expect(puedeTransicionar("borrador", "enviar_revision", { ...c, hayCoordinador: false }).ok).toBe(false);
    expect(puedeTransicionar("con_observaciones", "reenviar_revision", { ...c, observacionesAbiertas: 1 }).ok).toBe(false);
    expect(puedeTransicionar("en_revision", "aprobar", { ...c, observacionesAbiertas: 1 }).ok).toBe(false);
    expect(puedeTransicionar("aprobado", "publicar", { ...c, observacionesAbiertas: 1 }).ok).toBe(false);
    expect(puedeTransicionar("en_revision", "aprobar", { ...c, conformesRonda: 1 }).ok).toBe(false);
    expect(puedeTransicionar("en_revision", "aprobar", { ...c, esCoordinador: false }).ok).toBe(false);
  });
  it("permite editar únicamente borrador y con observaciones", () => {
    for (const estado of ["borrador", "con_observaciones"] as const) expect(editable(estado)).toBe(true);
    for (const estado of ["en_revision", "aprobado", "publicado", "archivado"] as const) expect(editable(estado)).toBe(false);
  });
});
