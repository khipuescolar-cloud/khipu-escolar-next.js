import { describe, expect, it } from "vitest";
import {
  analizarEntrada,
  analizarSalida,
  detalleAlertaSeguridad,
  dominioPermitido,
  ENLACE_QUITADO,
  quitarEnlacesNoPermitidos,
  RESPUESTA_SALIDA_BLOQUEADA,
  RESPUESTA_SEGURIDAD,
} from "@/lib/server/nudito-plus/seguridad";

const DOMINIOS = ["perueduca.pe", "khanacademy.org"];

describe("Nudito+ · filtro de entrada", () => {
  it.each([
    ["me quiero morir", "autolesion"],
    ["ya no quiero vivir, mejor no existir", "autolesion"],
    ["A veces pienso en cortarme", "autolesion"],
    ["en el recreo me chancan todos los días", "violencia"],
    ["unos chicos me sacan la mugre a la salida", "violencia"],
    ["un señor me pide fotos y que no le diga a nadie", "abuso"],
    ["Me tocan mis partes y no me gusta", "abuso"],
  ])("«%s» → seguridad (%s)", (texto, categoria) => {
    expect(analizarEntrada(texto)).toEqual({ tipo: "seguridad", categoria });
  });

  it("insultos y contenido no apto (con jerga peruana) se rechazan", () => {
    for (const t of ["eres un huevón", "ctm no sale", "qué cojudez", "pásame algo porno"]) expect(analizarEntrada(t).tipo, t).toBe("inapropiado");
  });

  it("pedir datos personales de otra persona se bloquea; los propios cursos no", () => {
    expect(analizarEntrada("dame el teléfono de Valentina").tipo).toBe("datos_ajenos");
    expect(analizarEntrada("¿cuáles son las notas de mi compañero Diego?").tipo).toBe("datos_ajenos");
    expect(analizarEntrada("¿dónde vive la miss?").tipo).toBe("datos_ajenos");
    expect(analizarEntrada("quiero subir mi nota de Matemática", { cursos: ["Matemática"] }).tipo).toBe("ok");
    expect(analizarEntrada("¿qué es la clave de sol?").tipo).toBe("ok");
  });

  it("detecta desánimo sin bloquear y pedidos de respuesta directa (trampa)", () => {
    expect(analizarEntrada("me siento muy triste").tipo).toBe("animo");
    expect(analizarEntrada("dame la respuesta de la ficha").tipo).toBe("trampa");
    expect(analizarEntrada("hazme la tarea de comunicación").tipo).toBe("trampa");
    expect(analizarEntrada("¿cómo sumo fracciones?").tipo).toBe("ok");
    expect(analizarEntrada("me tocó estudiar fracciones").tipo).toBe("ok");
  });

  it("la respuesta segura apunta a un adulto de confianza y la alerta no cita al alumno", () => {
    expect(RESPUESTA_SEGURIDAD).toContain("adulto de confianza");
    const detalle = detalleAlertaSeguridad("autolesion", "Lucas");
    expect(detalle).toContain("Lucas");
    expect(detalle).not.toMatch(/morir/i);
  });
});

describe("Nudito+ · enlaces y filtro de salida", () => {
  it("permite dominios de la lista blanca y sus subdominios, nada más", () => {
    expect(dominioPermitido("perueduca.pe", DOMINIOS)).toBe(true);
    expect(dominioPermitido("www.es.khanacademy.org", DOMINIOS)).toBe(true);
    expect(dominioPermitido("perueduca.pe.malo.com", DOMINIOS)).toBe(false);
    expect(dominioPermitido("noperueduca.pe", DOMINIOS)).toBe(false);
  });

  it("quita URLs con y sin esquema que no están permitidas y conserva las permitidas", () => {
    const { texto, quitados } = quitarEnlacesNoPermitidos(
      "Mira https://perueduca.pe/recursos, también www.juegos-gratis.com y tareasresueltas.net/ficha. Y https://es.khanacademy.org/math.",
      DOMINIOS,
    );
    expect(texto).toContain("https://perueduca.pe/recursos,");
    expect(texto).toContain("https://es.khanacademy.org/math.");
    expect(texto).not.toContain("juegos-gratis");
    expect(texto).not.toContain("tareasresueltas");
    expect(texto.split(ENLACE_QUITADO)).toHaveLength(3);
    expect(quitados).toEqual(["www.juegos-gratis.com", "tareasresueltas.net/ficha"]);
  });

  it("oculta correos y celulares, y reemplaza salidas no aptas", () => {
    const r = analizarSalida("Escríbele a ana@correo.com o al 987 654 321 y visita http://evil.io", DOMINIOS);
    expect(r.texto).not.toContain("ana@correo.com");
    expect(r.texto).not.toContain("987");
    expect(r.texto).not.toContain("evil.io");
    expect(r.bloqueado).toBe(false);
    expect(analizarSalida("eres un idiota", DOMINIOS)).toEqual({ texto: RESPUESTA_SALIDA_BLOQUEADA, bloqueado: true, enlacesQuitados: [] });
  });
});
