import { describe, expect, it } from "vitest";
import { clavesDeVersion, clavesDisponibles, planCompleto } from "@/lib/nudito/plan-publicado-reglas";
import { mapearEstadoProgreso } from "@/lib/nudito/leccion";

describe("reglas del plan publicado de Nudito", () => {
  const foto = Array.from({ length: 13 }, (_, i) => ({ temaClave: "mat.p5.tema-" + i, orden: i }));
  const lecciones = foto.map(t => ({ temaClave: t.temaClave, version: 1 }));
  it("13: los trece temas publicados están disponibles desde el inicio", () => {
    expect(clavesDisponibles(foto, lecciones)).toHaveLength(13);
  });
  it("14: las fechas semanales no intervienen en la disponibilidad", () => {
    const conFechas = foto.map((t,i) => ({ ...t, semana: i+1, fecha: "2027-12-01" }));
    expect(clavesDisponibles(conFechas, lecciones)).toEqual(clavesDisponibles(foto, lecciones));
  });
  it("15: al dominar todos, el plan sigue completo a mitad de año", () => {
    expect(planCompleto(foto.map(() => "dominado"))).toBe(true);
    expect(planCompleto([])).toBe(false);
  });
  it("16: intersecta con lecciones publicadas y respeta el orden de la foto", () => {
    expect(clavesDisponibles(foto, lecciones.slice(0,2))).toEqual(foto.slice(0,2).map(t => t.temaClave));
    expect(clavesDeVersion([...foto, foto[0]])).toHaveLength(13);
  });
  it("mapea los estados sin convertir abrir tema en dominio", () => {
    expect([null, "no_iniciado", "en_progreso", "en_comprobacion", "reforzar", "dominado"].map(x => mapearEstadoProgreso(x as never)))
      .toEqual(["pendiente", "pendiente", "en_progreso", "en_progreso", "necesita_refuerzo", "dominado"]);
  });
});
