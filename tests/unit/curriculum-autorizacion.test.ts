import { describe, expect, it } from "vitest";
import type { TenantContext } from "@/lib/server/tenant";
import type { Rol } from "@/generated/prisma/enums";
import { filtrarVisibles, puedeVerTema, requireLectorCurriculum } from "@/lib/server/curriculum/autorizacion";

const roles: Rol[] = ["direccion", "profesor", "administrativo", "porteria", "apoderado", "alumno"];

describe("visibilidad editorial del currículo", () => {
  it.each(roles)("aplica borrador y revisado al rol %s", (rol) => {
    expect(puedeVerTema(rol, "borrador")).toBe(rol === "profesor" || rol === "direccion");
    expect(puedeVerTema(rol, "revisado")).toBe(rol === "profesor" || rol === "direccion" || rol === "alumno");
  });

  it("excluye los borradores del alumno y marca los del profesor", () => {
    const temas = [{ clave: "a", estadoEditorial: "borrador" as const }, { clave: "b", estadoEditorial: "revisado" as const }];
    expect(filtrarVisibles("alumno", temas)).toEqual([{ tema: temas[1], marcaEditorial: null }]);
    expect(filtrarVisibles("profesor", temas)).toEqual([
      { tema: temas[0], marcaEditorial: "Borrador" },
      { tema: temas[1], marcaEditorial: null },
    ]);
  });

  it("bloquea Nudito en el plan Base", () => {
    const ctx = { rol: "alumno", modulos: new Set(), accesoModulos: { quitadosRol: new Set() } } as unknown as TenantContext;
    expect(() => requireLectorCurriculum(ctx)).toThrow();
  });

  it("deniega valores editoriales desconocidos por defecto", () => {
    expect(puedeVerTema("alumno", "published" as never)).toBe(false);
    expect(filtrarVisibles("profesor", [{ estadoEditorial: "published" as never }])).toEqual([]);
  });
});
