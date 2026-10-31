import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardarLista } from "@/lib/server/asistencia";
import {
  contarPendientes, historialJustificaciones, justificarConSesion, pendientesPorRevisar, revisarJustificacion, salonesDeJustificaciones,
} from "@/lib/server/justificaciones";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

// specs/07: «Por revisar» (solo pendientes, la más antigua primero) e «Historial» con filtros y paginación.
describe("justificaciones: por revisar e historial", () => {
  let c: ColegioPrueba;
  let idAceptada: string;

  beforeAll(async () => {
    c = await crearColegioPrueba();
    // Dos faltas de Mateo en días distintos, justificadas por la madre; una se acepta.
    for (const fecha of ["2026-10-26", "2026-10-27"]) {
      await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.mateo.id, estado: "falta" }] }, new Date(`${fecha}T13:00:00Z`));
    }
    const faltas = await c.db.asistencia.findMany({ where: { alumnoId: c.alumnos.mateo.id }, orderBy: { fecha: "asc" } });
    for (const f of faltas) {
      const r = await justificarConSesion(c.ctxDe("madre"), f.id, { motivo: `Fiebre ${f.fecha.toISOString().slice(0, 10)}`, archivo: null }, new Date("2026-10-28T13:00:00Z"));
      expect(r).toMatchObject({ ok: true });
    }
    const primera = await c.db.justificacion.findFirstOrThrow({ where: { asistenciaId: faltas[0].id } });
    await revisarJustificacion(c.ctxDe("tutora"), { id: primera.id, decision: "aceptada" });
    idAceptada = primera.id;
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  it("por revisar solo trae pendientes y el contador coincide", async () => {
    const pendientes = await pendientesPorRevisar(c.ctxDe("tutora"));
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].estado).toBe("pendiente");
    expect(await contarPendientes(c.ctxDe("tutora"))).toBe(1);
    expect(await contarPendientes(c.ctxDe("otroProfesor"))).toBe(0);
  });

  it("el historial trae todas y filtra por estado, alumno y fecha de la falta", async () => {
    const todas = await historialJustificaciones(c.ctxDe("direccion"), {});
    expect(todas).toMatchObject({ total: 2, pagina: 1, paginas: 1 });
    expect((await historialJustificaciones(c.ctxDe("direccion"), { estado: "aceptada" })).filas.map((f) => f.id)).toEqual([idAceptada]);
    expect((await historialJustificaciones(c.ctxDe("direccion"), { q: "quispe mat" })).total).toBe(2);
    expect((await historialJustificaciones(c.ctxDe("direccion"), { q: "Valentina" })).total).toBe(0);
    expect((await historialJustificaciones(c.ctxDe("direccion"), { desde: "2026-10-27", hasta: "2026-10-27" })).filas).toHaveLength(1);
    expect((await historialJustificaciones(c.ctxDe("direccion"), { salonId: c.otroSalon.id })).total).toBe(0);
  });

  it("el tutor solo ve su salón; la familia no entra al historial", async () => {
    expect((await historialJustificaciones(c.ctxDe("otroProfesor"), {})).total).toBe(0);
    expect((await salonesDeJustificaciones(c.ctxDe("tutora"))).map((s) => s.id)).toEqual([c.salon.id]);
    await esperarProhibido(historialJustificaciones(c.ctxDe("madre"), {}));
    await esperarProhibido(pendientesPorRevisar(c.ctxDe("madre")));
  });

  it("rechaza un rango de fechas al revés", async () => {
    await expect(historialJustificaciones(c.ctxDe("direccion"), { desde: "2026-10-28", hasta: "2026-10-01" })).rejects.toThrow();
  });
});
