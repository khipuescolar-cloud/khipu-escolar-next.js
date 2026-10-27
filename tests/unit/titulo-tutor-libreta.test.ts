// Título del tutor en la libreta (página y PDF) según el género de su perfil (specs/11).
import { describe, expect, it } from "vitest";
import { tituloProfesor } from "@/lib/roles";

describe("título del tutor en la libreta", () => {
  it("Tutora, Tutor o Tutor(a) según Profile.genero", () => {
    expect(tituloProfesor("femenino", "tutor")).toBe("Tutora");
    expect(tituloProfesor("masculino", "tutor")).toBe("Tutor");
    expect(tituloProfesor("no_especifica", "tutor")).toBe("Tutor(a)");
    expect(tituloProfesor(null, "tutor")).toBe("Tutor(a)");
    expect(tituloProfesor(undefined, "tutor")).toBe("Tutor(a)");
  });
});
