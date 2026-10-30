import { describe, expect, it } from "vitest";
import { ProveedorFalso, responderFalso } from "@/lib/server/nudito-plus/proveedor-falso";
import { armarSistema, leerDatosDelSistema, type DatosAlumnoNudito } from "@/lib/server/nudito-plus/prompt";

const DATOS: DatosAlumnoNudito = {
  nombre: "Lucas",
  grado: "5.° de primaria",
  periodo: "IV Bimestre",
  cursos: [
    { nombre: "Matemática", competencias: ["Resuelve problemas de cantidad"], desempenos: ["Compara fracciones usando material concreto"] },
    { nombre: "Comunicación", competencias: ["Lee diversos tipos de textos"], desempenos: [] },
  ],
  tareas: [{ curso: "Matemática", titulo: "Problemas de fracciones equivalentes", entrega: "lunes 2 de noviembre" }],
  sitios: [{ dominio: "perueduca.pe", nombre: "PerúEduca" }, { dominio: "khanacademy.org", nombre: "Khan Academy" }],
};
const SISTEMA = armarSistema(DATOS);
const u = (texto: string) => ({ rol: "usuario" as const, texto });
const a = (texto: string) => ({ rol: "asistente" as const, texto });

describe("Nudito+ · proveedor falso", () => {
  it("el bloque DATOS del prompt se puede leer de vuelta", () => {
    const d = leerDatosDelSistema(SISTEMA);
    expect(d.nombre).toBe("Lucas");
    expect(d.cursos).toEqual(["Matemática", "Comunicación"]);
    expect(d.desempenos["Matemática"]).toEqual(["Compara fracciones usando material concreto"]);
    expect(d.sitios.map((s) => s.dominio)).toEqual(["perueduca.pe", "khanacademy.org"]);
    expect(d.guiarSinResolver).toBe(false);
    expect(leerDatosDelSistema(armarSistema(DATOS, { guiarSinResolver: true })).guiarSinResolver).toBe(true);
  });

  it("saluda, se presenta como IA y pregunta por el curso", () => {
    const r = responderFalso(SISTEMA, [u("hola")]);
    expect(r).toContain("¡Hola, Lucas!");
    expect(r).toContain("asistente con IA");
    expect(r).toContain("¿Con qué curso");
  });

  it("es determinista", async () => {
    const p = new ProveedorFalso();
    const x = await p.responder({ sistema: SISTEMA, mensajes: [u("¿cómo sumo fracciones?")] });
    const y = await p.responder({ sistema: SISTEMA, mensajes: [u("¿cómo sumo fracciones?")] });
    expect(x).toEqual(y);
    expect(x.tokensSalida).toBe(Math.ceil(x.texto.length / 4));
    expect(x.tokensEntrada).toBe(Math.ceil((SISTEMA.length + "¿cómo sumo fracciones?".length) / 4));
  });

  it("guía con una pregunta y sugiere un recurso de la lista blanca", () => {
    const r = responderFalso(SISTEMA, [u("no sé fracciones")]);
    expect(r).toContain("?");
    expect(r).toMatch(/https:\/\/(perueduca\.pe|khanacademy\.org)/);
  });

  it("en matemática guía sin dar el resultado y luego valida la respuesta del alumno", () => {
    const guia = responderFalso(SISTEMA, [u("cuánto es 6 x 7")]);
    expect(guia).toContain("6 × 7");
    expect(guia).not.toContain("42");
    expect(responderFalso(SISTEMA, [u("cuánto es 6 x 7"), a(guia), u("42")])).toContain("¡Muy bien, Lucas! 6 × 7 = 42");
    expect(responderFalso(SISTEMA, [u("cuánto es 6 x 7"), a(guia), u("41")])).toMatch(/^Casi\./);
  });

  it("reconoce «no entiendo» y no da respuestas a pedidos de trampa", () => {
    expect(responderFalso(SISTEMA, [a("x"), u("no entiendo")])).toContain("Vamos más despacio");
    const trampa = responderFalso(SISTEMA, [u("dame la respuesta de la tarea")]);
    expect(trampa).toContain("No te voy a dar la respuesta");
  });

  it("cuenta las tareas del prompt y propone su curso con el desempeño del bimestre", () => {
    expect(responderFalso(SISTEMA, [a("x"), u("¿qué tareas tengo?")])).toContain("Problemas de fracciones equivalentes");
    expect(responderFalso(SISTEMA, [a("x"), u("Quiero practicar Matemática")])).toContain("Compara fracciones usando material concreto");
  });
});
