import { describe, expect, it } from "vitest";
import { instanteEnZona } from "@/lib/dias-habiles";
import { analizar, encajar, libresParaTodos, limitar, primerHueco, rangoVisible, requiereConfirmarChoque, semanaDe, siguienteMarca, textoChoques, type DatosHorario } from "@/lib/asistente-horario";
import {
  bloquesPorDia, calcularDisponibilidad, celdasDelDia, contiene, estadoCelda, etiquetaParaTercero, fechasEntre, franjas, fusionar, intersectar, intersectarVarios,
  rangosNoLectivos, restar, ventanasLaborales, type Rango,
} from "@/lib/disponibilidad";

const Z = "America/Lima";
const FECHA = "2026-11-17"; // martes lectivo
const t = (hhmm: string, fecha = FECHA) => instanteEnZona(fecha, hhmm, Z).getTime();
const r = (a: string, b: string, fecha = FECHA): Rango => ({ inicio: t(a, fecha), fin: t(b, fecha) });

describe("operaciones con rangos [inicio, fin)", () => {
  it("fusiona rangos que se cruzan o se tocan y descarta vacíos", () => {
    expect(fusionar([r("10:00", "11:00"), r("08:00", "09:00"), r("09:00", "09:30"), r("10:30", "12:00"), r("13:00", "13:00")])).toEqual([
      r("08:00", "09:30"), r("10:00", "12:00"),
    ]);
  });

  it("resta lo ocupado de la ventana", () => {
    expect(restar([r("07:30", "16:30")], [r("10:00", "11:00"), r("11:00", "11:30"), r("15:00", "17:00")])).toEqual([
      r("07:30", "10:00"), r("11:30", "15:00"),
    ]);
  });

  it("intersecta listas de rangos", () => {
    expect(intersectar([r("08:00", "12:00")], [r("09:00", "10:00"), r("11:30", "13:00")])).toEqual([r("09:00", "10:00"), r("11:30", "12:00")]);
    expect(intersectarVarios([[r("08:00", "12:00")], [r("09:00", "13:00")], [r("10:00", "11:00")]])).toEqual([r("10:00", "11:00")]);
    expect(intersectarVarios([])).toEqual([]);
  });

  it("tocarse en el borde no es cruce: 11:00–11:30 cabe después de 10:00–11:00", () => {
    const libres = restar([r("07:30", "16:30")], [r("10:00", "11:00")]);
    expect(contiene(libres, r("11:00", "11:30"))).toBe(true);
    expect(contiene(libres, r("10:45", "11:15"))).toBe(false);
    expect(contiene(libres, r("09:30", "10:00"))).toBe(true);
  });

  it("arma franjas de la duración pedida alineadas cada 15 minutos", () => {
    const f = franjas([{ inicio: t("08:05"), fin: t("09:30") }], 45);
    expect(f.map((x) => x.inicio)).toEqual([t("08:15"), t("08:30"), t("08:45")]);
    expect(f.every((x) => x.fin - x.inicio === 45 * 60_000)).toBe(true);
    expect(franjas([r("08:00", "08:20")], 30)).toEqual([]);
  });
});

describe("días lectivos y horas laborales", () => {
  it("las ventanas laborales excluyen fines de semana, feriados nacionales y feriados del colegio", () => {
    const fechas = fechasEntre("2026-11-13", "2026-11-17"); // vie, sáb, dom, lun, mar
    const v = ventanasLaborales({ fechas, horaInicio: "07:30", horaFin: "16:30", zona: Z, noLectivos: ["2026-11-16"] });
    expect(v).toEqual([r("07:30", "16:30", "2026-11-13"), r("07:30", "16:30", "2026-11-17")]);
    const navidad = ventanasLaborales({ fechas: ["2026-12-25"], horaInicio: "07:30", horaFin: "16:30", zona: Z, noLectivos: [] });
    expect(navidad).toEqual([]);
  });

  it("estado de celda: no lectivo > fuera de horario > ocupado > libre", () => {
    const laboral = [r("07:30", "16:30")];
    const ocupado = [r("10:00", "11:00")];
    const noLectivo = rangosNoLectivos(["2026-11-14"], [], Z);
    expect(estadoCelda(r("10:00", "10:30"), { laboral, noLectivo, ocupado })).toBe("ocupado");
    expect(estadoCelda(r("11:00", "11:30"), { laboral, noLectivo, ocupado })).toBe("libre");
    expect(estadoCelda(r("17:00", "17:30"), { laboral, noLectivo, ocupado })).toBe("fuera_de_horario");
    expect(estadoCelda(r("07:00", "07:30"), { laboral, noLectivo, ocupado })).toBe("fuera_de_horario");
    expect(estadoCelda(r("10:00", "10:30", "2026-11-14"), { laboral, noLectivo, ocupado })).toBe("no_lectivo");
  });

  it("la cuadrícula del día va de 07:00 a 18:00 en celdas de 30 minutos", () => {
    const c = celdasDelDia(FECHA, { horaInicio: "07:30", horaFin: "16:30", zona: Z });
    expect(c).toHaveLength(22);
    expect(c[0]).toEqual(r("07:00", "07:30"));
    expect(c.at(-1)).toEqual(r("17:30", "18:00"));
  });
});

