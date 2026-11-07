// NSP en el registro de notas nuevo (specs/37 y 47): crearCalificacion aplica la misma regla que crearEvaluacion.
// Requiere la BD local.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fechaDb, momentoEnZona, sumarDias } from "@/lib/fechas";
import { db } from "@/lib/server/db";
import { justificacionDelDia } from "@/lib/server/nsp";
import { decidirRecuperacion, guardarNota, publicarEvaluacion } from "@/lib/server/notas";
import { revisarJustificacion, justificarConSesion } from "@/lib/server/justificaciones";
import { crearCalificacion, registroDelCurso } from "@/lib/server/registro-notas";
import { crearTarea } from "@/lib/server/tareas";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";
let c: ColegioPrueba;
let periodoId: string;
let competenciaId: string;
let hoy: string;
const ayer = () => sumarDias(hoy, -1);

async function falta(alumnoId: string, fecha: string) {
  return c.db.asistencia.create({ data: { tenantId: c.tenant.id, alumnoId, cursoId: null, ambito: "dia", fecha: fechaDb(fecha), hora: "08:00", estado: "falta", origen: "lista" } });
}
const nueva = (fecha: string, notas: { alumnoId: string; valor: string }[], nombre = `Prueba ${randomUUID().slice(0, 6)}`) =>
  crearCalificacion(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId, competenciaId, claveIdempotencia: randomUUID(), nombre, fecha, notas });

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-registro-nsp" });
  hoy = momentoEnZona(new Date(), c.tenant.zonaHoraria).isoFecha;
  const anio = Number(hoy.slice(0, 4));
  periodoId = (await c.db.periodo.create({ data: { tenantId: c.tenant.id, anio, tipo: "bimestre", numero: 1, nombre: "Periodo abierto", inicio: new Date(Date.UTC(anio, 0, 1)), fin: new Date(Date.UTC(anio, 11, 31)), niveles: ["primaria"] } })).id;
  competenciaId = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Resuelve problemas" } })).id;
}, 60_000);
afterAll(async () => { await c?.limpiar(); await db.$disconnect(); }, 60_000);

describe("crearCalificacion y NSP", () => {
  it("marca NSP al ausente sin justificar y no a un pendiente que sí asistió; nace en borrador", async () => {
    const f = ayer();
    await falta(c.alumnos.mateo.id, f);
    const r = await nueva(f, []); // ninguna nota escrita: ambos alumnos pendientes
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mensaje).toContain("1 alumno quedó con NSP por inasistencia");
    const ev = await c.db.evaluacion.findFirstOrThrow({ where: { id: r.evaluacionId } });
    expect(ev.estado).toBe("programada");
    expect(await c.db.nota.findFirst({ where: { evaluacionId: ev.id, alumnoId: c.alumnos.mateo.id } })).toMatchObject({ marca: "nsp", valorLiteral: null, registradoPorId: null });
    expect(await c.db.nota.findFirst({ where: { evaluacionId: ev.id, alumnoId: c.alumnos.valentina.id } })).toBeNull(); // pendiente ≠ NSP
    const h = await c.db.historialNota.findFirstOrThrow({ where: { evaluacionId: ev.id, alumnoId: c.alumnos.mateo.id } });
    expect(h).toMatchObject({ tipo: "cambio_asistencia", valorNuevo: "NSP", publicada: false });
    // Reintento con la misma clave: no duplica ni cambia nada.
    const registro = await registroDelCurso(c.ctxDe("tutora"), c.cursoTutora.id, periodoId);
    expect(registro.estadosNsp[`${ev.id}:${c.alumnos.mateo.id}`]).toMatchObject({ justificacion: "sin_solicitud", recuperacion: null });
  });

  it("no pisa la nota que el profesor escribió a un ausente y no crea NSP en una fecha sin falta", async () => {
    const f = sumarDias(hoy, -2);
    await falta(c.alumnos.valentina.id, f);
    const r = await nueva(f, [{ alumnoId: c.alumnos.valentina.id, valor: "B" }]);
    expect(r.ok && r.evaluacionId).toBeTruthy();
    if (!r.ok) return;
    expect(await c.db.nota.findFirst({ where: { evaluacionId: r.evaluacionId, alumnoId: c.alumnos.valentina.id } })).toMatchObject({ valorLiteral: "B", marca: null });
    const sin = await nueva(sumarDias(hoy, -3), []);
    expect(sin.ok && sin.mensaje).toBe("Calificación guardada.");
    expect(await c.db.nota.count({ where: { evaluacionId: sin.ok ? sin.evaluacionId : "", marca: "nsp" } })).toBe(0);
  });

  it("una tarea calificable nunca genera NSP, aunque el alumno haya faltado", async () => {
    const f = sumarDias(hoy, -4);
    await falta(c.alumnos.mateo.id, f);
    const t = await crearTarea(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, titulo: "Tarea con falta", calificable: true, competenciaId, secciones: [{ cursoId: c.cursoTutora.id, competenciaId, todos: true }] });
    expect(t.ok).toBe(true);
    const ev = await c.db.evaluacion.findFirstOrThrow({ where: { tareaId: t.ok ? t.tareaId : "" } });
    await c.db.evaluacion.update({ where: { id: ev.id }, data: { fecha: fechaDb(f) } });
    const { sincronizarNsp } = await import("@/lib/server/nsp");
    const s = await sincronizarNsp(c.db, c.tenant, { evaluacionIds: [ev.id] });
    expect(s.creados).toBe(0);
    expect(await c.db.nota.count({ where: { evaluacionId: ev.id, marca: "nsp" } })).toBe(0);
    expect((await guardarNota(c.ctxDe("tutora"), { evaluacionId: ev.id, alumnoId: c.alumnos.mateo.id, valor: "NSP" })).ok).toBe(false);
  });
});

