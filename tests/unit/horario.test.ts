import { describe, expect, it } from "vitest";
import { planificarHorario } from "../../prisma/seed-horario";
import {
  PERIODOS_SUGERIDOS, ahoraYDespues, buscarCruce, crucesDe, diaDeSemana, diaPorDefecto, mensajeCruce, seSolapan, validarPeriodos,
  type OcupacionProfesor,
} from "@/lib/horario";

const ocup = (extra: Partial<OcupacionProfesor> = {}): OcupacionProfesor => ({
  id: "b1", profesorId: "p1", dia: 1, salonId: "s1", salonNombre: "3.° B", titulo: "Matemática", horaInicio: "08:00", horaFin: "08:45", ...extra,
});

describe("cruces de horas", () => {
  it("dos intervalos que solo se tocan en el borde no se cruzan", () => {
    expect(seSolapan({ horaInicio: "08:00", horaFin: "08:45" }, { horaInicio: "08:45", horaFin: "09:30" })).toBe(false);
    expect(seSolapan({ horaInicio: "08:00", horaFin: "08:45" }, { horaInicio: "08:40", horaFin: "09:20" })).toBe(true);
    expect(seSolapan({ horaInicio: "09:00", horaFin: "09:10" }, { horaInicio: "08:00", horaFin: "10:00" })).toBe(true);
  });

  it("detecta al profesor ocupado en otro salón aunque las horas del nivel sean distintas", () => {
    const ocupados = [ocup({ horaInicio: "08:40", horaFin: "09:20", salonNombre: "Inicial 5 años" })];
    const cruce = buscarCruce({ profesorId: "p1", dia: 1, horaInicio: "08:45", horaFin: "09:30" }, ocupados);
    expect(cruce?.salonNombre).toBe("Inicial 5 años");
    expect(mensajeCruce("Lucía García", cruce!)).toBe("Lucía García ya tiene Matemática en Inicial 5 años el lunes de 08:40–09:20. Elige otra hora u otro curso.");
  });

  it("no hay cruce con otro día, otro profesor o el mismo casillero que se reemplaza", () => {
    const ocupados = [ocup()];
    expect(buscarCruce({ profesorId: "p1", dia: 2, horaInicio: "08:00", horaFin: "08:45" }, ocupados)).toBeNull();
    expect(buscarCruce({ profesorId: "p2", dia: 1, horaInicio: "08:00", horaFin: "08:45" }, ocupados)).toBeNull();
    expect(buscarCruce({ profesorId: "p1", dia: 1, horaInicio: "08:00", horaFin: "08:45" }, ocupados, "b1")).toBeNull();
  });

  it("lista los pares que se cruzan de un mismo profesor", () => {
    const pares = crucesDe([ocup(), ocup({ id: "b2", salonId: "s2", horaInicio: "08:30", horaFin: "09:15" }), ocup({ id: "b3", horaInicio: "09:15", horaFin: "10:00" })]);
    expect(pares.map(([a, b]) => [a.id, b.id])).toEqual([["b1", "b2"]]);
  });
});

describe("ahora y después", () => {
  const bloques = [
    { id: "c", titulo: "Ciencia", horaInicio: "10:45", horaFin: "11:30" },
    { id: "a", titulo: "Matemática", horaInicio: "08:00", horaFin: "08:45" },
    { id: "b", titulo: "Comunicación", horaInicio: "08:45", horaFin: "09:30" },
  ];
  it("elige el bloque en curso y el siguiente, aunque vengan desordenados", () => {
    expect(ahoraYDespues(bloques, "08:45")).toMatchObject({ ahora: { id: "b" }, despues: { id: "c" } });
    expect(ahoraYDespues(bloques, "07:30")).toMatchObject({ ahora: null, despues: { id: "a" } });
  });
  it("en el recreo no hay bloque ahora y después de la última clase no hay nada", () => {
    expect(ahoraYDespues(bloques, "10:00")).toMatchObject({ ahora: null, despues: { id: "c" } });
    expect(ahoraYDespues(bloques, "11:30")).toEqual({ ahora: null, despues: null });
  });
});

describe("días", () => {
  it("lunes = 1 … domingo = 7; el fin de semana se muestra el lunes", () => {
    expect(diaDeSemana("2026-11-02")).toBe(1);
    expect(diaDeSemana("2026-11-06")).toBe(5);
    expect(diaDeSemana("2026-11-08")).toBe(7);
    expect(diaPorDefecto("2026-11-04")).toBe(3);
    expect(diaPorDefecto("2026-11-07")).toBe(1);
  });
});

