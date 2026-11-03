// NSP, justificaciones (15 días calendario), consecuencia por vencimiento, recuperación en la actividad original,
// incidencias, correcciones auditadas, libretas emitidas y resumen académico diario (specs/37). Casos 1–17 del pedido.
// Requiere la BD local.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { fechaDb, momentoEnZona, sumarDias } from "@/lib/fechas";
import { expiracionJustificacion } from "@/lib/plazo-justificacion";
import { actualizarReglasAcademicas } from "@/lib/server/configuracion";
import { registrarIncidencia, listarIncidencias } from "@/lib/server/incidencias";
import { justificarConSesion, revisarJustificacion } from "@/lib/server/justificaciones";
import { datosLibreta } from "@/lib/server/libreta";
import { emitirLibretas, resolverRectificacion, solicitarRectificacion } from "@/lib/server/libreta-emision";
import { crearEvaluacion, decidirRecuperacion, guardarCalificacionPeriodo, guardarNota, historialEvaluacion, publicarEvaluacion } from "@/lib/server/notas";
import { aplicarVencimientos, nspVencidosSinConsecuencia } from "@/lib/server/nsp";
import { resumenDelDia } from "@/lib/server/resumen-academico";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let otro: ColegioPrueba;
let periodoId: string;
const comp: Record<"mat" | "com" | "arte", string> = { mat: "", com: "", arte: "" };
const curso = { com: "", arte: "" };
let hoy: string;
const dia = (n: number) => sumarDias(hoy, -n);
const F = { caso1: "", incidencia: "", plazo15: "", plazo16: "", tresCursos: "", cruce: "", tarde: "" };

/** Contexto con el colegio recién leído de la BD (después de cambiar su configuración). */
async function ctxFresco(quien: Parameters<ColegioPrueba["ctxDe"]>[0]): Promise<TenantContext> {
  return { ...c.ctxDe(quien), tenant: await db.tenant.findUniqueOrThrow({ where: { id: c.tenant.id } }) };
}

async function falta(alumnoId: string, fecha: string, ambito = "dia", estado: "falta" | "llego" = "falta") {
  return c.db.asistencia.create({
    data: { tenantId: c.tenant.id, alumnoId, cursoId: ambito === "dia" ? null : ambito, ambito, fecha: fechaDb(fecha), hora: "08:00", estado, origen: "lista" },
  });
}

async function evaluacion(ctx: TenantContext, cursoId: string, competenciaId: string, titulo: string, fecha: string) {
  const r = await crearEvaluacion(ctx, { cursoId, periodoId, competenciaIds: [competenciaId], titulo, fecha, peso: "1" });
  expect(r).toMatchObject({ ok: true });
  return c.db.evaluacion.findFirstOrThrow({ where: { titulo, cursoId } });
}

const nota = (evaluacionId: string, alumnoId: string) => c.db.nota.findFirst({ where: { evaluacionId, alumnoId } });

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-nsp" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-nsp-otro" });
  hoy = momentoEnZona(new Date(), c.tenant.zonaHoraria).isoFecha;
  Object.assign(F, { caso1: dia(3), incidencia: dia(4), plazo15: dia(5), plazo16: dia(6), tresCursos: dia(7), cruce: dia(8), tarde: dia(20) });
  periodoId = (await c.db.periodo.create({
    data: { tenantId: c.tenant.id, anio: 2026, tipo: "trimestre", numero: 3, nombre: "III Trimestre", inicio: new Date("2026-09-01"), fin: new Date("2026-12-18") },
  })).id;
  const prof = c.miembros.otroProfesor.membership.id;
  curso.com = (await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Comunicación", profesorId: prof } })).id;
  curso.arte = (await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Arte", profesorId: prof } })).id;
  comp.mat = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Resuelve problemas", orden: 1 } })).id;
  comp.com = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: curso.com, nombre: "Lee", orden: 1 } })).id;
  comp.arte = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: curso.arte, nombre: "Crea", orden: 1 } })).id;
}, 60_000);

