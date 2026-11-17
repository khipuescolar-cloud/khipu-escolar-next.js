import { describe, expect, it } from "vitest";
import { contraste, lintClase, lintSvg, type Ficha } from "../../scripts/nudito-lint-clase-guiada";

const svgBueno = '<svg viewBox="0 0 640 480"><title>t</title><text x="320" y="50" font-size="30" fill="#1E2A78" text-anchor="middle">Hola</text></svg>';
const momento = (i: number, extra = {}) => ({ id: "m" + i, titulo: "Titulo " + String.fromCharCode(97 + i), narracion: "Cuenta las piezas con calma.", ...extra });
const ficha = (c: Partial<NonNullable<Ficha["claseGuiada"]>> = {}): Ficha => ({
  clave: "mat.p1.x",
  claseGuiada: {
    momentos: [momento(0), momento(1, { recursoRef: "r" }), ...Array.from({ length: 8 }, (_, i) => momento(i + 2))],
    recursos: [{ id: "r", src: "/nudito/a.svg", alt: "alt", descripcion: "desc" }],
    comprobacion: { pregunta: "?", opciones: [{ id: "a", texto: "seis" }, { id: "b", texto: "siete" }, { id: "c", texto: "ocho" }], respuesta: "b", pista: "Cuenta otra vez." },
    ...c,
  },
});
const reglas = (f: Ficha, svg: string | null = svgBueno) => lintClase(f, () => svg).hallazgos.map(h => h.regla);

describe("lint de clase guiada", () => {
  it("acepta una clase correcta y devuelve la letra", () => {
    const r = lintClase(ficha(), () => svgBueno);
    expect(r.hallazgos).toEqual([]);
    expect(r.letra).toBe("B");
  });
  it("detecta defectos de estructura y narración", () => {
    const f = ficha();
    f.claseGuiada!.momentos[0] = momento(0, { recursoRef: "zz", narracion: "Son 5. Titulo a" });
    f.claseGuiada!.momentos[2] = momento(2, { narracion: "Mira el dibujo." });
    f.claseGuiada!.recursos.push({ id: "huerfano", src: "/nudito/a.svg", alt: "x".repeat(201), descripcion: "d" });
    expect(reglas(f)).toEqual(expect.arrayContaining(["primer-momento-sin-recurso", "recursoRef-inexistente", "recurso-sin-uso", "alt", "digitos-narracion", "alude-imagen-sin-recurso", "titulo-repetido"]));
  });
  it("detecta defectos de comprobación", () => {
    const c = { pregunta: "?", respuesta: "a", pista: "Es larguísima respuesta correcta.", opciones: [{ id: "a", texto: "larguísima respuesta correcta" }, { id: "b", texto: "no" }] };
    expect(reglas(ficha({ comprobacion: c }))).toEqual(expect.arrayContaining(["opciones-min-3", "longitud-opciones", "correcta-mas-larga", "pista-revela"]));
  });
  it("informa de ejercicios con la correcta más larga y de src inexistente", () => {
    const f = ficha();
    f.ejercicios = [{ id: "e01", tipo: "opcion_multiple", respuesta: "a", opciones: [{ id: "a", texto: "una respuesta muy larga" }, { id: "b", texto: "corta" }] }];
    expect(reglas(f, null)).toEqual(expect.arrayContaining(["src-inexistente", "ficha-correcta-mas-larga"]));
  });
  it("revisa SVG", () => {
    const malo = '<svg viewBox="0 0 100 100"><text x="2" y="9" font-size="20" fill="#C98F1E"><tspan> a</tspan>largo texto que se sale</text></svg>';
    expect(lintSvg(malo).map(h => h.regla)).toEqual(expect.arrayContaining(["svg-viewbox", "svg-title", "svg-tspan-espacios", "svg-fuente-pequena", "svg-fill-prohibido", "svg-contraste", "svg-texto-borde"]));
    expect(lintSvg(svgBueno)).toEqual([]);
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  });
});