describe("recuperación desde el registro", () => {
  it("autoriza tras la justificación y registra la nota con su fecha en la actividad original", async () => {
    const f = sumarDias(hoy, -5);
    const asistencia = await falta(c.alumnos.mateo.id, f);
    const r = await nueva(f, []);
    if (!r.ok || !r.evaluacionId) throw new Error("no se creó");
    const evaluacionId = r.evaluacionId;
    const tutora = c.ctxDe("tutora");
    // Sin justificación aprobada no se decide.
    expect(await decidirRecuperacion(tutora, { evaluacionId, alumnoId: c.alumnos.mateo.id, decision: "autorizada" })).toMatchObject({ ok: false });
    expect(await justificarConSesion(c.ctxDe("madre"), asistencia.id, { motivo: "Fiebre", archivo: null })).toMatchObject({ ok: true });
    const j = await justificacionDelDia(c.db, c.alumnos.mateo.id, fechaDb(f));
    expect(j).toBeTruthy();
    await revisarJustificacion(tutora, { id: j!.id, decision: "aceptada" });
    const antes = await registroDelCurso(tutora, c.cursoTutora.id, periodoId);
    expect(antes.estadosNsp[`${evaluacionId}:${c.alumnos.mateo.id}`]).toMatchObject({ justificacion: "aceptada", recuperacion: null });
    expect(await decidirRecuperacion(tutora, { evaluacionId, alumnoId: c.alumnos.mateo.id, decision: "autorizada" })).toMatchObject({ ok: true });
    expect(await guardarNota(tutora, { evaluacionId, alumnoId: c.alumnos.mateo.id, valor: "A", fechaRecuperacion: ayer() })).toEqual({ ok: true });
    const despues = await registroDelCurso(tutora, c.cursoTutora.id, periodoId);
    expect(despues.estadosNsp[`${evaluacionId}:${c.alumnos.mateo.id}`]).toBeUndefined(); // ya no es NSP
    const ev = despues.evaluaciones.find((e) => e.id === evaluacionId)!;
    expect(ev.fecha.toISOString().slice(0, 10)).toBe(f);
    expect(ev.notas.find((n) => n.alumnoId === c.alumnos.mateo.id)).toMatchObject({ valorLiteral: "A", recuperacion: "autorizada" });
    expect(ev.notas.find((n) => n.alumnoId === c.alumnos.mateo.id)?.fechaRecuperacion?.toISOString().slice(0, 10)).toBe(ayer());
    expect(await c.db.evaluacion.count({ where: { cursoId: c.cursoTutora.id, titulo: ev.titulo } })).toBe(1);
    expect(await publicarEvaluacion(tutora, ev.grupoId)).toMatchObject({ ok: true });
  });
});
