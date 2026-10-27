import { describe, expect, it } from "vitest";
import { leerAcciones } from "@/lib/server/nudito/acciones";

describe("botones guardados de Nudito", () => {
  it("lee las acciones válidas", () => {
    const acciones = [{ tipo: "abrir_chat", etiqueta: "Escribir a la tutora", valor: "/mensajes/nuevo?alumno=1" }];
    expect(leerAcciones(acciones)).toEqual(acciones);
  });
  it("ignora null, formatos raros y tipos desconocidos", () => {
    expect(leerAcciones(null)).toEqual([]);
    expect(leerAcciones("hola")).toEqual([]);
    expect(leerAcciones([{ tipo: "otro", etiqueta: "x", valor: "y" }])).toEqual([]);
  });
});
