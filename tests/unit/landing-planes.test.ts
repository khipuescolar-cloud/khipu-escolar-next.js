import { describe, expect, it } from "vitest";
import { armarPlanesPublicos, catalogoDeCodigo, SIN_PRECIO, type FilaCatalogoPublico } from "@/lib/landing-planes";

const fila = (f: Partial<FilaCatalogoPublico> & Pick<FilaCatalogoPublico, "plan">): FilaCatalogoPublico => ({
  nombre: f.plan,
  descripcion: null,
  precioPorAlumno: null,
  precioMinimoMensual: null,
  activo: true,
  orden: 1,
  modulos: [],
  ...f,
});

describe("armarPlanesPublicos (landing)", () => {
  it("muestra solo los planes activos, por orden, con «todo lo de X, más» y los módulos nuevos", () => {
    const planes = armarPlanesPublicos([
      fila({ plan: "promax", nombre: "Pro Max", orden: 3, modulos: ["asistencia", "mensajes", "gestion", "notas", "nudito"] }),
      fila({ plan: "basico", nombre: "Básico", orden: 1, modulos: ["asistencia", "mensajes", "gestion", "soporte", "avisos"] }),
      fila({ plan: "fase2", nombre: "Familia", orden: 2, modulos: ["asistencia", "mensajes", "gestion", "notas"] }),
    ]);
    expect(planes.map((p) => p.nombre)).toEqual(["Básico", "Familia", "Pro Max"]);
    expect(planes[0].incluyeA).toBeNull();
    // soporte y avisos no se listan como función del plan
    expect(planes[0].nuevos.map((m) => m.clave)).toEqual(["asistencia", "mensajes", "gestion"]);
    expect(planes[1].incluyeA).toBe("Básico");
    expect(planes[1].nuevos.map((m) => m.clave)).toEqual(["notas"]);
    expect(planes[2].incluyeA).toBe("Familia");
    expect(planes[2].nuevos.map((m) => m.nombre)).toEqual(["Nudito, el asistente para las familias"]);
  });

  it("oculta los planes inactivos y no dice «todo lo de» si el plan no contiene al anterior", () => {
    const planes = armarPlanesPublicos([
      fila({ plan: "basico", nombre: "Básico", orden: 1, modulos: ["asistencia", "comunicados"] }),
      fila({ plan: "fase2", nombre: "Familia", orden: 2, activo: false }),
      fila({ plan: "promax", nombre: "Pro Max", orden: 3, modulos: ["asistencia", "nudito"] }),
    ]);
    expect(planes.map((p) => p.plan)).toEqual(["basico", "promax"]);
    expect(planes[1].incluyeA).toBeNull();
    expect(planes[1].nuevos.map((m) => m.clave)).toEqual(["asistencia", "gestion", "nudito"]);
  });

  it("muestra el precio en soles si existe y, si no, «Precio según tamaño del colegio»", () => {
    const [con, sin] = armarPlanesPublicos([
      fila({ plan: "basico", orden: 1, precioPorAlumno: 4, precioMinimoMensual: 300 }),
      fila({ plan: "fase2", orden: 2, precioPorAlumno: 0 }),
    ]);
    expect(con.precio).toMatch(/^S\/\s?4\.00 por alumno al mes$/);
    expect(con.minimo).toMatch(/^Mínimo S\/\s?300\.00 al mes$/);
    expect(sin.precio).toBe(SIN_PRECIO);
    expect(sin.minimo).toBeNull();
  });

  it("sin filas en la BD usa los planes del código", () => {
    const planes = armarPlanesPublicos(catalogoDeCodigo());
    expect(planes.map((p) => p.nombre)).toEqual(["Básico", "Familia", "Pro Max"]);
    expect(planes[2].modulos.some((m) => m.clave === "nudito")).toBe(true);
  });
});
