import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardarLista } from "@/lib/server/asistencia";
import { tableroInicio } from "@/lib/server/inicio-tablero";
import { justificarConSesion } from "@/lib/server/justificaciones";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

// specs/18 · Inicio: el tablero «lo que te toca hoy» cuenta pendientes con el alcance de cada rol.
// Miércoles 4/11/2026, 10:00 en Lima.
const AHORA = new Date("2026-11-04T15:00:00Z");
const DOMINGO = new Date("2026-11-08T15:00:00Z");

describe("inicio: tablero de lo que te toca hoy", () => {
  let c: ColegioPrueba;

  beforeAll(async () => {
    c = await crearColegioPrueba({ plan: "pro", prefijo: "test-inicio" });
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  it("la tutora ve su lista del día por pasar y desaparece al pasarla; el otro profesor solo ve la suya", async () => {
    const antes = await tableroInicio(c.ctxDe("tutora"), AHORA);
    expect(antes.hoy).toMatchObject({ isoFecha: "2026-11-04", hora: "10:00", habil: true });
    expect(antes.listas.map((l) => [l.salonId, l.titulo])).toEqual([[c.salon.id, "Asistencia del día"]]);
    expect(antes.pendientes.find((p) => p.clave === "listas")).toMatchObject({ cantidad: 1, seccion: "dia", accion: "Pasar lista" });
    expect((await tableroInicio(c.ctxDe("otroProfesor"), AHORA)).listas.map((l) => l.salonId)).toEqual([c.otroSalon.id]);

    await guardarLista(c.ctxDe("tutora"), {
      salonId: c.salon.id, ambito: "dia",
      registros: [{ alumnoId: c.alumnos.mateo.id, estado: "falta" }, { alumnoId: c.alumnos.valentina.id, estado: "llego" }],
    }, AHORA);
    const despues = await tableroInicio(c.ctxDe("tutora"), AHORA);
    expect(despues.listas).toEqual([]);
    expect(despues.pendientes.some((p) => p.clave === "listas")).toBe(false);
    // En fin de semana no hay listas por pasar.
    expect((await tableroInicio(c.ctxDe("otroProfesor"), DOMINGO)).listas).toEqual([]);
  });

  it("la familia ve la llegada de hoy solo de sus hijos y la tutora la justificación por revisar", async () => {
    const madre = await tableroInicio(c.ctxDe("madre"), AHORA);
    expect(madre.llegadas).toEqual([expect.objectContaining({ alumnoId: c.alumnos.mateo.id, nombre: "Mateo", estado: "falta" })]);
    expect(madre.colegio).toBeNull();
    expect(madre.pendientes.some((p) => p.clave === "justificaciones")).toBe(false);

    const falta = await c.db.asistencia.findFirstOrThrow({ where: { alumnoId: c.alumnos.mateo.id, ambito: "dia" } });
    expect(await justificarConSesion(c.ctxDe("madre"), falta.id, { motivo: "Cita médica", archivo: null }, AHORA)).toMatchObject({ ok: true });
    expect((await tableroInicio(c.ctxDe("tutora"), AHORA)).pendientes.find((p) => p.clave === "justificaciones")?.cantidad).toBe(1);
    expect((await tableroInicio(c.ctxDe("otroProfesor"), AHORA)).pendientes.some((p) => p.clave === "justificaciones")).toBe(false);
  });

  it("dirección ve la asistencia del colegio con los salones sin lista; portería, los ingresos del día", async () => {
    const dir = await tableroInicio(c.ctxDe("direccion"), AHORA);
    expect(dir.colegio).toMatchObject({ total: 3, falta: 1, llego: 1, sinRegistrar: 1, sinLista: 1 });
    expect(dir.pendientes.find((p) => p.clave === "salones-sin-lista")).toMatchObject({ cantidad: 1, detalle: "5.° A" });
    expect(dir.listas).toEqual([]);

    const porteria = await tableroInicio(c.ctxDe("porteria"), AHORA);
    expect(porteria.porteria).toEqual({ llegaron: 1, tarde: 0, salidas: 0, sinIngreso: 2, total: 3 });
    expect(porteria.pendientes).toEqual([]);
  });
});
