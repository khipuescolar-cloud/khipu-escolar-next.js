// Rectificación de la libreta desde «Calificación del periodo» (specs/37 y 47): solo el profesor que dicta el curso la pide,
// con el curso enviado y la libreta del alumno emitida; dirección la resuelve. Requiere la BD local.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { datosCalificacionPeriodo, enviarCalificacionPeriodo, guardarBorradorPeriodo } from "@/lib/server/calificacion-periodo";
import { emitirLibretas, resolverRectificacion, solicitarRectificacion } from "@/lib/server/libreta-emision";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";
const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const AHORA = new Date("2026-08-15T15:00:00-05:00");
let c: ColegioPrueba;
let periodoId: string;
let competencia: string;

const pedido = (valor = "B") => ({
  alumnoId: c.alumnos.mateo.id, periodoId, competenciaId: competencia, valor,
  conclusion: "Debe reforzar la resta con canje.", motivo: "Se digitó AD por error al pasar las notas.",
});

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-rectif-periodo" });
  periodoId = (await c.db.periodo.create({
    data: { tenantId: c.tenant.id, anio: 2026, tipo: "bimestre", numero: 1, nombre: "I Bimestre", niveles: ["primaria"], inicio: dia("2026-03-01"), fin: dia("2026-05-15") },
  })).id;
  competencia = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Resuelve problemas de cantidad" } })).id;
  const r = await guardarBorradorPeriodo(c.ctxDe("tutora"), {
    cursoId: c.cursoTutora.id, periodoId,
    celdas: [{ alumnoId: c.alumnos.mateo.id, competenciaId: competencia, valor: "AD", conclusion: "" }, { alumnoId: c.alumnos.valentina.id, competenciaId: competencia, valor: "A", conclusion: "" }],
  }, AHORA);
  expect(r.ok).toBe(true);
}, 60_000);
afterAll(async () => { await c?.limpiar(); await db.$disconnect(); }, 60_000);

describe("rectificación desde Calificación del periodo", () => {
  it("sin enviar la calificación del periodo no se pide: se corrige directamente", async () => {
    expect(await solicitarRectificacion(c.ctxDe("tutora"), pedido()))
      .toEqual({ ok: false, error: "La calificación del periodo aún no se envió: corrígela directamente antes de enviarla." });
  });

  it("enviada pero sin libreta emitida no se pide: hay que pedir a dirección reabrir el curso", async () => {
    expect((await enviarCalificacionPeriodo(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId }, AHORA)).ok).toBe(true);
    expect(await solicitarRectificacion(c.ctxDe("tutora"), pedido()))
      .toEqual({ ok: false, error: expect.stringContaining("pide a dirección reabrir el curso") });
    expect((await datosCalificacionPeriodo(c.ctxDe("tutora"), c.cursoTutora.id, periodoId, AHORA)).emitidas).toEqual([]);
  });

  it("otro profesor y dirección no la piden; el profesor del curso sí, una pendiente por competencia", async () => {
    await emitirLibretas(c.ctxDe("direccion"), periodoId);
    await esperarProhibido(solicitarRectificacion(c.ctxDe("otroProfesor"), pedido()));
    await esperarProhibido(solicitarRectificacion(c.ctxDe("direccion"), pedido()));
    expect(await solicitarRectificacion(c.ctxDe("tutora"), pedido()))
      .toEqual({ ok: true, mensaje: "Rectificación enviada. Dirección la revisará." });
    expect(await solicitarRectificacion(c.ctxDe("tutora"), pedido("A")))
      .toEqual({ ok: false, error: "Ya hay una rectificación pendiente para esta competencia." });
    const d = await datosCalificacionPeriodo(c.ctxDe("tutora"), c.cursoTutora.id, periodoId, AHORA);
    expect(new Set(d.emitidas)).toEqual(new Set([c.alumnos.mateo.id, c.alumnos.valentina.id]));
    expect(d.rectificaciones).toEqual([expect.objectContaining({ alumnoId: c.alumnos.mateo.id, competenciaId: competencia, estado: "pendiente", valorAnterior: "AD", valorLiteral: "B" })]);
  });

  it("dirección la aprueba: la calificación del periodo muestra el valor nuevo y la solicitud aprobada", async () => {
    const r = await c.db.rectificacionLibreta.findFirstOrThrow({ where: { periodoId } });
    expect(await resolverRectificacion(c.ctxDe("direccion"), { id: r.id, decision: "aprobada" })).toMatchObject({ ok: true });
    const d = await datosCalificacionPeriodo(c.ctxDe("tutora"), c.cursoTutora.id, periodoId, AHORA);
    expect(d.guardadas.find((g) => g.alumnoId === c.alumnos.mateo.id)).toMatchObject({ valorLiteral: "B" });
    expect(d.rectificaciones[0]).toMatchObject({ estado: "aprobada" });
  });
});
