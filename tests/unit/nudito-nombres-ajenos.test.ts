import { describe, expect, it } from "vitest";
import { decidir, marcarPendiente, nombresAjenos } from "@/lib/server/nudito/intenciones";
import { noEsHijo, rutaChatDe, rutaLibretaDe, accionesChat, respuestaNotas } from "@/lib/server/nudito/respuestas";
import type { Hijo, MensajeHistorial } from "@/lib/server/nudito/tipos";

const mateo: Hijo = { id: "m1", nombres: "Mateo", apellidos: "Quispe Ramos", salonId: "s1" };
const sofia: Hijo = { id: "s2", nombres: "Sofía Lucía", apellidos: "Quispe Ramos", salonId: "s2" };
const excluir = ["Rosa", "Quispe Ramos", "Colegio Nuevo Horizonte"];

describe("nombresAjenos: detector de nombres que no son de los hijos", () => {
  it.each<[string, string[]]>([
    ["¿Qué tareas tiene Pedro?", ["Pedro"]],
    ["qué tareas tiene valentina", ["Valentina"]],
    ["¿Sofía llegó?", ["Sofía"]], // nombre común al inicio de la oración (el apoderado solo tiene a Mateo)
    ["¿cómo van las notas de mi hijo Pepe?", ["Pepe"]],
    ["¿Ya llegó Thiaguito al colegio?", ["Thiaguito"]],
  ])("«%s» → %j (solo Mateo)", (frase, esperado) => {
    expect(nombresAjenos(frase, [mateo], { excluir })).toEqual(esperado);
  });

  it.each([
    "¿Qué tareas tiene Mateo?",
    "¿Qué tareas tiene mateo quispe?",
    "¿Mateo Quispe Ramos ya llegó?",
    "¿Qué tareas hay para el Lunes?",
    "tareas de Matemática y Comunicación",
    "Hola, soy Rosa. ¿Qué tareas hay?",
    "quiero hablar con la miss Lucía",
    "¿Cuándo es la reunión en el Colegio Nuevo Horizonte?",
    "¿Qué Tareas tiene para Mañana?",
    "Buenos días",
  ])("«%s» no tiene nombres ajenos", (frase) => {
    expect(nombresAjenos(frase, [mateo], { excluir })).toEqual([]);
  });

  it("reconoce cualquier nombre de pila y el apellido de los hijos como propios", () => {
    expect(nombresAjenos("¿y Lucía?", [mateo, sofia], { excluir })).toEqual([]);
    expect(nombresAjenos("tareas de los Quispe", [mateo], {})).toEqual([]);
  });
});

describe("decidir: un nombre ajeno nunca se responde con los datos del hijo", () => {
  it("con un solo hijo no responde sobre él si se nombra a otro niño", () => {
    expect(decidir("¿Qué tareas tiene Pedro?", [mateo], [], { excluir })).toEqual({ tipo: "no_es_hijo", nombre: "Pedro", intencion: "tareas_pendientes" });
    expect(decidir("¿Valentina ya llegó?", [mateo], [], { excluir })).toEqual({ tipo: "no_es_hijo", nombre: "Valentina", intencion: "asistencia_hoy" });
  });

  it("también antes de derivar un tema delicado (no ofrece el chat de su hijo como si fuera el otro)", () => {
    expect(decidir("¿Pedro faltó hoy?", [mateo], [], { excluir }).tipo).toBe("no_es_hijo");
  });

  it("si nombra a su hijo, responde normal", () => {
    expect(decidir("¿Qué tareas tiene Mateo?", [mateo], [], { excluir })).toEqual({ tipo: "resolver", intencion: "tareas_pendientes", hijo: mateo });
    expect(decidir("¿qué tareas tiene?", [mateo], [], { excluir })).toEqual({ tipo: "resolver", intencion: "tareas_pendientes", hijo: mateo });
  });

  it("la respuesta a «¿de cuál hijo?» con un nombre que no es suyo también se detecta", () => {
    const hist: MensajeHistorial[] = [{ autor: "nudito", cuerpo: "¿De cuál de tus hijos quieres saber?", intencion: marcarPendiente("tareas_pendientes"), derivado: false }];
    expect(decidir("pepe", [mateo, sofia], hist, { excluir })).toEqual({ tipo: "no_es_hijo", nombre: "Pepe", intencion: "tareas_pendientes" });
    expect(decidir("Mateo", [mateo, sofia], hist, { excluir })).toEqual({ tipo: "resolver", intencion: "tareas_pendientes", hijo: mateo });
  });

  it("horario y reglamento son del colegio: un nombre no cambia la respuesta", () => {
    expect(decidir("¿A qué hora es la salida de Pedro?", [mateo], [], { excluir }).tipo).toBe("resolver");
  });
});

describe("noEsHijo: texto sin revelar si el alumno existe", () => {
  it("ofrece a sus hijos y retoma la pregunta", () => {
    const r = noEsHijo("Pedro", [{ nombre: "Mateo" }, { nombre: "Sofía" }], "tareas_pendientes");
    expect(r.texto).toBe("No encuentro a Pedro entre tus hijos. Puedo ayudarte con Mateo y Sofía.");
    expect(r.intencion).toBe("elegir_hijo:tareas_pendientes");
    expect(r.acciones?.map((a) => a.valor)).toEqual(["Mateo", "Sofía"]);
    expect(r.derivado).toBe(false);
  });
  it("sin hijos vinculados", () => {
    expect(noEsHijo("Pedro", [], null).texto).toBe("No encuentro a Pedro entre tus hijos.");
  });
});

describe("enlaces de Nudito al contexto del hijo correcto", () => {
  it("el chat y la libreta llevan el id del hijo", () => {
    expect(rutaChatDe("a1")).toBe("/mensajes/nuevo?alumno=a1");
    expect(rutaLibretaDe("a1")).toBe("/libreta?alumno=a1");
    expect(accionesChat([{ id: "a1", nombre: "Mateo" }, { id: "a2", nombre: "Sofía" }]).map((a) => a.valor)).toEqual(["/mensajes/nuevo?alumno=a1", "/mensajes/nuevo?alumno=a2"]);
    expect(respuestaNotas("Sofía", [{ literal: "AD", numerico: null }], [], "a2").acciones).toEqual([{ tipo: "ir", etiqueta: "Abrir la libreta", valor: "/libreta?alumno=a2" }]);
  });
});