afterAll(async () => {
  await c?.limpiar();
  await otro?.limpiar();
}, 60_000);

describe("NSP por asistencia", () => {
  it("caso 1: ausente el día del examen → NSP, que no es una nota ni la pone una persona", async () => {
    await falta(c.alumnos.mateo.id, F.caso1);
    const e = await evaluacion(c.ctxDe("tutora"), c.cursoTutora.id, comp.mat, "Examen de multiplicación", F.caso1);
    const n = await nota(e.id, c.alumnos.mateo.id);
    expect(n).toMatchObject({ marca: "nsp", valorLiteral: null, valorNumerico: null, registradoPorId: null });
    expect(await nota(e.id, c.alumnos.valentina.id)).toBeNull(); // sin registro de falta: sin NSP
    const h = await historialEvaluacion(c.ctxDe("tutora"), e.grupoId);
    expect(h[0]).toMatchObject({ anterior: null, nuevo: "NSP", tipo: "cambio_asistencia", por: "Khipu" });
    // El profesor no puede escribir NSP ni borrarlo: lo pone y lo quita la asistencia.
    expect(await guardarNota(c.ctxDe("tutora"), { evaluacionId: e.id, alumnoId: c.alumnos.valentina.id, valor: "NSP" })).toMatchObject({ ok: false });
    expect(await guardarNota(c.ctxDe("tutora"), { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "A" })).toMatchObject({ ok: false });
  });

  it("caso 2: presente que no entregó → «No entregó» (NE), nunca NSP, con observación", async () => {
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Examen de multiplicación" } });
    expect(await guardarNota(c.ctxDe("tutora"), { evaluacionId: e.id, alumnoId: c.alumnos.valentina.id, valor: "ne" })).toEqual({ ok: true });
    expect(await nota(e.id, c.alumnos.valentina.id)).toMatchObject({ marca: "no_entrego", valorLiteral: null });
  });

  it("si la asistencia se corrige, el NSP se quita con historial; una calificación ya puesta no se pisa", async () => {
    const fecha = dia(9);
    const a = await falta(c.alumnos.valentina.id, fecha);
    const e = await evaluacion(c.ctxDe("tutora"), c.cursoTutora.id, comp.mat, "Lectura de cuaderno", fecha);
    expect((await nota(e.id, c.alumnos.valentina.id))?.marca).toBe("nsp");
    await c.db.asistencia.update({ where: { id: a.id }, data: { estado: "llego" } });
    const { sincronizarNsp } = await import("@/lib/server/nsp");
    expect(await sincronizarNsp(c.db, c.tenant, { fecha: fechaDb(fecha), alumnoIds: [c.alumnos.valentina.id] })).toMatchObject({ quitados: 1 });
    expect(await nota(e.id, c.alumnos.valentina.id)).toBeNull();
    // Ahora tiene nota y la asistencia vuelve a falta: la nota se respeta.
    await guardarNota(c.ctxDe("tutora"), { evaluacionId: e.id, alumnoId: c.alumnos.valentina.id, valor: "B" });
    await c.db.asistencia.update({ where: { id: a.id }, data: { estado: "falta" } });
    expect(await sincronizarNsp(c.db, c.tenant, { fecha: fechaDb(fecha), alumnoIds: [c.alumnos.valentina.id] })).toMatchObject({ creados: 0, quitados: 0 });
    expect(await nota(e.id, c.alumnos.valentina.id)).toMatchObject({ valorLiteral: "B", marca: null });
  });

  it("caso 12: entró al colegio y se retiró a media jornada → NSP solo en las clases afectadas; el detalle es reservado", async () => {
    await falta(c.alumnos.valentina.id, F.incidencia, "dia", "llego");
    const r = await registrarIncidencia(c.ctxDe("tutora"), {
      alumnoId: c.alumnos.valentina.id, fecha: F.incidencia, hora: "10:15", tipo: "accidente", descripcion: "Se golpeó en Educación Física.",
      retiro: true, horaRetiro: "10:30", cursoIds: [curso.com],
    });
    expect(r).toEqual({ ok: true, mensaje: "Incidencia registrada. Registramos la inasistencia en 1 clase y avisamos a 1 profesor." });
    const mat = await evaluacion(c.ctxDe("tutora"), c.cursoTutora.id, comp.mat, "Práctica temprana", F.incidencia);
    const com = await evaluacion(c.ctxDe("otroProfesor"), curso.com, comp.com, "Lectura en voz alta", F.incidencia);
    expect(await nota(mat.id, c.alumnos.valentina.id)).toBeNull(); // ingresó: presente en Matemática
    expect((await nota(com.id, c.alumnos.valentina.id))?.marca).toBe("nsp");
    expect(await c.db.asistencia.findFirst({ where: { alumnoId: c.alumnos.valentina.id, ambito: curso.com } })).toMatchObject({ estado: "falta", origen: "incidencia" });
    const avisos = await db.aviso.findMany({ where: { tenantId: c.tenant.id, plantilla: "incidencia_docente" } });
    expect(avisos).toHaveLength(1);
    expect(JSON.stringify(avisos[0].payload)).not.toContain("golpeó");
    expect((await listarIncidencias(c.ctxDe("otroProfesor")))[0].descripcion).toBeNull();
    expect((await listarIncidencias(c.ctxDe("tutora")))[0].descripcion).toBe("Se golpeó en Educación Física.");
    await esperarProhibido(registrarIncidencia(c.ctxDe("madre"), {}));
  });
});