describe("horas del día", () => {
  it("las horas sugeridas de cada nivel son válidas; inicial termina antes que primaria", () => {
    for (const lista of Object.values(PERIODOS_SUGERIDOS)) expect(validarPeriodos(lista)).toBeNull();
    expect(PERIODOS_SUGERIDOS.inicial.at(-1)!.horaFin < PERIODOS_SUGERIDOS.primaria.at(-1)!.horaFin).toBe(true);
    expect(PERIODOS_SUGERIDOS.primaria.some((p) => p.tipo === "recreo")).toBe(true);
  });
  it("rechaza horas mal escritas, al revés o que se cruzan", () => {
    expect(validarPeriodos([])).toBe("Agrega al menos una hora.");
    expect(validarPeriodos([{ nombre: "1.ª hora", horaInicio: "8:00", horaFin: "08:45", tipo: "clase" }])).toMatch(/formato 08:00/);
    expect(validarPeriodos([{ nombre: "1.ª hora", horaInicio: "09:00", horaFin: "08:45", tipo: "clase" }])).toMatch(/antes que la de fin/);
    expect(validarPeriodos([
      { nombre: "1.ª hora", horaInicio: "08:00", horaFin: "08:45", tipo: "clase" },
      { nombre: "2.ª hora", horaInicio: "08:30", horaFin: "09:15", tipo: "clase" },
    ])).toBe("«1.ª hora» (08:00–08:45) y «2.ª hora» (08:30–09:15) se cruzan.");
  });
});

describe("horario del seed", () => {
  const clases = PERIODOS_SUGERIDOS.primaria.filter((p) => p.tipo === "clase").map((p, i) => ({ ...p, id: `pp${i}` }));
  const clasesSec = PERIODOS_SUGERIDOS.secundaria.filter((p) => p.tipo === "clase").map((p, i) => ({ ...p, id: `ps${i}` }));
  // La misma profesora dicta Matemática en tres salones y es tutora de dos: el caso que más cruza.
  const salones = [
    { id: "a", nombre: "3.° A", tutorId: "lucia", clases, cursos: [{ id: "a1", nombre: "Matemática", profesorId: "lucia" }, { id: "a2", nombre: "Comunicación", profesorId: "pedro" }] },
    { id: "b", nombre: "3.° B", tutorId: "lucia", clases, cursos: [{ id: "b1", nombre: "Matemática", profesorId: "lucia" }, { id: "b2", nombre: "Comunicación", profesorId: "pedro" }] },
    { id: "c", nombre: "1.° Sec", tutorId: "pedro", clases: clasesSec, cursos: [{ id: "c1", nombre: "Matemática", profesorId: "lucia" }, { id: "c2", nombre: "Historia", profesorId: null }] },
  ];

  it("es determinista, pone Tutoría con el tutor y nunca cruza a un profesor", () => {
    const uno = planificarHorario(structuredClone(salones), []);
    expect(planificarHorario(structuredClone(salones), [])).toEqual(uno);
    expect(uno.filter((b) => b.titulo === "Tutoría").map((b) => [b.salonId, b.profesorId])).toEqual([["a", "lucia"], ["b", "lucia"], ["c", "pedro"]]);
    const todas = [...clases, ...clasesSec];
    const ocupaciones = uno.filter((b) => b.profesorId).map((b, i) => {
      const p = todas.find((x) => x.id === b.periodoId)!;
      return ocup({ id: String(i), profesorId: b.profesorId!, dia: b.dia, salonId: b.salonId, horaInicio: p.horaInicio, horaFin: p.horaFin });
    });
    expect(crucesDe(ocupaciones)).toEqual([]);
    // Cada salón tiene a lo más un bloque por casillero y ningún curso más de dos veces al día.
    const claves = uno.map((b) => `${b.salonId}-${b.dia}-${b.periodoId}`);
    expect(new Set(claves).size).toBe(claves.length);
    const porDia = new Map<string, number>();
    for (const b of uno) if (b.cursoId) porDia.set(`${b.cursoId}-${b.dia}`, (porDia.get(`${b.cursoId}-${b.dia}`) ?? 0) + 1);
    expect(Math.max(...porDia.values())).toBeLessThanOrEqual(2);
  });

  it("respeta lo ya ocupado por otros salones", () => {
    const ocupados = [ocup({ profesorId: "pedro", dia: 1, horaInicio: "07:00", horaFin: "14:00" })];
    const plan = planificarHorario(structuredClone(salones.slice(0, 1)), ocupados);
    expect(plan.some((b) => b.dia === 1 && b.profesorId === "pedro")).toBe(false);
  });
});
