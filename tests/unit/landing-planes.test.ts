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
      fila({ plan: "pro", nombre: "Khipu Pro", orden: 2, modulos: ["asistencia", "mensajes", "gestion", "notas", "tareas"] }),
      fila({ plan: "base", nombre: "Khipu Base", orden: 1, modulos: ["asistencia", "mensajes", "gestion", "soporte", "avisos"] }),
    ]);
    expect(planes.map((p) => p.nombre)).toEqual(["Khipu Base", "Khipu Pro"]);
    expect(planes[0].incluyeA).toBeNull();
    // soporte y avisos no se listan como función del plan
    expect(planes[0].nuevos.map((m) => m.clave)).toEqual(["asistencia", "mensajes", "gestion"]);
    expect(planes[1].incluyeA).toBe("Khipu Base");
    expect(planes[1].nuevos.map((m) => m.clave)).toEqual(["notas", "tareas"]);
  });

  it("oculta los planes inactivos y no dice «todo lo de» si el plan no contiene al anterior", () => {
    expect(armarPlanesPublicos([fila({ plan: "base", orden: 1, activo: false }), fila({ plan: "pro", orden: 2 })]).map((p) => p.plan)).toEqual(["pro"]);
    const planes = armarPlanesPublicos([
      fila({ plan: "base", nombre: "Khipu Base", orden: 1, modulos: ["asistencia", "comunicados"] }),
      fila({ plan: "pro", nombre: "Khipu Pro", orden: 2, modulos: ["asistencia", "notas"] }),
    ]);
    expect(planes[1].incluyeA).toBeNull();
    expect(planes[1].nuevos.map((m) => m.clave)).toEqual(["asistencia", "gestion", "notas"]);
  });

  it("muestra el precio en soles si existe y, si no, «Precio según tamaño del colegio»", () => {
    const [con, sin] = armarPlanesPublicos([
      fila({ plan: "base", orden: 1, precioPorAlumno: 4, precioMinimoMensual: 300 }),
      fila({ plan: "pro", orden: 2, precioPorAlumno: 0 }),
    ]);
    expect(con.precio).toMatch(/^S\/\s?4\.00 por alumno al mes$/);
    expect(con.minimo).toMatch(/^Mínimo S\/\s?300\.00 al mes$/);
    expect(sin.precio).toBe(SIN_PRECIO);
    expect(sin.minimo).toBeNull();
  });

  it("sin filas en la BD usa los planes del código: Khipu Base y Khipu Pro", () => {
    const planes = armarPlanesPublicos(catalogoDeCodigo());
    expect(planes.map((p) => p.nombre)).toEqual(["Khipu Base", "Khipu Pro"]);
    expect(planes[1].incluyeA).toBe("Khipu Base");
    expect(planes[1].nuevos.map((m) => m.clave)).toEqual(["notas", "libreta", "tareas", "agenda", "tablero"]);
  });
});
