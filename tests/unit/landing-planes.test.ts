import { describe, expect, it } from "vitest";
import { armarPlanesPublicos, catalogoDeCodigo, DETALLE_SIN_PRECIO, PUBLICAR_PRECIOS, SIN_PRECIO, type FilaCatalogoPublico } from "@/lib/landing-planes";

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
    expect(planes[1].nuevos.map((m) => m.clave)).toEqual(["notas", "tareas", "nudito_plus"]);
  });

  it("oculta los planes inactivos y no dice «todo lo de» si el plan no contiene al anterior", () => {
    expect(armarPlanesPublicos([fila({ plan: "base", orden: 1, activo: false }), fila({ plan: "pro", orden: 2 })]).map((p) => p.plan)).toEqual(["pro"]);
    const planes = armarPlanesPublicos([
      fila({ plan: "base", nombre: "Khipu Base", orden: 1, modulos: ["asistencia", "comunicados"] }),
      fila({ plan: "pro", nombre: "Khipu Pro", orden: 2, modulos: ["asistencia", "notas"] }),
    ]);
    expect(planes[1].incluyeA).toBeNull();
    expect(planes[1].nuevos.map((m) => m.clave)).toEqual(["asistencia", "gestion", "notas", "nudito_plus"]);
  });

  const conMontos = () => [fila({ plan: "base", orden: 1, precioPorAlumno: 4, precioMinimoMensual: 300 }), fila({ plan: "pro", orden: 2, precioPorAlumno: 0 })];

  it("no publica tarifas (PUBLICAR_PRECIOS apagado): siempre el texto sin montos, aunque el catálogo tenga precios", () => {
    expect(PUBLICAR_PRECIOS).toBe(false);
    for (const p of armarPlanesPublicos(conMontos())) {
      expect(p.precio).toBe(SIN_PRECIO);
      expect(p.minimo).toBe(DETALLE_SIN_PRECIO);
      expect(`${p.precio} ${p.minimo}`).not.toMatch(/S\/|soles|al mes/);
    }
    expect(SIN_PRECIO).toBe("Precio por alumno activo, según rango de tamaño del colegio");
    expect(DETALLE_SIN_PRECIO).toBe("Implementación incluida. Cotización a medida para más de 1.000 alumnos o varias sedes.");
  });

  it("si algún día se publican precios, muestra el monto en soles y, sin monto, el texto sin precio", () => {
    const [con, sin] = armarPlanesPublicos(conMontos(), true);
    expect(con.precio).toMatch(/^S\/\s?4\.00 por alumno al mes$/);
    expect(con.minimo).toMatch(/^Mínimo S\/\s?300\.00 al mes$/);
    expect(sin.precio).toBe(SIN_PRECIO);
    expect(sin.minimo).toBe(DETALLE_SIN_PRECIO);
  });

  it("sin filas en la BD usa los planes del código: Khipu Base y Khipu Pro", () => {
    const planes = armarPlanesPublicos(catalogoDeCodigo());
    expect(planes.map((p) => p.nombre)).toEqual(["Khipu Base", "Khipu Pro"]);
    expect(planes[1].incluyeA).toBe("Khipu Base");
    expect(planes[1].nuevos.map((m) => m.clave)).toEqual(["notas", "libreta", "tareas", "agenda", "tablero", "documentos", "reuniones", "nudito_plus"]);
  });

  it("nombra los módulos con su nombre público: Base = gestión, asistencia y comunicación; Pro suma lo académico y Nudito (sin precio aparte)", () => {
    const [base, pro] = armarPlanesPublicos(catalogoDeCodigo());
    expect(base.modulos.map((m) => m.clave)).toEqual(["asistencia", "porteria", "justificaciones", "mensajes", "comunicados", "gestion", "horario"]);
    expect(base.modulos.map((m) => m.nombre)).toEqual(
      expect.arrayContaining([
        "Asistencia de ingreso y por clase, con tardanzas, aviso a la familia y reportes en PDF y Excel",
        "Portería con carnet QR",
        "Mensajería familia–profesor",
        "Gestión institucional: personal, salones, alumnos y familias",
        "Horario semanal por salón",
      ]),
    );
    expect(pro.nuevos.map((m) => m.nombre)).toEqual(
      expect.arrayContaining([
        "Evaluaciones por competencias, capacidades, desempeños y criterios (CNEB)",
        "Libretas por periodo en PDF",
        "Tablero de dirección y reportes académicos",
        "Reuniones con confirmación y acta",
      ]),
    );
    // Nudito es el tutor de práctica incluido en Khipu Pro (specs/44): figura sin precio ni pago de familias.
    expect(pro.modulos.map((m) => m.nombre)).toContain("Nudito, tutor de práctica");
    expect(pro.modulos.map((m) => m.nombre).join(" ")).not.toMatch(/Nudito\+|Yape|familia paga/i);
    expect(base.modulos.map((m) => m.clave)).not.toContain("nudito_plus");
  });
});
