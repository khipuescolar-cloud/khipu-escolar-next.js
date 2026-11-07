import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { crearCalificacion, cursosDelRegistro, registroDelCurso } from "@/lib/server/registro-notas";
import { guardarNota } from "@/lib/server/notas";
import { crearTarea, calificarEntrega } from "@/lib/server/tareas";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";
let c: ColegioPrueba;
let otro: ColegioPrueba;
let periodoId: string;
let competenciaId: string;
const clave = randomUUID();
const hoy = new Date();
const fecha = hoy.toISOString().slice(0, 10);
beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-registro" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-registro-otro" });
  const p = await c.db.periodo.create({ data: { tenantId: c.tenant.id, anio: hoy.getUTCFullYear(), tipo: "bimestre", numero: 1, nombre: "Periodo abierto", inicio: new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1)), fin: new Date(Date.UTC(hoy.getUTCFullYear(), 11, 31)), niveles: ["primaria"] } });
  periodoId = p.id;
  competenciaId = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Resuelve problemas" } })).id;
});
afterAll(async () => { await c.limpiar(); await otro.limpiar(); await db.$disconnect(); });

describe("Registro de notas", () => {
  it("muestra solo cursos propios y alumnos matriculados", async () => {
    const cursos = await cursosDelRegistro(c.ctxDe("tutora"));
    expect(cursos.map((x) => x.id)).toContain(c.cursoTutora.id);
    expect(cursos.map((x) => x.id)).not.toContain(c.cursoAjeno.id);
    const registro = await registroDelCurso(c.ctxDe("tutora"), c.cursoTutora.id, periodoId);
    expect(registro.alumnos.map((x) => x.id).sort()).toEqual([c.alumnos.mateo.id, c.alumnos.valentina.id].sort());
    await expect(registroDelCurso(c.ctxDe("tutora"), c.cursoAjeno.id, periodoId)).rejects.toMatchObject({ digest: expect.stringContaining(";403") });
    await expect(registroDelCurso(c.ctxDe("tutora"), otro.cursoTutora.id, periodoId)).rejects.toMatchObject({ digest: expect.stringContaining(";403") });
  });
  it("crea una sola evaluación con fecha académica, notas parciales e historial", async () => {
    const entrada = { cursoId: c.cursoTutora.id, periodoId, competenciaId, claveIdempotencia: clave, nombre: "Práctica", descripcion: "Suma", fecha, notas: [{ alumnoId: c.alumnos.mateo.id, valor: "A" }] };
    const primero = await crearCalificacion(c.ctxDe("tutora"), entrada);
    expect(primero.ok).toBe(true);
    expect((await crearCalificacion(c.ctxDe("tutora"), entrada)).ok).toBe(true);
    const ev = await c.db.evaluacion.findFirstOrThrow({ where: { claveIdempotencia: clave } });
    expect(ev.fecha.toISOString().slice(0, 10)).toBe(fecha);
    expect(ev.creadaAt.getTime()).toBeGreaterThanOrEqual(ev.fecha.getTime());
    expect(ev.descripcion).toBe("Suma");
    expect(await c.db.evaluacion.count({ where: { claveIdempotencia: clave } })).toBe(1);
    expect(await c.db.nota.count({ where: { evaluacionId: ev.id } })).toBe(1);
    expect(await c.db.historialNota.count({ where: { evaluacionId: ev.id } })).toBe(1);
    const registro = await registroDelCurso(c.ctxDe("tutora"), c.cursoTutora.id, periodoId);
    expect(registro.evaluaciones.find((e) => e.id === ev.id)?.competenciaId).toBe(competenciaId);
    expect(registro.evaluaciones.find((e) => e.id === ev.id)?.notas.some((n) => n.alumnoId === c.alumnos.valentina.id)).toBe(false);
    expect((await guardarNota(c.ctxDe("tutora"), { evaluacionId: ev.id, alumnoId: c.alumnos.mateo.id, valor: "B" })).ok).toBe(true);
    expect(await c.db.historialNota.count({ where: { evaluacionId: ev.id } })).toBe(2);
  });
  it("una tarea de dos secciones comparte notas y conserva la competencia elegida en cada una", async () => {
    const gemelo = await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.otroSalon.id, nombre: "Matemática", profesorId: c.miembros.tutora.membership.id } });
    const competenciaGemela = await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: gemelo.id, nombre: "Resuelve problemas de cantidad" } });
    const r = await crearTarea(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, titulo: "Práctica compartida", calificable: true, competenciaId,
      secciones: [{ cursoId: c.cursoTutora.id, competenciaId, todos: true }, { cursoId: gemelo.id, competenciaId: competenciaGemela.id, todos: true }] });
    expect(r.ok).toBe(true);
    const evaluaciones = await c.db.evaluacion.findMany({ where: { tareaId: r.tareaId } });
    expect(evaluaciones).toHaveLength(2);
    expect(evaluaciones.find((e) => e.cursoId === gemelo.id)?.competenciaId).toBe(competenciaGemela.id);
    const asignacion = await c.db.tareaAsignacion.findFirstOrThrow({ where: { tareaId: r.tareaId, alumnoId: c.alumnos.mateo.id } });
    expect((await calificarEntrega(c.ctxDe("tutora"), asignacion.id, { valor: "A" })).ok).toBe(true);
    const ev = evaluaciones.find((e) => e.cursoId === c.cursoTutora.id)!;
    const registro = await registroDelCurso(c.ctxDe("tutora"), c.cursoTutora.id, periodoId);
    expect(registro.evaluaciones.find((e) => e.id === ev.id)?.notas.find((n) => n.alumnoId === c.alumnos.mateo.id)?.valorLiteral).toBe("A");
    expect(await c.db.nota.count({ where: { evaluacionId: ev.id, alumnoId: c.alumnos.mateo.id } })).toBe(1);
  });
  it("exige competencia y bloquea periodo cerrado", async () => {
    const base = { cursoId: c.cursoTutora.id, periodoId, claveIdempotencia: randomUUID(), nombre: "Otra", fecha, notas: [] };
    expect((await crearCalificacion(c.ctxDe("tutora"), base)).ok).toBe(false);
    await c.db.periodo.update({ where: { id: periodoId }, data: { cerrado: true } });
    expect((await crearCalificacion(c.ctxDe("tutora"), { ...base, competenciaId, claveIdempotencia: randomUUID() })).ok).toBe(false);
  });
});