describe("plazo de justificación y consecuencia por vencimiento", () => {
  it("caso 16: sin consecuencia configurada no se inventa 0 ni C: queda la alerta", async () => {
    const despues = new Date(expiracionJustificacion(F.caso1, 15).getTime() + 1000);
    const r = await aplicarVencimientos(c.db, c.tenant, {}, despues);
    expect(r.aplicadas).toBe(0);
    expect(r.sinConfigurar).toBeGreaterThan(0);
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Examen de multiplicación" } });
    expect(await nota(e.id, c.alumnos.mateo.id)).toMatchObject({ marca: "nsp", valorLiteral: null, vencidaAt: null });
    expect(await nspVencidosSinConsecuencia(c.db, c.tenant, despues)).toBeGreaterThan(0);
  });

  it("casos 9 y 10: vencido sin justificación → la consecuencia configurada, una sola vez aunque corran dos procesos a la vez", async () => {
    await esperarProhibido(actualizarReglasAcademicas(c.ctxDe("tutora"), { consecuenciaVencimiento: "C", horaResumenAcademico: "18:00" }));
    await actualizarReglasAcademicas(c.ctxDe("direccion"), { consecuenciaVencimiento: "C", horaResumenAcademico: "18:00" });
    const tenant = (await ctxFresco("direccion")).tenant;
    const despues = new Date(expiracionJustificacion(F.caso1, 15).getTime() + 1000);
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Examen de multiplicación" } });
    const [a, b] = await Promise.all([
      aplicarVencimientos(c.db, tenant, { alumnoId: c.alumnos.mateo.id }, despues),
      aplicarVencimientos(c.db, tenant, { alumnoId: c.alumnos.mateo.id }, despues),
    ]);
    const n = await nota(e.id, c.alumnos.mateo.id);
    expect(n).toMatchObject({ marca: "nsp", valorLiteral: "C" });
    expect(n?.vencidaAt).not.toBeNull();
    const cambios = await c.db.historialNota.findMany({ where: { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, tipo: "consecuencia_vencimiento" } });
    expect(cambios).toHaveLength(1);
    expect(cambios[0]).toMatchObject({ valorAnterior: "NSP", valorNuevo: "C", cambiadoPorId: null });
    expect(cambios[0].motivo).toMatch(/15 días calendario/);
    expect(a.aplicadas + b.aplicadas).toBeGreaterThanOrEqual(1);
    // Una tercera ejecución no cambia nada.
    expect((await aplicarVencimientos(c.db, tenant, { alumnoId: c.alumnos.mateo.id }, despues)).aplicadas).toBe(0);
    // Cambiar la consecuencia aplicada exige motivo.
    expect(await guardarNota(await ctxFresco("tutora"), { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "B" })).toMatchObject({ ok: false });
  });

  it("caso 3: presentada el día 15 (a las 23:59) se acepta; caso 4: el día 16 se rechaza y aplica la política", async () => {
    const a15 = await falta(c.alumnos.mateo.id, F.plazo15);
    await evaluacion(await ctxFresco("tutora"), c.cursoTutora.id, comp.mat, "Examen de tablas", F.plazo15);
    const vence15 = expiracionJustificacion(F.plazo15, 15);
    expect(await justificarConSesion(c.ctxDe("madre"), a15.id, { motivo: "Fiebre", archivo: null }, new Date(vence15.getTime() - 60_000))).toMatchObject({ ok: true });

    const a16 = await falta(c.alumnos.mateo.id, F.plazo16);
    const e16 = await evaluacion(await ctxFresco("tutora"), c.cursoTutora.id, comp.mat, "Dictado", F.plazo16);
    const vence16 = expiracionJustificacion(F.plazo16, 15);
    expect(await justificarConSesion(c.ctxDe("madre"), a16.id, { motivo: "Viaje", archivo: null }, new Date(vence16.getTime() + 1))).toEqual({
      ok: false, error: "El plazo para justificar venció (15 días calendario). Escribe a la tutora.",
    });
    const tenant = (await ctxFresco("direccion")).tenant;
    expect((await aplicarVencimientos(c.db, tenant, { alumnoId: c.alumnos.mateo.id }, new Date(vence16.getTime() + 1))).aplicadas).toBe(1);
    expect((await nota(e16.id, c.alumnos.mateo.id))?.valorLiteral).toBe("C");
    // Sin justificación aprobada no hay recuperación ordinaria.
    expect(await decidirRecuperacion(await ctxFresco("tutora"), { evaluacionId: e16.id, alumnoId: c.alumnos.mateo.id, decision: "autorizada" })).toMatchObject({ ok: false });
  });

  it("caso 5: presentada a tiempo y revisada después del plazo → no hay consecuencia mientras esté pendiente", async () => {
    const tenant = (await ctxFresco("direccion")).tenant;
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Examen de tablas" } });
    const dia18 = new Date(expiracionJustificacion(F.plazo15, 18).getTime() - 60_000);
    await aplicarVencimientos(c.db, tenant, { alumnoId: c.alumnos.mateo.id }, dia18);
    expect(await nota(e.id, c.alumnos.mateo.id)).toMatchObject({ marca: "nsp", valorLiteral: null, vencidaAt: null });
  });
});