describe("calcularDisponibilidad", () => {
  const ventana = [r("07:30", "16:30")];

  it("coincidencias de tres docentes para 45 minutos y alternativas cercanas a la preferida", () => {
    const res = calcularDisponibilidad({
      personas: [
        { id: "ana", requerido: true, ocupado: [r("10:00", "11:00")] },
        { id: "luis", requerido: true, ocupado: [r("11:00", "11:30")] },
        { id: "eva", requerido: true, ocupado: [r("07:30", "09:00"), r("12:00", "16:30")] },
      ],
      ventana, duracionMin: 45, preferida: r("10:00", "10:45"),
    });
    expect(res.coincidencias).toEqual([r("09:00", "10:00"), r("11:30", "12:00")]);
    expect(res.preferidaLibre).toBe(false);
    expect(res.alternativas.map((a) => a.inicio)).toEqual([t("09:00"), t("09:15")]);
  });

  it("la preferida libre se informa y las alternativas son 5 como máximo, ordenadas por hora", () => {
    const res = calcularDisponibilidad({
      personas: [{ id: "ana", requerido: true, ocupado: [] }], ventana, duracionMin: 30, preferida: r("10:00", "10:30"),
    });
    expect(res.preferidaLibre).toBe(true);
    expect(res.alternativas.map((a) => a.inicio)).toEqual([t("09:15"), t("09:30"), t("09:45"), t("10:15"), t("10:30")]);
  });

  it("a igual distancia prefiere la franja con más opcionales libres", () => {
    const res = calcularDisponibilidad({
      personas: [
        { id: "ana", requerido: true, ocupado: [r("09:15", "10:45")] },
        { id: "opcional", requerido: false, ocupado: [r("08:30", "09:15")] },
      ],
      ventana: [r("08:30", "11:30")], duracionMin: 30, preferida: r("10:00", "10:30"), maxAlternativas: 1,
    });
    // 08:45 (a 75 min) y 11:15? no cabe; 10:45 (a 45 min) gana por cercanía.
    expect(res.alternativas[0].inicio).toBe(t("10:45"));
    expect(res.alternativas[0].opcionalesLibres).toBe(1);
  });

  it("no propone franjas antes de `noAntesDe`", () => {
    const res = calcularDisponibilidad({
      personas: [{ id: "ana", requerido: true, ocupado: [] }], ventana, duracionMin: 60, preferida: r("08:00", "09:00"), noAntesDe: t("12:00"),
    });
    expect(res.preferidaLibre).toBe(false);
    expect(res.alternativas.every((a) => a.inicio >= t("12:00"))).toBe(true);
  });
});

