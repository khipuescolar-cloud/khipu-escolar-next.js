import { describe, expect, it } from "vitest";
import {
  DISCLAIMER, TEXTO_DERIVAR_TUTORA, TEXTO_DESCONOCIDO, accionesChat, conDisclaimer, derivarDesconocido, formatoHora,
  hayNotaPreocupante, noCompara, respuestaAsistencia, respuestaDocumento, respuestaFechas, respuestaNotas, respuestaTareas,
} from "@/lib/server/nudito/respuestas";

const hijos = [{ id: "a1", nombre: "Mateo" }];

describe("disclaimer de IA", () => {
  it("la primera respuesta lo incluye y las siguientes no", () => {
    const r = { texto: "Hola", intencion: "saludo", derivado: false };
    expect(conDisclaimer(r, true).texto).toContain("Soy un asistente con IA. Si no sé algo, te paso con una persona del colegio.");
    expect(conDisclaimer(r, true).texto.startsWith(DISCLAIMER)).toBe(true);
    expect(conDisclaimer(r, false).texto).toBe("Hola");
  });
});

describe("asistencia: solo buenas noticias", () => {
  it("si llegó, dice la hora", () => {
    const r = respuestaAsistencia("Mateo", { estado: "llego", hora: "07:52" }, hijos, "a1");
    expect(r.texto).toBe("Mateo llegó al colegio a las 7:52 a. m.");
    expect(r.derivado).toBe(false);
  });
  it.each(["tarde", "falta", "problema"] as const)("%s → deriva a la tutora con botón de chat", (estado) => {
    const r = respuestaAsistencia("Mateo", { estado, hora: "08:30" }, hijos, "a1");
    expect(r.texto).toBe(TEXTO_DERIVAR_TUTORA);
    expect(r.derivado).toBe(true);
    expect(r.acciones).toEqual([{ tipo: "abrir_chat", etiqueta: "Hablar con la tutora", valor: "/mensajes/nuevo?alumno=a1" }]);
    expect(r.texto).not.toMatch(/tarde|falt|problema/i);
  });
  it("sin registro lo dice sin inventar", () => {
    const r = respuestaAsistencia("Mateo", null, hijos, "a1");
    expect(r.texto).toBe("Todavía no veo el registro de hoy de Mateo.");
    expect(r.derivado).toBe(false);
  });
});

describe("notas", () => {
  it("B, C o menos de 11 son preocupantes", () => {
    expect(hayNotaPreocupante([{ literal: "B", numerico: null }])).toBe(true);
    expect(hayNotaPreocupante([{ literal: "C", numerico: null }])).toBe(true);
    expect(hayNotaPreocupante([{ literal: null, numerico: 10.5 }])).toBe(true);
    expect(hayNotaPreocupante([{ literal: "A", numerico: null }, { literal: "AD", numerico: null }, { literal: null, numerico: 11 }])).toBe(false);
  });
  it("nota baja deriva y no menciona la nota", () => {
    const r = respuestaNotas("Mateo", [{ literal: "A", numerico: null }, { literal: "C", numerico: null }], hijos, "a1");
    expect(r.derivado).toBe(true);
    expect(r.texto).toBe(TEXTO_DERIVAR_TUTORA);
  });
  it("notas buenas remiten a la libreta sin interpretar", () => {
    const r = respuestaNotas("Mateo", [{ literal: "A", numerico: null }], hijos, "a1");
    expect(r.derivado).toBe(false);
    expect(r.acciones?.[0]).toMatchObject({ tipo: "ir", valor: "/libreta?alumno=a1" });
  });
  it("sin notas lo dice", () => {
    expect(respuestaNotas("Mateo", [], hijos, "a1").texto).toContain("Todavía no veo notas");
  });
});

describe("datos reales y sin inventar", () => {
  it("sin tareas lo dice claramente", () => {
    expect(respuestaTareas("Mateo", [], "a1").texto).toBe("No encuentro tareas por entregar registradas para Mateo.");
  });
  it("lista solo las tareas recibidas", () => {
    const r = respuestaTareas("Mateo", [{ titulo: "Fichas", curso: "Matemática", fechaEntrega: new Date("2026-10-29T13:00:00Z") }], "a1");
    expect(r.texto).toContain("Matemática: Fichas");
    expect(r.texto).toContain("1 tarea por entregar");
  });
  it("sin fechas ni documentos lo dice", () => {
    expect(respuestaFechas("Mateo", [], "a1").texto).toContain("No encuentro fechas");
    expect(respuestaDocumento("horario", [], "horario").texto).toContain("Todavía no hay un horario");
  });
  it("elige el documento del reglamento que coincide con la pregunta", () => {
    const docs = [
      { titulo: "Uniforme", contenido: "Buzo del colegio." },
      { titulo: "Justificación de faltas", contenido: "Hasta 48 horas." },
    ];
    expect(respuestaDocumento("reglamento", docs, "como es el uniforme").texto).toBe("Uniforme: Buzo del colegio.");
    expect(respuestaDocumento("reglamento", docs, "reglamento").texto).toContain("Uniforme, Justificación de faltas");
  });
});

describe("reglas de tono", () => {
  it("desconocido deriva con el texto exacto", () => {
    const r = derivarDesconocido(hijos);
    expect(r.texto).toBe(TEXTO_DESCONOCIDO);
    expect(r.texto).toBe("No estoy seguro. Te paso con una persona del colegio.");
    expect(r.derivado).toBe(true);
  });
  it("no compara", () => {
    expect(noCompara("Mateo").texto).toContain("no comparo");
  });
  it("con varios hijos ofrece un chat por hijo", () => {
    expect(accionesChat([{ id: "a", nombre: "A" }, { id: "b", nombre: "B" }])).toHaveLength(2);
  });
  it("formatea horas", () => {
    expect(formatoHora("13:05")).toBe("1:05 p. m.");
    expect(formatoHora("00:10")).toBe("12:10 a. m.");
  });
});
