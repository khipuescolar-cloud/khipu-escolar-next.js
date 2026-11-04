import { describe, expect, it } from "vitest";
import type { DecisionDominio, Dificultad, EstadoDominioTema, EvidenciaPractica, PoliticaDominio } from "@/lib/nudito/contratos";
import {
  estadoInicial,
  evaluarDominio,
  pesoEvidencia,
  POLITICA_DOMINIO_POR_DEFECTO as P,
  politicaEfectiva,
  type ContextoDominio,
} from "@/lib/nudito/politica-dominio";

const BASE = Date.parse("2026-11-14T08:00:00Z");
let minuto = 0;
function ev(o: Partial<EvidenciaPractica> & { sesion?: number; dia?: number } = {}): EvidenciaPractica {
  const { sesion = 1, dia = sesion - 1, ...resto } = o;
  minuto += 1;
  return {
    resultado: "correcto",
    dificultad: 3,
    pistas: 0,
    sesionId: `s${sesion}`,
    comprobacion: false,
    at: new Date(BASE + dia * 86_400_000 + minuto * 60_000).toISOString(),
    ...resto,
  };
}

/** Aplica evidencias en orden y acumula todos los eventos. */
function aplicar(estado: EstadoDominioTema, lista: EvidenciaPractica[], politica: PoliticaDominio = P, ctx?: ContextoDominio) {
  const eventos: DecisionDominio["eventos"] = [];
  for (const e of lista) {
    const d = evaluarDominio(estado, e, politica, ctx);
    eventos.push(...d.eventos);
    estado = d.nuevo;
  }
  return { estado, eventos };
}

const enDificultad = (d: Dificultad, estado: EstadoDominioTema["estado"] = "en_progreso"): EstadoDominioTema => ({ ...estadoInicial(), estado, dificultad: d });
const seis = (o: Partial<EvidenciaPractica> & { sesion?: number } = {}) => Array.from({ length: 6 }, () => ev(o));
const comprobacion = (n: number, o: Partial<EvidenciaPractica> & { sesion?: number } = {}) => Array.from({ length: n }, () => ev({ comprobacion: true, ...o }));

