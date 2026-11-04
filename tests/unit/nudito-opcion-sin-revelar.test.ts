// Regresión (specs/43): con un error en opción múltiple la retro no revela la opción correcta (el alumno puede reintentar).
import { describe, expect, it } from "vitest";
import { evaluarOpcion } from "@/lib/nudito/evaluadores/opcion";
import { ejercicioPara } from "@/lib/nudito/generadores/registro";
import { temaPorClave } from "@/lib/nudito/catalogo";

describe("opción múltiple sin revelar la respuesta", () => {
  it("la retro de un distractor no nombra la opción correcta", () => {
    const tema = temaPorClave("mat.p5.numeros-decimales");
    expect(tema).toBeTruthy();
    let probados = 0;
    for (let semilla = 1; semilla <= 50; semilla++) {
      const ej = ejercicioPara(tema!, 2, semilla);
      if (ej.publico.tipo !== "opcion_multiple" || ej.solucion.tipo !== "opcion_multiple") continue;
      const sol = ej.solucion;
      const correcta = ej.publico.opciones.find((o) => o.id === sol.correcta)!;
      const mala = ej.publico.opciones.find((o) => o.id !== sol.correcta)!;
      const ev = evaluarOpcion(ej, { respuesta: { tipo: "opcion", opcionId: mala.id } });
      expect(ev.resultado).toBe("incorrecto");
      const sinExplicacion = ev.retro.replace(ej.explicacion, "");
      expect(sinExplicacion).not.toContain(`«${correcta.texto}»`);
      probados++;
    }
    expect(probados).toBeGreaterThan(0);
  });
});
