// Control de ingreso automático (specs/05): «aún no llega», falta automática y bloqueo en las listas de curso.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fechaDb } from "@/lib/fechas";
import { guardarLista } from "@/lib/server/asistencia";
import { controlDelColegio } from "@/lib/server/control-ingreso";
import { db } from "@/lib/server/db";
import { registrarLlegadaManual } from "@/lib/server/porteria";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

// Miércoles 4 de noviembre de 2026 (día hábil), hora de Lima.
const a = (hora: string, dia = "2026-11-04") => new Date(`${dia}T${hora}:00-05:00`);

describe("control de ingreso automático", () => {
  let c: ColegioPrueba;
  const tenant = () => db.tenant.findUniqueOrThrow({ where: { id: c.tenant.id } });

  beforeAll(async () => {
    c = await crearColegioPrueba({ prefijo: "test-ingreso" });
    const t = await db.tenant.update({ where: { id: c.tenant.id }, data: { controlIngresoAutomatico: true, horaLimiteFalta: "09:00" } });
    Object.assign(c.tenant, t); // los ctx de prueba leen este mismo objeto
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  it("antes de la hora de tardanza no hace nada", async () => {
    expect(await controlDelColegio(await tenant(), a("07:30"))).toBeNull();
  });

  it("si nadie pasó por portería ese día, no avisa a todo el colegio", async () => {
    expect(await controlDelColegio(await tenant(), a("08:05"))).toBeNull();
    expect(await c.db.aviso.count()).toBe(0);
  });

  it("a la hora de tardanza avisa «aún no llega» una sola vez, con saludo a la familia", async () => {
    await registrarLlegadaManual(c.ctxDe("porteria"), c.alumnos.valentina.id, a("07:50"));
    const r = await controlDelColegio(await tenant(), a("08:05"));
    expect(r).toEqual({ avisosNoLlega: 1, faltas: 0 }); // Mateo (Rosa); Thiago no tiene familia con avisos
    const aviso = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "asistencia_no_llega" } });
    expect(aviso.asunto).toBe("Mateo aún no llega al colegio");
    expect(aviso.payload).toMatchObject({ saludo: "Buenos días, Rosa.", horaTardanza: "08:00", horaFalta: "09:00" });
    expect(await controlDelColegio(await tenant(), a("08:30"))).toBeNull();
    expect(await c.db.aviso.count({ where: { plantilla: "asistencia_no_llega" } })).toBe(1);
  });

  it("en la lista de un curso, quien no ingresó al colegio solo puede quedar con falta", async () => {
    const lista = (estado: "llego" | "falta") => ({
      salonId: c.salon.id, ambito: c.cursoTutora.id,
      registros: [{ alumnoId: c.alumnos.mateo.id, estado }, { alumnoId: c.alumnos.valentina.id, estado: "llego" as const }],
    });
    await expect(guardarLista(c.ctxDe("tutora"), lista("llego"), a("08:20"))).rejects.toThrow(/Mateo no registra ingreso al colegio/);
    const r = await guardarLista(c.ctxDe("tutora"), lista("falta"), a("08:20"));
    expect(r).toMatchObject({ cambios: 2, familiasAvisadas: 0 }); // no se avisa la falta a clase de quien no llegó
  });

  it("a la hora límite pone falta del día y avisa para justificar; quien ya llegó no se toca", async () => {
    const r = await controlDelColegio(await tenant(), a("09:01"));
    expect(r).toEqual({ avisosNoLlega: 0, faltas: 2 }); // Mateo y Thiago
    const fecha = fechaDb("2026-11-04");
    const faltas = await c.db.asistencia.findMany({ where: { fecha, ambito: "dia", estado: "falta" } });
    expect(faltas.map((f) => f.alumnoId).sort()).toEqual([c.alumnos.mateo.id, c.alumnos.thiago.id].sort());
    expect(faltas.every((f) => f.origen === "automatico" && f.registradoPorId === null && f.hora === "09:00")).toBe(true);
    const aviso = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "asistencia_falta" } });
    expect(aviso.payload).toMatchObject({ horaLimite: "09:00", saludo: "Buenos días, Rosa." });
    expect((aviso.payload as { justificacionTokenId?: string }).justificacionTokenId).toBeTruthy();
    expect((await c.db.asistencia.findFirstOrThrow({ where: { alumnoId: c.alumnos.valentina.id, fecha, ambito: "dia" } })).estado).toBe("llego");
    expect(await controlDelColegio(await tenant(), a("09:30"))).toBeNull();
  });

  it("si llega después, al escanear la falta pasa a tardanza y se avisa", async () => {
    const r = await registrarLlegadaManual(c.ctxDe("porteria"), c.alumnos.mateo.id, a("09:20"));
    expect(r).toMatchObject({ ok: true, tipo: "registrado", estado: "tarde" });
    const aviso = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "asistencia_tarde" } });
    expect(aviso.asunto).toBe("Mateo llegó tarde hoy");
  });

  it("no corre los fines de semana", async () => {
    expect(await controlDelColegio(await tenant(), a("08:05", "2026-11-07"))).toBeNull();
  });
});
