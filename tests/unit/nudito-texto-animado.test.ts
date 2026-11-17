import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TextoAnimado } from "@/components/nudito/TextoAnimado";

describe("texto animado de Nudito", () => {
  it("conserva una sola copia de cada palabra en modo incremental", () => {
    const texto = "La célula es la unidad básica de los seres vivos.";
    const html = renderToStaticMarkup(createElement(TextoAnimado, { texto, incremental: true }));
    const contenidoTextual = html.replace(/<[^>]+>/g, "");
    expect(contenidoTextual).toBe(texto);
  });
});