describe("aprobación del tutor y recuperación en la actividad original", () => {
  it("caso 6: aprobada → avisa al profesor del curso sin cambiar la nota", async () => {
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Examen de tablas" } });
    const j = await c.db.justificacion.findFirstOrThrow({ where: { asistencia: { fecha: fechaDb(F.plazo15) } } });
    await revisarJustificacion(await ctxFresco("tutora"), { id: j.id, decision: "aceptada" });
    expect(await nota(e.id, c.alumnos.mateo.id)).toMatchObject({ marca: "nsp", valorLiteral: null, justificacionId: j.id, recuperacion: null });
    const avisos = await db.aviso.findMany({ where: { tenantId: c.tenant.id, plantilla: "justificacion_aprobada_docente", referenciaId: j.id } });
    expect(avisos.map((a) => a.destinatario)).toEqual([c.miembros.tutora.user.email]);
  });

  it("caso 8: el profesor autoriza → la nueva nota queda en la actividad original y el historial conserva el NSP", async () => {
    const tutora = await ctxFresco("tutora");
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Examen de tablas" } });
    await guardarNota(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.valentina.id, valor: "A" });
    expect(await publicarEvaluacion(tutora, e.grupoId)).toMatchObject({ ok: true });
    await esperarProhibido(decidirRecuperacion(c.ctxDe("otroProfesor"), { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, decision: "autorizada" }));
    expect(await decidirRecuperacion(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, decision: "autorizada" })).toMatchObject({ ok: true });
    expect(await decidirRecuperacion(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, decision: "denegada" })).toMatchObject({ ok: false });
    expect(await guardarNota(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "AD", fechaRecuperacion: dia(1) })).toEqual({ ok: true });
    const n = await nota(e.id, c.alumnos.mateo.id);
    expect(n).toMatchObject({ valorLiteral: "AD", marca: null, recuperacion: "autorizada" });
    expect(n?.fechaRecuperacion?.toISOString().slice(0, 10)).toBe(dia(1));
    expect((await c.db.evaluacion.findUniqueOrThrow({ where: { id: e.id } })).fecha.toISOString().slice(0, 10)).toBe(F.plazo15); // fecha original
    const h = await historialEvaluacion(tutora, e.grupoId);
    const deMateo = h.filter((x) => x.alumno.startsWith("Quispe"));
    expect(deMateo.map((x) => [x.anterior, x.nuevo, x.tipo])).toEqual([
      ["NSP", "AD", "recuperacion"],
      [null, "Autorizada", "decision_recuperacion"],
      [null, "NSP", "cambio_asistencia"],
    ]);
    expect(deMateo[0]).toMatchObject({ motivo: "Recuperación autorizada tras justificación aprobada.", por: "Lucia Prueba" });
    expect(deMateo[0].justificacionId).not.toBeNull();
    expect(await db.aviso.count({ where: { tenantId: c.tenant.id, plantilla: "recuperacion_registrada", referenciaId: e.id } })).toBeGreaterThan(0);
  });

  it("caso 17: una sola solicitud por fecha cubre tres actividades de cursos distintos; caso 7: no autorizar deja el NSP", async () => {
    const aDia = await falta(c.alumnos.mateo.id, F.tresCursos);
    const aCom = await falta(c.alumnos.mateo.id, F.tresCursos, curso.com);
    const mat = await evaluacion(await ctxFresco("tutora"), c.cursoTutora.id, comp.mat, "Problemas", F.tresCursos);
    const com = await evaluacion(await ctxFresco("otroProfesor"), curso.com, comp.com, "Comprensión", F.tresCursos);
    const arte = await evaluacion(await ctxFresco("otroProfesor"), curso.arte, comp.arte, "Dibujo", F.tresCursos);
    for (const e of [mat, com, arte]) expect((await nota(e.id, c.alumnos.mateo.id))?.marca).toBe("nsp");
    expect(await justificarConSesion(c.ctxDe("madre"), aDia.id, { motivo: "Cita médica", archivo: null })).toMatchObject({ ok: true });
    expect(await justificarConSesion(c.ctxDe("madre"), aCom.id, { motivo: "Cita médica", archivo: null })).toMatchObject({ ok: false });
    const js = await c.db.justificacion.findMany({ where: { asistencia: { fecha: fechaDb(F.tresCursos) } } });
    expect(js).toHaveLength(1);
    await revisarJustificacion(await ctxFresco("tutora"), { id: js[0].id, decision: "aceptada" });
    for (const e of [mat, com, arte]) expect((await nota(e.id, c.alumnos.mateo.id))?.justificacionId).toBe(js[0].id);
    const avisos = await db.aviso.findMany({ where: { tenantId: c.tenant.id, plantilla: "justificacion_aprobada_docente", referenciaId: js[0].id } });
    expect(avisos.map((a) => a.destinatario).sort()).toEqual([c.miembros.otroProfesor.user.email, c.miembros.tutora.user.email].sort());

    const profesor = await ctxFresco("otroProfesor");
    expect(await decidirRecuperacion(profesor, { evaluacionId: com.id, alumnoId: c.alumnos.mateo.id, decision: "denegada" })).toEqual({ ok: true, mensaje: "Decisión registrada: el NSP se mantiene." });
    expect(await nota(com.id, c.alumnos.mateo.id)).toMatchObject({ marca: "nsp", valorLiteral: null, recuperacion: "denegada" });
    expect(await guardarNota(profesor, { evaluacionId: com.id, alumnoId: c.alumnos.mateo.id, valor: "A" })).toMatchObject({ ok: false });
    // Justificada a tiempo: tampoco hay consecuencia por vencimiento.
    const tenant = (await ctxFresco("direccion")).tenant;
    await aplicarVencimientos(c.db, tenant, {}, new Date(expiracionJustificacion(F.tresCursos, 20).getTime()));
    expect((await nota(com.id, c.alumnos.mateo.id))?.valorLiteral).toBeNull();
  });

  it("caso 15: actividad registrada tarde (plazo ya vencido, sin justificación) → NSP y la política al momento", async () => {
    await falta(c.alumnos.valentina.id, F.tarde);
    const e = await evaluacion(await ctxFresco("tutora"), c.cursoTutora.id, comp.mat, "Repaso tardío", F.tarde);
    const n = await nota(e.id, c.alumnos.valentina.id);
    expect(n).toMatchObject({ marca: "nsp", valorLiteral: "C" });
    expect(n?.vencidaAt).not.toBeNull();
  });
});

