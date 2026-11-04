import { describe, expect, it } from "vitest";
import { esquemaEjercicioConSolucion, type Dificultad, type EjercicioConSolucion, type EnvioRespuesta, type Tema, type TipoEjercicio } from "@/lib/nudito/contratos";
import { evaluar } from "@/lib/nudito/evaluadores";
import { leerNumero } from "@/lib/nudito/evaluadores/comun";
import { gradoEfectivo, limiteNumerico } from "@/lib/nudito/generadores/matematica/comun";
import { ejercicioPara, fuentesDisponibles, generadores, obtenerGenerador } from "@/lib/nudito/generadores/registro";
import { GRADOS, temaPrueba } from "../fixtures/nudito/temas-prueba";
import { TEMA_MAT_ECUACIONES, TEMA_MAT_FRACCIONES } from "../fixtures/nudito/temas";

const IDS = ["mat.operaciones", "mat.fracciones", "mat.proporcionalidad", "mat.porcentajes", "mat.ecuaciones", "mat.geometria", "mat.patrones"];
const DIFICULTADES: Dificultad[] = [1, 2, 3, 4, 5];
const TODOS: TipoEjercicio[] = ["numerico", "fraccion", "opcion_multiple"];
const SEMILLAS = 1000;

function tema(id: string, nivel: "primaria" | "secundaria", grado: number, tipos: TipoEjercicio[] = TODOS, nombre?: string): Tema {
  return temaPrueba({ clave: `mat.${nivel[0]}${grado}.prueba`, nivel, grado, tipos, fuente: { tipo: "generador", generadorId: id }, nombre });
}

function respuestaCorrecta(ej: EjercicioConSolucion): EnvioRespuesta {
  const s = ej.solucion;
  if (s.tipo === "opcion_multiple") return { respuesta: { tipo: "opcion", opcionId: s.correcta } };
  if (s.tipo === "numerico") return { respuesta: { tipo: "numero", valor: String(s.valor).replace(".", ",") } };
  if (s.tipo === "fraccion") return { respuesta: { tipo: "fraccion", num: String(s.num), den: String(s.den) } };
  throw new Error(`tipo inesperado ${s.tipo}`);
}

/** Valor numérico de un texto de opción («3/4», «12 cm²», «−5»); null si es texto («Son iguales»). */
function valorOpcion(texto: string): number | null {
  const t = texto.replace(/\s*(cm²|m²|cm|m|soles|días|%)$/, "").replace("−", "-");
  return leerNumero(t);
}

/** Recalcula «Calcula: …» con + − × ÷ y paréntesis (sin eval). */
function calcular(expr: string): number {
  const tokens = expr.replace(/−/g, "-").match(/\d+|[-+×÷()]/g) ?? [];
  let i = 0;
  const factor = (): number => {
    const t = tokens[i++];
    if (t === "(") {
      const v = suma();
      i++;
      return v;
    }
    if (t === "-") return -factor();
    return Number(t);
  };
  const producto = (): number => {
    let v = factor();
    while (tokens[i] === "×" || tokens[i] === "÷") v = tokens[i++] === "×" ? v * factor() : v / factor();
    return v;
  };
  const suma = (): number => {
    let v = producto();
    while (tokens[i] === "+" || tokens[i] === "-") v = tokens[i++] === "+" ? v + producto() : v - producto();
    return v;
  };
  return suma();
}

function valorSolucion(ej: EjercicioConSolucion): number {
  const s = ej.solucion;
  if (s.tipo === "numerico") return s.valor;
  if (s.tipo === "fraccion") return s.num / s.den;
  if (s.tipo === "opcion_multiple" && ej.publico.tipo === "opcion_multiple") {
    const t = ej.publico.opciones.find((o) => o.id === s.correcta)!.texto;
    return valorOpcion(t) ?? Number.NaN;
  }
  return Number.NaN;
}

