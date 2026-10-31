// Destino de los comunicados (specs/09): lectura del formulario, columnas de la BD y etiqueta de la lista.
import { describe, expect, it } from "vitest";
import { columnasAudiencia, etiquetaAudiencia, leerAudiencia } from "@/lib/audiencia-comunicado";

const UUID = "0b5f6c1e-6d5a-4c1b-9f7e-2a3b4c5d6e7f";

describe("leerAudiencia", () => {
  it("lee cada destino del formulario", () => {
    expect(leerAudiencia({ destino: "colegio" })).toEqual({ ok: true, audiencia: { tipo: "colegio" } });
    expect(leerAudiencia({ destino: "niveles", niveles: ["secundaria", "primaria", "primaria"] })).toEqual({ ok: true, audiencia: { tipo: "niveles", niveles: ["primaria", "secundaria"] } });
    expect(leerAudiencia({ destino: "grado", grado: "primaria:3" })).toEqual({ ok: true, audiencia: { tipo: "grado", nivel: "primaria", grado: 3 } });
    expect(leerAudiencia({ destino: "salon", salonId: UUID })).toEqual({ ok: true, audiencia: { tipo: "salon", salonId: UUID } });
  });

  it("sin destino: salonId → salón; nada → todo el colegio (formularios antiguos)", () => {
    expect(leerAudiencia({ destino: null, salonId: UUID })).toEqual({ ok: true, audiencia: { tipo: "salon", salonId: UUID } });
    expect(leerAudiencia({ destino: null })).toEqual({ ok: true, audiencia: { tipo: "colegio" } });
  });

  it("rechaza destinos incompletos o inventados", () => {
    expect(leerAudiencia({ destino: "niveles", niveles: [] })).toEqual({ ok: false, error: "Elige al menos un nivel." });
    expect(leerAudiencia({ destino: "niveles", niveles: ["universidad"] })).toEqual({ ok: false, error: "Ese nivel no existe." });
    expect(leerAudiencia({ destino: "grado", grado: null })).toEqual({ ok: false, error: "Elige un grado." });
    expect(leerAudiencia({ destino: "grado", grado: "primaria:7" })).toEqual({ ok: false, error: "Ese grado no existe." });
    expect(leerAudiencia({ destino: "grado", grado: "secundaria:6" })).toEqual({ ok: false, error: "Ese grado no existe." });
    expect(leerAudiencia({ destino: "salon", salonId: "x" })).toEqual({ ok: false, error: "Elige un salón." });
    expect(leerAudiencia({ destino: "planeta" })).toEqual({ ok: false, error: "Elige para quién es el comunicado." });
  });
});

describe("columnas y etiqueta", () => {
  it("guarda cada destino en salon_id / niveles / grado", () => {
    expect(columnasAudiencia({ tipo: "colegio" })).toEqual({ salonId: null, niveles: [], grado: null });
    expect(columnasAudiencia({ tipo: "grado", nivel: "secundaria", grado: 2 })).toEqual({ salonId: null, niveles: ["secundaria"], grado: 2 });
    expect(columnasAudiencia({ tipo: "salon", salonId: UUID })).toEqual({ salonId: UUID, niveles: [], grado: null });
  });

  it("muestra el destino en palabras", () => {
    expect(etiquetaAudiencia({ salon: null, niveles: [], grado: null })).toBe("Todo el colegio");
    expect(etiquetaAudiencia({ salon: "3.° B", niveles: [], grado: null })).toBe("3.° B");
    expect(etiquetaAudiencia({ salon: null, niveles: ["primaria"], grado: null })).toBe("Primaria");
    expect(etiquetaAudiencia({ salon: null, niveles: ["secundaria", "inicial"], grado: null })).toBe("Inicial y secundaria");
    expect(etiquetaAudiencia({ salon: null, niveles: ["inicial", "primaria", "secundaria"], grado: null })).toBe("Inicial, primaria y secundaria");
    expect(etiquetaAudiencia({ salon: null, niveles: ["primaria"], grado: 3 })).toBe("3.° grado de primaria");
    expect(etiquetaAudiencia({ salon: null, niveles: ["inicial"], grado: 4 })).toBe("Inicial de 4 años");
  });
});