describe("correcciones auditadas y seguridad", () => {
  it("caso 11: corregir notas intercambiadas de dos alumnos → dos cambios con motivo y un aviso por familia afectada", async () => {
    const tutora = await ctxFresco("tutora");
    const e = await evaluacion(tutora, c.cursoTutora.id, comp.mat, "Fracciones", F.cruce);
    await guardarNota(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "B" });
    await guardarNota(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.valentina.id, valor: "A" });
    await publicarEvaluacion(tutora, e.grupoId);
    expect(await guardarNota(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "A" })).toMatchObject({ ok: false });
    const corr = { motivo: "Notas intercambiadas entre dos alumnos", tipo: "correccion_digitacion" as const };
    expect(await guardarNota(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "A", ...corr })).toEqual({ ok: true });
    expect(await guardarNota(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.valentina.id, valor: "B", ...corr })).toEqual({ ok: true });
    const h = (await historialEvaluacion(tutora, e.grupoId)).filter((x) => x.tipo === "correccion_digitacion");
    expect(h.map((x) => [x.anterior, x.nuevo, x.publicada])).toEqual([["A", "B", true], ["B", "A", true]]);
    const avisos = await db.aviso.findMany({ where: { tenantId: c.tenant.id, plantilla: "nota_corregida", referenciaId: e.id } });
    expect(new Set(avisos.map((a) => a.apoderadoId))).toEqual(new Set([c.miembros.madre.membership.id])); // solo la familia con avisos activos
    expect(JSON.stringify(avisos[0].payload)).not.toMatch(/"A"|"B"/); // sin valores en el correo
    // El historial es inmutable.
    const fila = await c.db.historialNota.findFirstOrThrow({ where: { evaluacionId: e.id } });
    await expect(db.historialNota.update({ where: { id: fila.id }, data: { motivo: "otro" } })).rejects.toThrow(/inmutable/);
  });

  it("caso 13: un profesor de otro colegio no modifica estas notas; uno del mismo colegio sin el curso, tampoco", async () => {
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Fracciones" } });
    expect(await guardarNota(otro.ctxDe("tutora"), { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "C" })).toEqual({ ok: false, error: "No encontramos esa evaluación." });
    await esperarProhibido(guardarNota(c.ctxDe("otroProfesor"), { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "C", motivo: "x", tipo: "otra" }));
    expect((await nota(e.id, c.alumnos.mateo.id))?.valorLiteral).toBe("A");
  });
});

