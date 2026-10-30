import { describe, expect, it } from "vitest";
import { generarInvitados, puedeResponderReunion, resumirRespuestas } from "@/lib/reuniones";

describe("generarInvitados", () => {
  const vinculos = [
    { apoderadoId: "madre", alumnoId: "mateo" },
    { apoderadoId: "madre", alumnoId: "ana" },
    { apoderadoId: "padre", alumnoId: "mateo" },
    { apoderadoId: "madre", alumnoId: "mateo" }, // repetido
  ];

  it("en salón e individual crea una fila por apoderado y alumno, sin repetir", () => {
    for (const alcance of ["salon", "individual"] as const) {
      expect(generarInvitados(alcance, vinculos)).toEqual([
        { membershipId: "madre", alumnoId: "mateo" },
        { membershipId: "madre", alumnoId: "ana" },
        { membershipId: "padre", alumnoId: "mateo" },
      ]);
    }
  });

  it("en todo el colegio crea una sola fila por apoderado, sin alumno", () => {
    expect(generarInvitados("colegio", vinculos)).toEqual([
      { membershipId: "madre", alumnoId: null },
      { membershipId: "padre", alumnoId: null },
    ]);
  });

  it("sin vínculos no hay invitados", () => {
    expect(generarInvitados("salon", [])).toEqual([]);
  });
});

describe("puedeResponderReunion", () => {
  const inicio = new Date("2026-11-10T23:00:00Z");
  it("solo antes de empezar y si está programada", () => {
    expect(puedeResponderReunion({ estado: "programada", inicio }, new Date("2026-11-10T22:59:00Z"))).toBe(true);
    expect(puedeResponderReunion({ estado: "programada", inicio }, inicio)).toBe(false);
    expect(puedeResponderReunion({ estado: "cancelada", inicio }, new Date("2026-11-01T00:00:00Z"))).toBe(false);
    expect(puedeResponderReunion({ estado: "realizada", inicio }, new Date("2026-11-01T00:00:00Z"))).toBe(false);
  });
});

describe("resumirRespuestas", () => {
  it("cuenta por persona aunque tenga varias filas", () => {
    expect(
      resumirRespuestas([
        { membershipId: "a", respuesta: "asistire" },
        { membershipId: "a", respuesta: "asistire" },
        { membershipId: "b", respuesta: "no_asistire" },
        { membershipId: "c", respuesta: "pendiente" },
        { membershipId: "d", respuesta: "pendiente" },
      ]),
    ).toEqual({ asistire: 1, no_asistire: 1, pendiente: 2 });
  });
});
