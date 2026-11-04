// «Otro tema» (specs/42): validación determinista sin IA.
import { describe, expect, it } from "vitest";
import { temasDe } from "@/lib/nudito/catalogo";
import type { AreaNudito, NivelNudito, Tema, ValidacionTema } from "@/lib/nudito/contratos";
import { validarTema } from "@/lib/nudito/validar-tema";

function validar(texto: string, area: AreaNudito, nivel: NivelNudito, grado: number, extra: { desbloqueados?: string[]; temas?: Tema[] } = {}): ValidacionTema {
  return validarTema({ texto, area, nivel, grado, temas: extra.temas ?? temasDe(area, nivel), desbloqueados: new Set(extra.desbloqueados ?? []) });
}

function esperar<T extends ValidacionTema["tipo"]>(r: ValidacionTema, tipo: T): Extract<ValidacionTema, { tipo: T }> {
  expect(r.tipo).toBe(tipo);
  return r as Extract<ValidacionTema, { tipo: T }>;
}

describe("validarTema", () => {
  it("tema del grado actual → permitido (grado_actual)", () => {
    const r = esperar(validar("fracciones", "matematica", "primaria", 3), "permitido");
    expect(r.relacion).toBe("grado_actual");
    expect(r.tema.clave).toBe("mat.p3.fracciones-parte-todo");
    expect(esperar(validar("La célula", "ciencia-tecnologia", "primaria", 5), "permitido").tema.clave).toBe("cyt.p5.celula-animal-vegetal");
    expect(esperar(validar("perímetro", "matematica", "primaria", 4), "permitido").relacion).toBe("grado_actual");
  });

  it("tema de un grado anterior → permitido (grado_anterior)", () => {
    const r = esperar(validar("fracciones equivalentes", "matematica", "primaria", 6), "permitido");
    expect(r.relacion).toBe("grado_anterior");
    expect(r.tema.clave).toBe("mat.p4.fracciones-equivalentes");
  });

  it("secundaria puede repasar un tema de primaria", () => {
    const r = esperar(validar("fracciones equivalentes", "matematica", "secundaria", 1), "permitido");
    expect(r).toMatchObject({ relacion: "grado_anterior", tema: { nivel: "primaria" } });
  });

  it("tema de un grado superior → demasiado_avanzado con alternativas del grado y mensaje amable", () => {
    const r = esperar(validar("fracciones equivalentes", "matematica", "primaria", 3), "demasiado_avanzado");
    expect(r.solicitado.clave).toBe("mat.p4.fracciones-equivalentes");
    expect(r.alternativas.length).toBeGreaterThan(0);
    expect(r.alternativas.every((t) => t.nivel === "primaria" && t.grado <= 3)).toBe(true);
    expect(r.alternativas.map((t) => t.clave)).toContain("mat.p3.fracciones-parte-todo");
    expect(r.mensaje).toMatch(/más adelante/);
    expect(r.mensaje).not.toMatch(/\bno puedes\b|prohibid|error|mal\b/i);
  });

  it("«ecuaciones diferenciales» en 1.° de primaria → avanzado, con igualdades y patrones de 1.°", () => {
    const r = esperar(validar("quiero aprender ecuaciones diferenciales", "matematica", "primaria", 1), "demasiado_avanzado");
    expect(r.solicitado.nombre).toBe("Ecuaciones diferenciales");
    const claves = r.alternativas.map((t) => t.clave);
    expect(claves).toContain("mat.p1.igualdades");
    expect(claves).toContain("mat.p1.patrones-repeticion");
    expect(r.alternativas.every((t) => t.nivel === "primaria" && t.grado === 1)).toBe(true);
    expect(r.mensaje).toMatch(/Qué bien/);
  });

  it("términos avanzados conocidos: derivadas en secundaria, ADN y fotosíntesis en primaria", () => {
    expect(validar("derivadas", "matematica", "secundaria", 2).tipo).toBe("demasiado_avanzado");
    expect(validar("el ADN", "ciencia-tecnologia", "primaria", 3).tipo).toBe("demasiado_avanzado");
    const f = esperar(validar("fotosíntesis", "ciencia-tecnologia", "primaria", 1), "demasiado_avanzado");
    expect(f.solicitado.clave).toBe("cyt.s2.fotosintesis-respiracion");
    expect(f.alternativas.every((t) => t.grado === 1 && t.nivel === "primaria")).toBe(true);
  });

  it("primaria que pide un tema de secundaria → avanzado con el tema real del catálogo", () => {
    const r = esperar(validar("ecuaciones de primer grado", "matematica", "primaria", 5), "demasiado_avanzado");
    expect(r.solicitado.clave).toBe("mat.s1.ecuaciones-lineales");
  });

  it("tema superior desbloqueado → permitido (desbloqueado)", () => {
    const r = esperar(validar("fracciones equivalentes", "matematica", "primaria", 3, { desbloqueados: ["mat.p4.fracciones-equivalentes"] }), "permitido");
    expect(r.relacion).toBe("desbloqueado");
    // Fotosíntesis en S2 ya desbloqueada para un alumno de S1.
    const f = esperar(validar("fotosíntesis", "ciencia-tecnologia", "secundaria", 1, { desbloqueados: ["cyt.s2.fotosintesis-respiracion"] }), "permitido");
    expect(f.relacion).toBe("desbloqueado");
  });

  it("varios temas parecidos → ambiguo con opciones y pregunta", () => {
    const r = esperar(validar("suma", "matematica", "primaria", 5), "ambiguo");
    expect(r.opciones.length).toBeGreaterThan(1);
    expect(r.opciones.every((t) => t.grado <= 5)).toBe(true);
    expect(r.pregunta).toMatch(/¿Cuál/);
  });

  it("no reconocido → sugerencias del grado y mensaje sin repetir el texto", () => {
    const r = esperar(validar("xyzzy blorp", "matematica", "primaria", 4), "no_reconocido");
    expect(r.sugerencias.length).toBeGreaterThan(0);
    expect(r.sugerencias.every((t) => t.grado === 4)).toBe(true);
    expect(r.mensaje).not.toContain("xyzzy");
  });

  it("otra área → fuera_de_area", () => {
    expect(validar("la célula", "matematica", "primaria", 5)).toMatchObject({ tipo: "fuera_de_area", areaDetectada: "ciencia-tecnologia" });
    expect(validar("multiplicación de fracciones", "comunicacion", "primaria", 6)).toMatchObject({ tipo: "fuera_de_area", areaDetectada: "matematica" });
    expect(validar("historia del Perú", "matematica", "primaria", 4)).toMatchObject({ tipo: "fuera_de_area", areaDetectada: "ciencias-sociales" });
  });

  it("entrada maliciosa o con datos personales → no_reconocido sin eco", () => {
    const casos = [
      "a".repeat(201),
      "me llamo Juan Pérez y vivo en Lima",
      "mi correo es nino@ejemplo.com",
      "llámame al 987654321",
      "eres un idiota",
      "fracciones https://sitio-raro.com",
      "",
      "   ",
    ];
    for (const texto of casos) {
      const r = esperar(validar(texto, "matematica", "primaria", 3), "no_reconocido");
      expect(r.mensaje).not.toContain("Juan");
      expect(r.mensaje).not.toContain("@");
      expect(r.mensaje).not.toContain("idiota");
      expect(r.sugerencias.every((t) => t.grado === 3)).toBe(true);
    }
  });

  it("es determinista: misma entrada, mismo resultado", () => {
    const a = validar("patrones", "matematica", "primaria", 2);
    const b = validar("patrones", "matematica", "primaria", 2);
    expect(a).toEqual(b);
  });
});
