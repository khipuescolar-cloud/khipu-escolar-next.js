import { describe, expect, it } from "vitest";
import { resumirHoy } from "@/lib/server/avisos-panel";

describe("indicadores de avisos de hoy", () => {
  it("cuenta enviados por canal, abiertos, fallidos, omitidos y ordena por tipo", () => {
    const r = resumirHoy(
      [
        { canal: "correo", estado: "enviado", total: 6 },
        { canal: "correo", estado: "entregado", total: 2 },
        { canal: "correo", estado: "abierto", total: 2 },
        { canal: "correo", estado: "error", total: 1 },
        { canal: "correo", estado: "rebotado", total: 1 },
        { canal: "push", estado: "enviado", total: 4 },
        { canal: "push", estado: "queja", total: 1 },
        { canal: "correo", estado: "omitido", total: 3 },
        { canal: "correo", estado: "pendiente", total: 5 },
      ],
      [
        { tipo: "comunicado", total: 5 },
        { tipo: "asistencia", total: 20 },
      ],
      7,
    );
    expect(r).toMatchObject({ generados: 25, correosEnviados: 10, pushEnviados: 4, abiertos: 2, apertura: 20, fallidos: 3, omitidos: 3, enCola: 7 });
    expect(r.porTipo.map((t) => t.tipo)).toEqual(["asistencia", "comunicado"]);
  });

  it("sin envíos la apertura es null", () => {
    expect(resumirHoy([], [], 0)).toMatchObject({ generados: 0, apertura: null, fallidos: 0 });
  });
});
