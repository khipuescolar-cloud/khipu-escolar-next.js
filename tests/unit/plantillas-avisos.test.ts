import { describe, expect, it } from "vitest";
import { NOMBRES_PLANTILLA, PlantillaInvalidaError, renderizarPlantilla } from "@/lib/server/email/plantillas";

const colegio = "I.E.P. Nuevo Horizonte";
// Pictogramas emoji (no incluye símbolos tipográficos como ✓ o ✕).
const EMOJI = /\p{Extended_Pictographic}️|[\u{1F300}-\u{1FAFF}]/u;

describe("plantillas de avisos: textos exactos de la spec 06", () => {
  it("llegó: «Mateo llegó al colegio a las 7:52 a. m.»", () => {
    const m = renderizarPlantilla("asistencia_llego", { colegio, alumno: "Mateo", hora: "07:52" });
    expect(m.texto).toContain("Mateo llegó al colegio a las 7:52 a. m.");
    expect(m.html).toContain("Mateo llegó al colegio a las 7:52 a. m.");
    expect(m.texto).toContain("[Llegó]");
  });

  it("tarde: texto con la hora entre paréntesis e invitación a escribir a la tutora", () => {
    const m = renderizarPlantilla("asistencia_tarde", { colegio, alumno: "Lucía", hora: "08:15" });
    expect(m.texto).toContain("Lucía llegó tarde hoy (8:15 a. m.). Si tienes dudas, escríbele a su tutora.");
    expect(m.texto).toContain("[Tarde]");
  });

  it("falta: texto exacto y botón «Justificar falta» con el enlace del token", () => {
    const url = "http://lvh.me:3001/justificar/abc";
    const m = renderizarPlantilla("asistencia_falta", { colegio, alumno: "Mateo", urlJustificar: url });
    expect(m.texto).toContain("Mateo no llegó hoy a la 1.ª hora. Si ya lo sabías, puedes justificar la falta.");
    expect(m.texto).toContain(`Justificar falta: ${url}`);
    expect(m.html).toMatch(new RegExp(`<a href="${url}"[^>]*>Justificar falta</a>`));
    expect(m.texto).toContain("[Falta]");
  });

  it("las malas noticias no llevan emojis", () => {
    for (const [nombre, payload] of [
      ["asistencia_falta", { colegio, alumno: "Mateo", urlJustificar: "http://x/y" }],
      ["asistencia_tarde", { colegio, alumno: "Mateo", hora: "08:15" }],
      ["asistencia_problema", { colegio, alumno: "Mateo", hora: "10:00", nota: "Se golpeó la rodilla en el recreo." }],
      ["justificacion_revisada", { colegio, alumno: "Mateo", fecha: "2026-10-26", estado: "rechazada" }],
    ] as const) {
      const m = renderizarPlantilla(nombre, payload);
      expect(EMOJI.test(m.texto + m.html + m.asunto), nombre).toBe(false);
    }
  });

  it("problema: tono serio e invita a escribir a la tutora", () => {
    const m = renderizarPlantilla("asistencia_problema", { colegio, alumno: "Mateo", hora: "10:05", nota: "Se sintió mal.", urlMensajes: "http://x/mensajes" });
    expect(m.texto).toContain("Por favor, escríbele a su tutora para conversarlo.");
    expect(m.texto).toContain("Detalle: Se sintió mal.");
    expect(m.texto).toContain("Escribir a la tutora: http://x/mensajes");
  });

  it("firma el colegio y agrega el enlace para ajustar avisos", () => {
    const m = renderizarPlantilla("asistencia_llego", { colegio, alumno: "Mateo", hora: "07:52", urlPreferencias: "http://p" });
    expect(m.texto.startsWith(colegio)).toBe(true);
    expect(m.texto).toContain("Ajustar mis avisos: http://p");
  });

  it("comunicado: el botón y el push llevan al comunicado concreto y menciona los adjuntos", () => {
    const url = "http://nh.lvh.me:3000/comunicados#comunicado-123";
    const m = renderizarPlantilla("comunicado", { colegio, titulo: "Reunión", url, adjuntos: 2 });
    expect(m.texto).toContain("Incluye 2 archivos adjuntos.");
    expect(m.texto).toContain(`Leer comunicado: ${url}`);
    expect(m.push.url).toBe(url);
    expect(renderizarPlantilla("comunicado", { colegio, titulo: "Reunión", url }).texto).not.toContain("adjunto");
  });

  it("escapa el HTML de los datos", () => {
    const m = renderizarPlantilla("comunicado", { colegio, titulo: "<script>x</script>", url: "http://c" });
    expect(m.html).not.toContain("<script>x</script>");
    expect(m.html).toContain("&lt;script&gt;");
  });

  it("renderiza todas las plantillas del contrato con su payload mínimo", () => {
    const payloads: Record<string, unknown> = {
      asistencia_llego: { colegio, alumno: "Mateo", hora: "07:52" },
      asistencia_tarde: { colegio, alumno: "Mateo", hora: "08:15" },
      asistencia_falta: { colegio, alumno: "Mateo" },
      asistencia_problema: { colegio, alumno: "Mateo", hora: "09:00" },
      resumen_llegadas: { colegio, llegadas: [{ alumno: "Mateo", hora: "07:52" }, { alumno: "Ana", hora: "07:40" }] },
      mensaje_nuevo: { colegio, remitente: "Lucía García", alumno: "Mateo", url: "http://m" },
      comunicado: { colegio, titulo: "Reunión de padres", url: "http://c" },
      invitacion: { colegio, nombre: "Rosa", rol: "Familia", url: "http://i" },
      bienvenida: { colegio, nombre: "Carmen", rol: "Dirección", email: "c@x.pe", documento: "DNI", url: "http://i", dominio: "x.khipu" },
      justificacion_revisada: { colegio, alumno: "Mateo", fecha: "2026-10-26", estado: "aceptada" },
      justificacion_recibida: { colegio, alumno: "Mateo", fecha: "2026-10-26", url: "http://j" },
      tarea_nueva: { colegio, curso: "Matemática", titulo: "Fichas de fracciones", fechaEntrega: "2026-10-30", url: "http://t" },
      libreta_publicada: { colegio, alumno: "Mateo", periodo: "III Bimestre 2026", url: "http://l" },
      alerta_rebote: { colegio, apoderado: "Rosa Quispe", alumnos: ["Mateo"], motivo: "su correo rebotó", url: "http://a" },
      soporte_inicio: { colegio, hasta: "15:30", motivo: "Revisar la asistencia", url: "http://s" },
    };
    for (const nombre of NOMBRES_PLANTILLA) {
      const m = renderizarPlantilla(nombre, payloads[nombre]);
      expect(m.asunto.length, nombre).toBeGreaterThan(0);
      expect(m.push.cuerpo.length, nombre).toBeGreaterThan(0);
    }
    expect(renderizarPlantilla("resumen_llegadas", payloads.resumen_llegadas).texto).toContain("Ana llegó al colegio a las 7:40 a. m.");
    expect(renderizarPlantilla("mensaje_nuevo", payloads.mensaje_nuevo).texto).toContain("Lucía García te escribió sobre Mateo.");
    expect(renderizarPlantilla("justificacion_revisada", payloads.justificacion_revisada).texto).toContain("del 26/10/2026");
  });

  it("tarea nueva: texto corto con el hijo, el curso y la fecha de entrega", () => {
    const p = { colegio, alumno: "Mateo", curso: "Matemática", titulo: "Fichas de fracciones", fechaEntrega: "2026-10-30", url: "http://t" };
    const m = renderizarPlantilla("tarea_nueva", { ...p, urlPreferencias: "http://p" });
    expect(m.asunto).toBe("Nueva tarea de Matemática");
    expect(m.texto).toContain("Mateo tiene una tarea nueva de Matemática: «Fichas de fracciones».");
    expect(m.texto).toContain("Se entrega el 30/10/2026.");
    expect(m.texto).toContain("Ver tareas: http://t");
    expect(m.texto).toContain("Ajustar mis avisos: http://p");
    expect(renderizarPlantilla("tarea_nueva", { ...p, alumno: undefined }).texto).toContain("Hay una tarea nueva de Matemática");
    expect(() => renderizarPlantilla("tarea_nueva", { ...p, fechaEntrega: "30/10/2026" })).toThrow(PlantillaInvalidaError);
  });

  it("libreta publicada: texto breve, firma del colegio y botón «Ver libreta»", () => {
    const p = { colegio, alumno: "Mateo", periodo: "III Bimestre 2026", url: "http://l" };
    const m = renderizarPlantilla("libreta_publicada", p);
    expect(m.asunto).toBe("La libreta de III Bimestre 2026 ya está disponible");
    expect(m.texto.startsWith(colegio)).toBe(true);
    expect(m.texto).toContain("La libreta de Mateo de III Bimestre 2026 ya está disponible.");
    expect(m.texto).toContain("Ver libreta: http://l");
    expect(renderizarPlantilla("libreta_publicada", { ...p, alumno: undefined }).texto).toContain("La libreta de III Bimestre 2026 ya está disponible.");
    expect(() => renderizarPlantilla("libreta_publicada", { colegio, url: "http://l" })).toThrow(PlantillaInvalidaError);
  });

  it("alerta de rebote a dirección: nombra a la familia, el motivo y no lleva emojis", () => {
    const m = renderizarPlantilla("alerta_rebote", { colegio, apoderado: "Rosa Quispe", alumnos: ["Mateo", "Ana"], motivo: "su correo rebotó", url: "http://a" });
    expect(m.asunto).toBe("Correo desactivado: Rosa Quispe");
    expect(m.texto).toContain("Dejamos de enviar avisos por correo a Rosa Quispe (familia de Mateo, Ana) porque su correo rebotó.");
    expect(m.texto).toContain("[Correo desactivado]");
    expect(EMOJI.test(m.texto + m.html + m.asunto)).toBe(false);
  });

  it("inicio de soporte a dirección: hora de fin, motivo, botón a la auditoría y sin emojis", () => {
    const m = renderizarPlantilla("soporte_inicio", { colegio, hasta: "15:30", motivo: "Revisar la asistencia", url: "http://s/configuracion/auditoria" });
    expect(m.texto).toContain("El equipo de Khipu Escolar entró a tu colegio en modo soporte (solo lectura) hasta las 15:30.");
    expect(m.texto).toContain("Motivo: Revisar la asistencia");
    expect(m.texto).toContain("Ver auditoría: http://s/configuracion/auditoria");
    expect(EMOJI.test(m.texto + m.html + m.asunto)).toBe(false);
    expect(() => renderizarPlantilla("soporte_inicio", { colegio, hasta: "3pm", motivo: "x", url: "http://s" })).toThrow(PlantillaInvalidaError);
  });

  it("rechaza plantillas desconocidas y payloads inválidos", () => {
    expect(() => renderizarPlantilla("no_existe", {})).toThrow(PlantillaInvalidaError);
    expect(() => renderizarPlantilla("asistencia_llego", { colegio, alumno: "Mateo" })).toThrow(PlantillaInvalidaError);
  });
});
