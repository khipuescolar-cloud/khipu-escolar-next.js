import { describe, expect, it } from "vitest";
import { aCsv } from "@/lib/csv";
import { slugDesdeHost } from "@/lib/dominio";
import { errorDeSlug, LARGO_MAX_SLUG, sugerirSlug } from "@/lib/slug-colegio";

describe("sugerirSlug", () => {
  it("quita tildes, puntos y palabras vacías", () => {
    expect(sugerirSlug("I.E.P. San José de Jesús")).toBe("san-jose-jesus");
    expect(sugerirSlug("Colegio Nuevo Horizonte")).toBe("colegio-nuevo-horizonte");
    expect(sugerirSlug("Academia Ñandú 2026")).toBe("academia-nandu-2026");
  });

  it("si solo hay palabras vacías, las conserva", () => {
    expect(sugerirSlug("De La")).toBe("de-la");
  });

  it("no sugiere subdominios reservados", () => {
    expect(sugerirSlug("Admin")).toBe("admin-colegio");
    expect(sugerirSlug("WWW")).toBe("www-colegio");
  });

  it("recorta nombres largos sin dejar una palabra a medias ni guion final", () => {
    const s = sugerirSlug("Institución Educativa Particular Santa María Reina de los Ángeles del Perú");
    expect(s.length).toBeLessThanOrEqual(LARGO_MAX_SLUG);
    expect(s.endsWith("-")).toBe(false);
    expect(errorDeSlug(s)).toBeNull();
  });

  it("vacío → vacío", () => {
    expect(sugerirSlug("  ")).toBe("");
  });
});

describe("errorDeSlug", () => {
  it("acepta minúsculas, números y guiones", () => {
    expect(errorDeSlug("san-jose-2")).toBeNull();
  });

  it.each([
    ["ab", "al menos 3"],
    ["San-Jose", "minúsculas"],
    ["san_jose", "minúsculas"],
    ["san.jose", "minúsculas"],
    ["-sanjose", "guion"],
    ["sanjose-", "guion"],
    ["san--jose", "guion"],
    ["admin", "reservada"],
    ["www", "reservada"],
    ["api", "reservada"],
    ["app", "reservada"],
    ["a".repeat(LARGO_MAX_SLUG + 1), "hasta"],
  ])("rechaza «%s»", (slug, mensaje) => {
    expect(errorDeSlug(slug)).toContain(mensaje);
  });

  it("todo slug válido se resuelve desde el host", () => {
    expect(slugDesdeHost("san-jose-2.lvh.me:3000", "lvh.me:3000")).toBe("san-jose-2");
    expect(slugDesdeHost("admin.lvh.me:3000", "lvh.me:3000")).toBeNull();
  });
});

describe("aCsv", () => {
  it("escapa comas, comillas y saltos, y neutraliza fórmulas", () => {
    const csv = aCsv(["a", "b"], [["x,y", 'di "hola"'], ["=1+1", null]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"x,y","di ""hola"""');
    expect(csv).toContain("'=1+1,");
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});