describe("libreta emitida y rectificación", () => {
  it("caso 14: la libreta emitida no cambia con el registro auxiliar; la rectificación aprobada crea la versión 2", async () => {
    const tutora = await ctxFresco("tutora");
    await guardarCalificacionPeriodo(tutora, { alumnoId: c.alumnos.mateo.id, competenciaId: comp.mat, periodoId, valor: "A", conclusion: "" });
    await emitirLibretas(await ctxFresco("direccion"), periodoId);
    const v1 = await datosLibreta(tutora, c.alumnos.mateo.id, periodoId);
    const califDe = (d: typeof v1) => d.cursos.flatMap((x) => x.competencias).find((x) => x.id === comp.mat)?.calificacion?.valorLiteral;
    expect(v1.emision?.version).toBe(1);
    expect(califDe(v1)).toBe("A");
    // Cambios posteriores: la calificación oficial queda bloqueada y el registro auxiliar no la toca.
    expect(await guardarCalificacionPeriodo(tutora, { alumnoId: c.alumnos.mateo.id, competenciaId: comp.mat, periodoId, valor: "B", conclusion: "Debe reforzar." }))
      .toMatchObject({ ok: false });
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Fracciones" } });
    await guardarNota(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "C", motivo: "Revisión", tipo: "otra" });
    await c.db.calificacionPeriodo.updateMany({ where: { alumnoId: c.alumnos.mateo.id, competenciaId: comp.mat }, data: { valorLiteral: "C" } });
    expect(califDe(await datosLibreta(tutora, c.alumnos.mateo.id, periodoId))).toBe("A");
    // Rectificación formal.
    expect(await solicitarRectificacion(tutora, { alumnoId: c.alumnos.mateo.id, periodoId, competenciaId: comp.mat, valor: "B", conclusion: "Debe reforzar fracciones.", motivo: "Se registró A por error al digitar." }))
      .toEqual({ ok: true, mensaje: "Rectificación enviada. Dirección la revisará." });
    const r = await c.db.rectificacionLibreta.findFirstOrThrow();
    await esperarProhibido(resolverRectificacion(tutora, { id: r.id, decision: "aprobada" }));
    expect(await resolverRectificacion(await ctxFresco("direccion"), { id: r.id, decision: "aprobada" })).toMatchObject({ ok: true });
    const v2 = await datosLibreta(c.ctxDe("madre"), c.alumnos.mateo.id, periodoId).catch(() => null); // la familia solo ve libretas publicadas
    expect(v2).toBeNull();
    const vista = await datosLibreta(tutora, c.alumnos.mateo.id, periodoId);
    expect(vista.emision?.version).toBe(2);
    expect(califDe(vista)).toBe("B");
    const versiones = await c.db.libretaEmitida.findMany({ where: { alumnoId: c.alumnos.mateo.id, periodoId }, orderBy: { version: "asc" } });
    expect(versiones.map((v) => v.version)).toEqual([1, 2]);
    expect(JSON.stringify(versiones[0].datos)).toContain('"valorLiteral":"A"'); // la versión 1 quedó intacta
    await expect(db.libretaEmitida.update({ where: { id: versiones[0].id }, data: { datos: {} } })).rejects.toThrow(/inmutable/);
  });
});

describe("resumen académico diario", () => {
  it("un resumen por alumno con lo publicado ese día, una sola vez", async () => {
    const tenant = (await ctxFresco("direccion")).tenant;
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Fracciones" } });
    const { ventanaResumen } = await import("@/lib/server/resumen-academico");
    const fecha = sumarDias(hoy, 1);
    const { desde } = ventanaResumen(fecha, tenant.horaResumenAcademico, tenant.zonaHoraria);
    await c.db.evaluacion.updateMany({ where: { id: e.id }, data: { publicadaAt: new Date(desde.getTime() + 60_000) } });
    const n = await resumenDelDia(c.db, tenant, fecha);
    expect(n).toBe(1); // solo Mateo tiene familia con avisos
    expect(await resumenDelDia(c.db, tenant, fecha)).toBeNull(); // ya se hizo
    const avisos = await db.aviso.findMany({ where: { tenantId: c.tenant.id, plantilla: "resumen_academico" } });
    expect(avisos.length).toBeGreaterThan(0);
    expect(new Set(avisos.map((a) => `${a.apoderadoId}|${a.canal}`)).size).toBe(avisos.length);
  });
});
