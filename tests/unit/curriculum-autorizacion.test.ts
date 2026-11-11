import { describe, expect, it } from "vitest";
import type { TenantContext } from "@/lib/server/tenant";
import type { Rol } from "@/generated/prisma/enums";
import { filtrarVisibles, puedeVerTema, requireLectorCurriculum, requiereNuevaRevision } from "@/lib/server/curriculum/autorizacion";

const roles: Rol[] = ["direccion", "profesor", "administrativo", "porteria", "apoderado", "alumno"];

describe("visibilidad editorial del currículo", () => {
  it.each(roles)("aplica borrador y revisado al rol %s", (rol) => {
    expect(puedeVerTema(rol, "borrador", null, "a")).toBe(rol === "profesor" || rol === "direccion");
    expect(puedeVerTema(rol, "revisado", "a", "a")).toBe(rol === "profesor" || rol === "direccion" || rol === "alumno");
    expect(puedeVerTema(rol, "publicado", "a", "a")).toBe(rol === "profesor" || rol === "direccion" || rol === "alumno");
  });

  it("excluye los borradores del alumno y marca los del profesor", () => {
    const temas = [
      { clave: "a", estado: "borrador" as const, huellaContenidoRevisado: null, huellaActual: "a" },
      { clave: "b", estado: "revisado" as const, huellaContenidoRevisado: "b", huellaActual: "b" },
    ];
    expect(filtrarVisibles("alumno", temas)).toEqual([{ tema: temas[1], marcaEditorial: null }]);
    expect(filtrarVisibles("profesor", temas)).toEqual([
      { tema: temas[0], marcaEditorial: "Borrador" },
      { tema: temas[1], marcaEditorial: null },
    ]);
  });

  it("oculta al alumno versiones nuevas y marca la revisión vencida al profesor", () => {
    const tema = { estado: "publicado" as const, huellaContenidoRevisado: "anterior", huellaActual: "nueva" };
    expect(requiereNuevaRevision(tema)).toBe(true);
    expect(filtrarVisibles("alumno", [tema])).toEqual([]);
    expect(filtrarVisibles("profesor", [tema])[0]?.marcaEditorial).toBe("Revisar de nuevo");
  });

  it("bloquea Nudito en el plan Base", () => {
    const ctx = { rol: "alumno", modulos: new Set(), accesoModulos: { quitadosRol: new Set() } } as unknown as TenantContext;
    expect(() => requireLectorCurriculum(ctx)).toThrow();
  });

  it("deniega valores editoriales desconocidos por defecto", () => {
    expect(puedeVerTema("alumno", "published" as never, null, null)).toBe(false);
    expect(filtrarVisibles("profesor", [{ estado: "published" as never, huellaContenidoRevisado: null, huellaActual: null }])).toEqual([]);
  });
});