describe("política de dominio v1", () => {
  it("la primera evidencia inicia el tema con motivo; un incierto no cuenta", () => {
    const d = evaluarDominio(estadoInicial(), ev(), P);
    expect(d.nuevo.estado).toBe("en_progreso");
    expect(d.eventos).toEqual([{ tipo: "estado", motivo: "Empezó a practicar el tema." }]);
    expect(d.nuevo.sesionesDistintas).toBe(1);
    const incierto = evaluarDominio(d.nuevo, ev({ resultado: "incierto" }), P);
    expect(incierto.nuevo.evidencia).toHaveLength(1);
    expect(incierto.eventos).toEqual([]);
  });

  it("nunca hay dominio en una sola sesión, aunque todo sea correcto", () => {
    const { estado } = aplicar(enDificultad(3), [...seis(), ...comprobacion(10)]);
    expect(estado.estado).toBe("en_comprobacion");
    expect(estado.sesionesDistintas).toBe(1);
  });

  it("una sesión nueva solo cuenta como distinta si pasaron las horas mínimas", () => {
    const { estado } = aplicar(enDificultad(3), [ev({ sesion: 1 }), ev({ sesion: 2, dia: 0 })]);
    expect(estado.sesionesDistintas).toBe(1);
    const { estado: otro } = aplicar(enDificultad(3), [ev({ sesion: 1 }), ev({ sesion: 2, dia: 1 })]);
    expect(otro.sesionesDistintas).toBe(2);
  });

  it("dominado exige comprobación SIN pista y ≥ 2 sesiones; cada cambio tiene motivo", () => {
    const { estado, eventos } = aplicar(enDificultad(3), [...seis({ sesion: 1 }), ...comprobacion(2, { sesion: 2 })]);
    expect(estado.estado).toBe("dominado");
    const estados = eventos.filter((e) => e.tipo === "estado").map((e) => e.motivo);
    expect(estados[0]).toMatch(/comprobación/);
    expect(estados.at(-1)).toMatch(/Dominado: 2 aciertos sin pista .* 2 sesiones/);
    for (const e of eventos) expect(e.motivo.length).toBeGreaterThan(10);
  });

  it("la comprobación es obligatoria: muchos aciertos fuera de comprobación no dan dominio", () => {
    const { estado } = aplicar(enDificultad(3), [...seis({ sesion: 1 }), ...seis({ sesion: 2 }), ...seis({ sesion: 3 })]);
    expect(estado.estado).toBe("en_comprobacion");
  });

  it("aciertos con pista en la comprobación no cuentan; fallar la comprobación vuelve a en_progreso", () => {
    const conPista = aplicar(enDificultad(3), [...seis({ sesion: 1 }), ...comprobacion(1, { sesion: 2, pistas: 1 })]);
    expect(conPista.estado.estado).toBe("en_comprobacion");
    const fallo = aplicar(conPista.estado, comprobacion(1, { sesion: 2, resultado: "incorrecto" }));
    expect(fallo.estado.estado).toBe("en_progreso");
    expect(fallo.eventos.find((e) => e.tipo === "estado")?.motivo).toMatch(/No superó la comprobación/);
  });

  it("las pistas restan: con pistas no se llega al umbral y la pista 3 (respuesta revelada) vale 0", () => {
    expect(pesoEvidencia(ev({ pistas: 0 }), P)).toBe(1);
    expect(pesoEvidencia(ev({ pistas: 1 }), P)).toBe(0.5);
    expect(pesoEvidencia(ev({ pistas: 3 }), P)).toBe(0);
    expect(pesoEvidencia(ev({ resultado: "parcial" }), P)).toBe(0.5);
    expect(pesoEvidencia(ev({ resultado: "parcial", pistas: 2 }), P)).toBe(0.25);
    const { estado } = aplicar(enDificultad(3), [...seis({ sesion: 1, pistas: 1 }), ...seis({ sesion: 2, pistas: 1 })]);
    expect(estado.estado).toBe("en_progreso");
    const reveladas = aplicar(enDificultad(3), [...seis({ sesion: 1, pistas: 3 }), ...seis({ sesion: 2, pistas: 3 })]);
    expect(reveladas.estado.estado).toBe("en_progreso");
    expect(reveladas.eventos.some((e) => e.tipo === "dificultad_sube")).toBe(false);
  });

  it("no hay comprobación por debajo de la dificultad mínima de dominio", () => {
    const { estado } = aplicar({ ...enDificultad(1), dificultad: 1 }, Array.from({ length: 2 }, () => ev({ dificultad: 1 })));
    expect(estado.estado).toBe("en_progreso");
    const bajos = aplicar(enDificultad(2), Array.from({ length: 8 }, () => ev({ dificultad: 2 })), { ...P, subirTrasAciertosSeguidos: 20 });
    expect(bajos.estado.estado).toBe("en_progreso");
  });

  it("sube la dificultad tras aciertos seguidos y baja tras fallos seguidos, con motivo", () => {
    const sube = aplicar(enDificultad(1), [ev({ dificultad: 1 }), ev({ dificultad: 1 }), ev({ dificultad: 1 })]);
    expect(sube.estado.dificultad).toBe(2);
    expect(sube.eventos.find((e) => e.tipo === "dificultad_sube")?.motivo).toMatch(/3 aciertos seguidos/);
    const baja = aplicar(enDificultad(3), [ev({ resultado: "incorrecto" }), ev({ resultado: "incorrecto" })]);
    expect(baja.estado.dificultad).toBe(2);
    expect(baja.eventos.find((e) => e.tipo === "dificultad_baja")?.motivo).toMatch(/2 respuestas incorrectas/);
    const tope = aplicar(enDificultad(5), [ev({ dificultad: 5 }), ev({ dificultad: 5 }), ev({ dificultad: 5 })]);
    expect(tope.estado.dificultad).toBe(5);
  });

  it("reforzar: si cae un tema dominado o falla seguido en la dificultad más baja; vuelve con aciertos", () => {
    const dominado = aplicar(enDificultad(3), [...seis({ sesion: 1 }), ...comprobacion(2, { sesion: 2 })]).estado;
    const cae = aplicar(dominado, [ev({ sesion: 3, resultado: "incorrecto" }), ev({ sesion: 3, resultado: "incorrecto" })]);
    expect(cae.estado.estado).toBe("reforzar");
    expect(cae.eventos.find((e) => e.tipo === "estado")?.motivo).toMatch(/reforzar/);
    const bajo = aplicar(enDificultad(1), [ev({ dificultad: 1, resultado: "incorrecto" }), ev({ dificultad: 1, resultado: "incorrecto" })]);
    expect(bajo.estado.estado).toBe("reforzar");
    const vuelve = aplicar(bajo.estado, [ev({ dificultad: 1 }), ev({ dificultad: 1 }), ev({ dificultad: 1 })]);
    expect(vuelve.estado.estado).toBe("en_progreso");
  });

  it("desbloqueo_tema solo con dominio en la dificultad pedida y TODOS los prerrequisitos dominados", () => {
    const camino = () => [...seis({ sesion: 1, dificultad: 4 }), ...comprobacion(2, { sesion: 2, dificultad: 4 })];
    const d4 = enDificultad(4);
    const politica = { ...P, subirTrasAciertosSeguidos: 20 };
    const conTodo = aplicar(d4, camino(), politica, { prerrequisitos: ["mat.p4.a", "mat.p4.b"], dominados: new Set(["mat.p4.a", "mat.p4.b"]) });
    expect(conTodo.estado.estado).toBe("dominado");
    expect(conTodo.eventos.find((e) => e.tipo === "desbloqueo_tema")?.motivo).toMatch(/prerrequisitos dominados/);
    const falta = aplicar(d4, camino(), politica, { prerrequisitos: ["mat.p4.a", "mat.p4.b"], dominados: new Set(["mat.p4.a"]) });
    expect(falta.estado.estado).toBe("dominado");
    expect(falta.eventos.some((e) => e.tipo === "desbloqueo_tema")).toBe(false);
    const sinContexto = aplicar(d4, camino(), politica);
    expect(sinContexto.eventos.some((e) => e.tipo === "desbloqueo_tema")).toBe(false);
    const d3 = aplicar(enDificultad(3), [...seis({ sesion: 1 }), ...comprobacion(2, { sesion: 2 })], politica, { prerrequisitos: [], dominados: new Set() });
    expect(d3.estado.estado).toBe("dominado");
    expect(d3.eventos.some((e) => e.tipo === "desbloqueo_tema")).toBe(false);
  });

  it("la ventana conserva solo las últimas evidencias y la versión de la política", () => {
    const { estado } = aplicar(enDificultad(3), Array.from({ length: 20 }, () => ev()), { ...P, subirTrasAciertosSeguidos: 50 });
    expect(estado.evidencia).toHaveLength(P.ventana);
    expect(estado.politicaVersion).toBe("v1");
  });

  it("politicaEfectiva: por defecto, cambios parciales válidos y errores claros", () => {
    expect(politicaEfectiva(null)).toBe(P);
    const p = politicaEfectiva({ minSesionesDistintas: 3 });
    expect(p.minSesionesDistintas).toBe(3);
    expect(p.version).toBe("v1-colegio");
    expect(politicaEfectiva({ minSesionesDistintas: 3, version: "colegio-2026" }).version).toBe("colegio-2026");
    expect(() => politicaEfectiva({ ventana: 2 })).toThrow(/Política de dominio no válida/);
    expect(() => politicaEfectiva({ minIntentos: 12, ventana: 10 })).toThrow(/minIntentos/);
    expect(() => politicaEfectiva({ ejerciciosComprobacion: 1, minAciertosComprobacionSinPista: 2 })).toThrow(/ejerciciosComprobacion/);
    // Con 3 sesiones mínimas, dos sesiones ya no bastan.
    const { estado } = aplicar(enDificultad(3), [...seis({ sesion: 1 }), ...comprobacion(3, { sesion: 2 })], p);
    expect(estado.estado).toBe("en_comprobacion");
  });
});