describe("registro de generadores", () => {
  it("expone los 7 generadores con los ids acordados y su versión", () => {
    expect([...generadores().keys()].sort()).toEqual([...IDS].sort());
    for (const id of IDS) {
      const g = obtenerGenerador(id)!;
      expect(g.id).toBe(id);
      expect(g.version).toBeGreaterThanOrEqual(1);
      expect(g.area).toBe("matematica");
    }
    expect(obtenerGenerador("mat.no-existe")).toBeNull();
    expect(fuentesDisponibles().generadores.sort()).toEqual([...IDS].sort());
  });

  it("acepta los ids de los fixtures del paso 0 como alias y genera para esos temas", () => {
    for (const t of [TEMA_MAT_FRACCIONES, TEMA_MAT_ECUACIONES]) {
      const ej = ejercicioPara(t, 2, 99);
      expect(esquemaEjercicioConSolucion.safeParse(ej).success).toBe(true);
      expect(t.tipos).toContain(ej.publico.tipo);
    }
    // El tema de fracciones equivalentes solo produce ejercicios de equivalencia.
    for (let s = 0; s < 50; s++) expect(ejercicioPara(TEMA_MAT_FRACCIONES, 2, s).publico.enunciado).toMatch(/equivalente/);
  });
});

describe("generadores de Matemática", () => {
  it.each(IDS)(`%s: ${SEMILLAS} semillas × 5 dificultades × 11 grados → válidos, verificables y sin distractores iguales a la correcta`, (id) => {
    let total = 0;
    {
      const g = obtenerGenerador(id)!;
      for (const { nivel, grado } of GRADOS) {
        const t = tema(id, nivel, grado);
        const primaria = nivel === "primaria";
        for (const d of DIFICULTADES) {
          for (let semilla = 0; semilla < SEMILLAS; semilla++) {
            const s = semilla + grado + (primaria ? 0 : 6);
            const ej = g.generar(t, d, s);
            total++;
            const r = esquemaEjercicioConSolucion.safeParse(ej);
            if (!r.success) throw new Error(`${id} ${nivel}${grado} d${d} s${s}: ${r.error.message}`);
            expect(ej.publico.fuenteId).toBe(`${id}@${g.version}`);
            expect(t.tipos).toContain(ej.publico.tipo);
            // La solución verifica con el evaluador.
            const ev = evaluar(ej, respuestaCorrecta(ej));
            if (ev.resultado !== "correcto") throw new Error(`${id} s${s}: la solución no verifica (${ev.retro})`);
            const v = valorSolucion(ej);
            if (!(ej.publico.tipo === "opcion_multiple" && Number.isNaN(v))) {
              expect(Number.isFinite(v), `${id} s${s}`).toBe(true);
              if (primaria) expect(v, `${id} ${grado} s${s} ${ej.publico.enunciado}`).toBeGreaterThanOrEqual(0);
            }
            if (ej.solucion.tipo === "fraccion") expect(ej.solucion.den).toBeGreaterThan(0);
            if (ej.publico.tipo === "opcion_multiple" && ej.solucion.tipo === "opcion_multiple") {
              const textos = ej.publico.opciones.map((o) => o.texto);
              expect(new Set(textos).size).toBe(textos.length);
              expect(textos.length).toBeGreaterThanOrEqual(3);
              for (const o of ej.publico.opciones) {
                if (o.id === ej.solucion.correcta) continue;
                expect(ej.solucion.distractores[o.id], `${id} s${s}: distractor sin código`).toMatch(/^[a-z0-9_]+$/);
                const x = valorOpcion(o.texto);
                if (x !== null && !Number.isNaN(v)) expect(Math.abs(x - v) > 1e-9, `${id} s${s}: ${o.texto} = correcta`).toBe(true);
                if (x !== null && primaria) expect(x).toBeGreaterThanOrEqual(0);
              }
            }
            // Las dos primeras pistas no revelan el resultado.
            const formateado = ej.solucion.tipo === "fraccion" ? `${ej.solucion.num}/${ej.solucion.den}` : String(v).replace(".", ",");
            for (const p of ej.pistas.slice(0, 2)) expect(p.includes(`= ${formateado}`) || p.includes(`es ${formateado}`), `${id} s${s}: ${p}`).toBe(false);
            expect(ej.explicacion.length).toBeGreaterThan(20);
          }
        }
      }
    }
    expect(total).toBe(SEMILLAS * DIFICULTADES.length * GRADOS.length);
  }, 120_000);

  it("es determinista: mismo (tema, dificultad, semilla) → mismo ejercicio", () => {
    for (const id of IDS) {
      const t = tema(id, "primaria", 6);
      for (let s = 0; s < 100; s++) {
        const d = ((s % 5) + 1) as Dificultad;
        expect(obtenerGenerador(id)!.generar(t, d, s)).toEqual(obtenerGenerador(id)!.generar(t, d, s));
      }
      const distintos = new Set(Array.from({ length: 30 }, (_, s) => obtenerGenerador(id)!.generar(t, 3, s).publico.enunciado));
      expect(distintos.size).toBeGreaterThan(5);
    }
  });

  it("las operaciones directas y las ecuaciones se verifican recalculando el enunciado", () => {
    const op = obtenerGenerador("mat.operaciones")!;
    const ec = obtenerGenerador("mat.ecuaciones")!;
    for (let s = 0; s < 1000; s++) {
      const { nivel, grado } = GRADOS[s % GRADOS.length];
      const d = ((s % 5) + 1) as Dificultad;
      const ej = op.generar(tema("mat.operaciones", nivel, grado, ["numerico"]), d, s);
      const m = /^Calcula: (.+)$/.exec(ej.publico.enunciado);
      if (m && ej.solucion.tipo === "numerico") expect(calcular(m[1])).toBe(ej.solucion.valor);
      const e = ec.generar(tema("mat.ecuaciones", "secundaria", 1 + (s % 5), ["numerico"]), d, s);
      const eq = /^Resuelve: (.+) = (.+)\. ¿/.exec(e.publico.enunciado)!;
      const x = e.solucion.tipo === "numerico" ? e.solucion.valor : Number.NaN;
      const lado = (t: string) => calcular(t.replace(/(\d)x/g, `$1×(${x})`).replace(/(\d)\(/g, "$1×(").replace(/\bx\b/g, `(${x})`));
      expect(lado(eq[1]), e.publico.enunciado).toBe(lado(eq[2]));
    }
  });

  it("respeta los tipos del tema: solo numérico, solo fracción u opción múltiple", () => {
    for (const tipo of TODOS) {
      for (let s = 0; s < 100; s++) {
        const ej = ejercicioPara(tema("mat.fracciones", "primaria", 5, [tipo]), 3, s);
        if (tipo !== "numerico") expect(ej.publico.tipo).toBe(tipo);
      }
    }
  });

  it("el tema dirige el subtipo (perímetro, simplificar, descuento)", () => {
    for (let s = 0; s < 50; s++) {
      expect(ejercicioPara(tema("mat.geometria", "primaria", 5, TODOS, "Perímetro de figuras"), 3, s).publico.enunciado).toMatch(/perímetro/);
      expect(ejercicioPara(tema("mat.fracciones", "primaria", 6, TODOS, "Simplificar fracciones"), 3, s).publico.enunciado).toMatch(/Simplifica/);
      expect(ejercicioPara(tema("mat.porcentajes", "primaria", 6, TODOS, "Descuentos"), 3, s).publico.enunciado).toMatch(/descuento|subió/);
    }
  });

  it("la dificultad es monótona: el rango numérico crece con la dificultad y el grado", () => {
    for (let e = 1; e <= 11; e++) {
      for (let d = 1; d < 5; d++) expect(limiteNumerico(e, (d + 1) as Dificultad)).toBeGreaterThanOrEqual(limiteNumerico(e, d as Dificultad));
      if (e > 1) for (const d of DIFICULTADES) expect(limiteNumerico(e, d)).toBeGreaterThanOrEqual(limiteNumerico(e - 1, d));
    }
    expect(gradoEfectivo({ nivel: "secundaria", grado: 1 })).toBe(7);
    // En promedio, los resultados de las operaciones crecen con la dificultad.
    const promedio = (d: Dificultad) => {
      let suma = 0;
      for (let s = 0; s < 300; s++) suma += Math.abs(valorSolucion(obtenerGenerador("mat.operaciones")!.generar(tema("mat.operaciones", "primaria", 4, ["numerico"]), d, s)));
      return suma / 300;
    };
    const medias = DIFICULTADES.map(promedio);
    for (let i = 1; i < medias.length; i++) expect(medias[i]).toBeGreaterThan(medias[i - 1]);
  });
});
