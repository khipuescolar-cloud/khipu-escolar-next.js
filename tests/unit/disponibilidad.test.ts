import { describe, expect, it } from "vitest";
import { instanteEnZona } from "@/lib/dias-habiles";
import {
  calcularDisponibilidad, celdasDelDia, contiene, estadoCelda, etiquetaParaTercero, fechasEntre, franjas, fusionar, intersectar, intersectarVarios,
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

describe("privacidad", () => {
  it("a terceros solo «Ocupado»; «Clase» solo para quien puede ver clases", () => {
    expect(etiquetaParaTercero("reunion", true)).toBe("Ocupado");
    expect(etiquetaParaTercero("ausencia", true)).toBe("Ocupado");
    expect(etiquetaParaTercero("clase", true)).toBe("Clase");
    expect(etiquetaParaTercero("clase", false)).toBe("Ocupado");
  });
});