describe("alternativas distintas (calendario del asistente)", () => {
  const MIERCOLES = "2026-11-18";
  const dia = (inicio: number) => new Date(inicio - 5 * 3_600_000).toISOString().slice(0, 10);

  it("no se cruzan entre sí y reparten primero una por día", () => {
    const res = calcularDisponibilidad({
      personas: [{ id: "ana", requerido: true, ocupado: [] }],
      ventana: [r("08:00", "12:00"), r("08:00", "12:00", MIERCOLES)], duracionMin: 30, preferida: r("10:00", "10:30"),
      maxAlternativas: 3, distintas: { claveDia: dia, maxPorDia: 2 },
    });
    const a = res.alternativas;
    expect(a).toHaveLength(3);
    for (let i = 1; i < a.length; i++) expect(a[i].inicio).toBeGreaterThanOrEqual(a[i - 1].fin);
    expect(new Set(a.map((x) => dia(x.inicio)))).toEqual(new Set([FECHA, MIERCOLES]));
    expect(a.filter((x) => dia(x.inicio) === FECHA)).toHaveLength(2);
  });
});

describe("bloquesPorDia", () => {
  it("recorta por día, une tramos seguidos con la misma etiqueta y no une etiquetas distintas", () => {
    const b = bloquesPorDia([
      { ...r("08:00", "09:00"), etiqueta: "Ocupado", esClase: false },
      { ...r("09:00", "09:30"), etiqueta: "Ocupado", esClase: false },
      { ...r("10:00", "11:00"), etiqueta: "Clase", esClase: true },
      { inicio: t("22:00"), fin: t("02:00", "2026-11-18"), etiqueta: "Ocupado", esClase: false },
    ], [FECHA, "2026-11-18"], Z);
    expect(b).toEqual([
      { fecha: FECHA, desde: "08:00", hasta: "09:30", etiqueta: "Ocupado", esClase: false },
      { fecha: FECHA, desde: "10:00", hasta: "11:00", etiqueta: "Clase", esClase: true },
      { fecha: FECHA, desde: "22:00", hasta: "24:00", etiqueta: "Ocupado", esClase: false },
      { fecha: "2026-11-18", desde: "00:00", hasta: "02:00", etiqueta: "Ocupado", esClase: false },
    ]);
  });
});

