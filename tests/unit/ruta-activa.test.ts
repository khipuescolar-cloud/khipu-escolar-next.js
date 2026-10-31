import { describe, expect, it } from "vitest";
import { rutaActiva } from "@/lib/navegacion";

describe("enlace activo de la barra lateral", () => {
  const hrefs = ["/", "/asistencia", "/asistencia/reportes", "/justificaciones"];
  it("marca solo el más específico", () => {
    expect(rutaActiva("/asistencia/reportes", hrefs)).toBe("/asistencia/reportes");
    expect(rutaActiva("/asistencia/reportes/curso/x", hrefs)).toBe("/asistencia/reportes");
    expect(rutaActiva("/asistencia", hrefs)).toBe("/asistencia");
    expect(rutaActiva("/asistencia/justificar", hrefs)).toBe("/asistencia");
  });
  it("«/» solo en la raíz, y nada si no coincide", () => {
    expect(rutaActiva("/", hrefs)).toBe("/");
    expect(rutaActiva("/mensajes", hrefs)).toBeNull();
    expect(rutaActiva("/asistencias", hrefs)).toBeNull();
  });
});
