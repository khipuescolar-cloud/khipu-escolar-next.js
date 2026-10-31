import { describe, expect, it } from "vitest";
import { agruparConteos, MAX_DIAS } from "@/lib/grafico-asistencia";
import { sumarDias } from "@/lib/fechas";

const dia = (fecha: string, llego = 9, tarde = 0, falta = 1) => ({ fecha, llego, tarde, falta });

describe("agrupación del gráfico de asistencia", () => {
  it("hasta 23 días: una barra por día, con % solo donde hubo faltas", () => {
    const { grupos, agrupacion } = agruparConteos([dia("2026-10-26"), dia("2026-10-27", 10, 0, 0)]);
    expect(agrupacion).toBe("dia");
    expect(grupos[0]).toMatchObject({ desde: "2026-10-26", porcentaje: 90, etiquetaFalta: "90 %" });
    expect(grupos[1].etiquetaFalta).toBeUndefined();
  });

  it("más de 23 días: por semana, sumando lunes a viernes", () => {
    const datos = Array.from({ length: MAX_DIAS + 7 }, (_, i) => dia(sumarDias("2026-09-07", i))); // desde un lunes
    const { grupos, agrupacion } = agruparConteos(datos);
    expect(agrupacion).toBe("semana");
    expect(grupos[0]).toMatchObject({ desde: "2026-09-07", llego: 63, falta: 7 });
  });

  it("más de 26 semanas: por mes", () => {
    const datos = Array.from({ length: 200 }, (_, i) => dia(sumarDias("2026-03-02", i)));
    const { grupos, agrupacion } = agruparConteos(datos);
    expect(agrupacion).toBe("mes");
    expect(grupos[0].desde).toBe("2026-03-01");
  });

  it("sin registros, sin porcentaje", () => {
    expect(agruparConteos([dia("2026-10-26", 0, 0, 0)]).grupos[0]).toMatchObject({ porcentaje: null });
  });
});