describe("paso Horario del asistente (asistente-horario)", () => {
  const datos: DatosHorario = {
    dias: [{ fecha: FECHA, lectivo: true }, { fecha: "2026-11-21", lectivo: false }],
    jornada: { desde: "07:30", hasta: "16:30" },
    hoy: { fecha: "2026-11-16", hora: "09:00" },
    personas: [
      { membershipId: "yo", nombre: "Carmen Torres", requerido: true, propia: true, bloques: [] },
      { membershipId: "rocio", nombre: "Rocío Pérez", requerido: true, propia: false, bloques: [{ fecha: FECHA, desde: "10:00", hasta: "11:00", etiqueta: "Clase", esClase: true }] },
      { membershipId: "pedro", nombre: "Pedro Salas", requerido: false, propia: false, bloques: [{ fecha: FECHA, desde: "12:00", hasta: "13:00", etiqueta: "Ocupado", esClase: false }] },
    ],
  };

  it("detecta el choque con un requerido (con su etiqueta según privacidad) y si solo son clases", () => {
    const a = analizar(datos, { fecha: FECHA, inicio: 10 * 60 + 30 }, 30);
    expect(a.choquesRequeridos.map((c) => c.nombre)).toEqual(["Rocío Pérez"]);
    expect(a.soloClases).toBe(true);
    expect(textoChoques(a.choquesRequeridos)).toBe("Choca con: Rocío (Clase)");
    // Tocarse en el borde no es choque.
    expect(analizar(datos, { fecha: FECHA, inicio: 11 * 60 }, 30).choques).toEqual([]);
  });

  it("pide confirmación para choques requeridos u opcionales, salvo si ya se aceptaron", () => {
    const clase = analizar(datos, { fecha: FECHA, inicio: 10 * 60 }, 30);
    const opcional = analizar(datos, { fecha: FECHA, inicio: 12 * 60 }, 30);
    const libre = analizar(datos, { fecha: FECHA, inicio: 11 * 60 }, 30);
    expect(requiereConfirmarChoque(clase, false)).toBe(true);
    expect(requiereConfirmarChoque(opcional, false)).toBe(true);
    expect(requiereConfirmarChoque(clase, true)).toBe(false);
    expect(requiereConfirmarChoque(libre, false)).toBe(false);
  });

  it("opcional ocupado, fuera de jornada, no lectivo y franja pasada", () => {
    const opc = analizar(datos, { fecha: FECHA, inicio: 12 * 60 }, 30);
    expect(opc.choquesRequeridos).toEqual([]);
    expect(opc.choques.map((c) => c.nombre)).toEqual(["Pedro Salas"]);
    expect(analizar(datos, { fecha: FECHA, inicio: 16 * 60 + 15 }, 30).fueraDeHorario).toBe(true);
    const sabado = analizar(datos, { fecha: "2026-11-21", inicio: 10 * 60 }, 30);
    expect(sabado.noLectivo && sabado.fueraDeHorario).toBe(true);
    expect(analizar({ ...datos, hoy: { fecha: FECHA, hora: "11:00" } }, { fecha: FECHA, inicio: 10 * 60 }, 30).pasada).toBe(true);
  });

  it("libres para todos los requeridos (ignora a los opcionales) y encaje de 15 min", () => {
    expect(libresParaTodos(datos, FECHA)).toEqual([{ desde: 450, hasta: 600 }, { desde: 660, hasta: 990 }]);
    expect(libresParaTodos(datos, "2026-11-21")).toEqual([]);
    expect(encajar(10 * 60 + 7, 30, { desde: 420, hasta: 1080 })).toBe(10 * 60);
    expect(encajar(17 * 60 + 50, 30, { desde: 420, hasta: 1080 })).toBe(17 * 60 + 30);
  });

  it("hora al minuto (11:38 por 25 min): choques exactos, sin redondear, y flechas a la marca de 15 min siguiente", () => {
    // Rocío tiene clase de 10:00 a 11:00 y Pedro (opcional) de 12:00 a 13:00: 11:38–12:03 roza solo a Pedro.
    const a = analizar(datos, { fecha: FECHA, inicio: 11 * 60 + 38 }, 25);
    expect(a.choquesRequeridos).toEqual([]);
    expect(a.choques.map((c) => c.nombre)).toEqual(["Pedro Salas"]);
    expect(analizar(datos, { fecha: FECHA, inicio: 11 * 60 + 35 }, 25).choques).toEqual([]); // 11:35–12:00 se toca, no se cruza
    expect(limitar(11 * 60 + 38, 25, { desde: 0, hasta: 1440 })).toBe(11 * 60 + 38);
    expect(limitar(23 * 60 + 50, 25, { desde: 0, hasta: 1440 })).toBe(1440 - 25);
    expect(siguienteMarca(11 * 60 + 38, 1)).toBe(11 * 60 + 45);
    expect(siguienteMarca(11 * 60 + 38, -1)).toBe(11 * 60 + 30);
    expect(siguienteMarca(11 * 60 + 30, 1)).toBe(11 * 60 + 45);
  });

  it("primer hueco libre para todos (selección inicial), desde la fecha pedida y no antes de ahora", () => {
    expect(primerHueco(datos, FECHA, 30)).toEqual({ fecha: FECHA, inicio: 7 * 60 + 30 });
    expect(primerHueco({ ...datos, hoy: { fecha: FECHA, hora: "09:40" } }, FECHA, 30)).toEqual({ fecha: FECHA, inicio: 11 * 60 });
    expect(primerHueco(datos, "2026-11-21", 30)).toBeNull(); // solo queda el sábado, no lectivo
  });

  it("semana y horas visibles", () => {
    expect(semanaDe("2026-11-19")).toBe("2026-11-16");
    expect(semanaDe("2026-11-21")).toBe("2026-11-23"); // sábado → lunes siguiente
    expect(rangoVisible({ desde: "07:30", hasta: "16:30" })).toEqual({ desde: 420, hasta: 1080 });
    expect(rangoVisible({ desde: "07:30", hasta: "16:30" }, { desde: 18 * 60, hasta: 18 * 60 + 30 })).toEqual({ desde: 420, hasta: 1140 });
  });
});

describe("privacidad", () => {
  it("a terceros solo «Ocupado»; «Clase» solo para quien puede ver clases", () => {
    expect(etiquetaParaTercero("reunion", true)).toBe("Ocupado");
    expect(etiquetaParaTercero("ausencia", true)).toBe("Ocupado");
    expect(etiquetaParaTercero("clase", true)).toBe("Clase");
    expect(etiquetaParaTercero("clase", false)).toBe("Ocupado");
  });
});
