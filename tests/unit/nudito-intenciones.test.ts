import { describe, expect, it } from "vitest";
import { decidir, detectarIntencion, esTemaDelicado, hijosMencionados, marcarPendiente } from "@/lib/server/nudito/intenciones";
import { normalizar } from "@/lib/server/nudito/normalizar";
import type { Hijo, MensajeHistorial } from "@/lib/server/nudito/tipos";

const mateo: Hijo = { id: "m1", nombres: "Mateo", salonId: "s1" };
const sofia: Hijo = { id: "s2", nombres: "Sofía Lucía", salonId: "s2" };

describe("normalizar", () => {
  it("quita tildes, signos y mayúsculas, y aplica sinónimos", () => {
    expect(normalizar("¿Qué TAREAS tiene Mateo?")).toBe("que tareas tiene mateo");
    expect(normalizar("¿Hay deberes?")).toBe("hay tareas");
    expect(normalizar("Habla con la  profe")).toBe("habla con la profesor");
  });
});

describe("detectarIntencion: tabla de frases", () => {
  const tabla: [string, string][] = [
    ["Hola", "saludo"],
    ["buenas tardes", "saludo"],
    ["gracias", "saludo"],
    ["¿Qué puedes hacer?", "ayuda"],
    ["ayuda", "ayuda"],
    ["¿qué tareas tiene Mateo?", "tareas_pendientes"],
    ["tiene deberes para mañana?", "tareas_pendientes"],
    ["¿qué pendientes hay?", "tareas_pendientes"],
    ["¿cuándo es el examen?", "proximas_fechas"],
    ["próximas fechas", "proximas_fechas"],
    ["¿hay reunión de padres?", "proximas_fechas"],
    ["¿Mateo ya llegó al colegio?", "asistencia_hoy"],
    ["¿vino hoy Mateo? asistencia", "asistencia_hoy"],
    ["¿cómo van sus notas?", "notas"],
    ["quiero ver la libreta", "notas"],
    ["¿a qué hora es la salida?", "horario"],
    ["horario de ingreso", "horario"],
    ["¿cómo es el uniforme?", "reglamento"],
    ["¿cómo justifico una inasistencia?", "reglamento"],
    ["quiero hablar con una persona", "hablar_con_persona"],
    ["necesito hablar con la tutora", "hablar_con_persona"],
    ["blablabla xyz", "desconocido"],
    ["", "desconocido"],
  ];
  it.each(tabla)("«%s» → %s", (frase, esperada) => {
    expect(detectarIntencion(frase)).toBe(esperada);
  });
});

describe("temas delicados", () => {
  it.each(["¿Mateo faltó ayer?", "llegó tarde?", "tiene algún problema", "¿lo desaprobaron?", "tiene nota baja", "¿tuvo tardanza?"])(
    "«%s» es delicado",
    (f) => expect(esTemaDelicado(f)).toBe(true),
  );
  it.each(["¿qué falta por entregar en tareas?", "buenas tardes", "¿qué tareas tiene?", "tareas de problemas de matemática"])(
    "«%s» no es delicado",
    (f) => expect(esTemaDelicado(f)).toBe(false),
  );

  it("las malas noticias siempre derivan, aunque haya un solo hijo", () => {
    for (const f of ["¿Mateo faltó ayer?", "¿llegó tarde hoy?", "¿tiene algún problema?", "¿tuvo falta?", "¿sacó nota baja?"]) {
      expect(decidir(f, [mateo], []).tipo, f).toBe("delicado");
    }
  });
});

describe("elección de hijo", () => {
  it("con un solo hijo no pregunta", () => {
    expect(decidir("¿qué tareas tiene?", [mateo], [])).toEqual({ tipo: "resolver", intencion: "tareas_pendientes", hijo: mateo });
  });
  it("con varios hijos y sin nombre pregunta cuál", () => {
    expect(decidir("¿qué tareas tienen?", [mateo, sofia], [])).toEqual({ tipo: "preguntar_hijo", intencion: "tareas_pendientes" });
  });
  it("con varios hijos y nombre usa ese hijo", () => {
    expect(decidir("¿qué tareas tiene Sofía?", [mateo, sofia], [])).toEqual({ tipo: "resolver", intencion: "tareas_pendientes", hijo: sofia });
  });
  it("retoma la intención pendiente cuando responde solo el nombre", () => {
    const hist: MensajeHistorial[] = [
      { autor: "usuario", cuerpo: "¿qué tareas tienen?", intencion: "tareas_pendientes", derivado: false },
      { autor: "nudito", cuerpo: "¿De cuál?", intencion: marcarPendiente("tareas_pendientes"), derivado: false },
    ];
    expect(decidir("Mateo", [mateo, sofia], hist)).toEqual({ tipo: "resolver", intencion: "tareas_pendientes", hijo: mateo });
  });
  it("hijosMencionados reconoce cualquier nombre de pila", () => {
    expect(hijosMencionados("y lucia?", [mateo, sofia])).toEqual([sofia]);
  });
  it("no compara alumnos", () => {
    expect(decidir("¿Mateo es mejor que Sofía?", [mateo, sofia], []).tipo).toBe("comparar");
    expect(decidir("¿en qué puesto está?", [mateo], []).tipo).toBe("comparar");
  });
});
