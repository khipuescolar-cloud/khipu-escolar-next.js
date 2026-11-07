// Calificación del periodo y reporte del tutor (specs/47 y 11). Requiere la BD local.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import {
  datosCalificacionPeriodo, enviarCalificacionPeriodo, estadoCalificacionPeriodo, guardarBorradorPeriodo, reabrirCalificacionPeriodo,
  reporteSalonPeriodo, salonesParaReporte,
} from "@/lib/server/calificacion-periodo";
import { datosLibreta } from "@/lib/server/libreta";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";
const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
let c: ColegioPrueba;
let otro: ColegioPrueba;
let pFuturo: string;
let pTerminado: string;
let competencia: string;
let cursoCiencia: string;
let competenciaCiencia: string;
const AHORA = new Date("2026-08-15T15:00:00-05:00");

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-calif-periodo" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-calif-periodo-otro" });
  const base = { tenantId: c.tenant.id, anio: 2026, tipo: "bimestre" as const, niveles: ["primaria" as const] };
  pTerminado = (await c.db.periodo.create({ data: { ...base, numero: 1, nombre: "I Bimestre", inicio: dia("2026-03-01"), fin: dia("2026-05-15") } })).id;
  pFuturo = (await c.db.periodo.create({ data: { ...base, numero: 2, nombre: "II Bimestre", inicio: dia("2026-05-18"), fin: dia("2026-10-30") } })).id;
  competencia = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Resuelve problemas de cantidad" } })).id;
  const ciencia = await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Ciencia", profesorId: c.miembros.otroProfesor.membership.id } });
  cursoCiencia = ciencia.id;
  competenciaCiencia = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: ciencia.id, nombre: "Indaga" } })).id;
  await c.db.evaluacion.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, periodoId: pTerminado, competenciaId: competencia, titulo: "Práctica 1", fecha: dia("2026-04-10"), creadaPorId: c.miembros.tutora.membership.id } });
}, 60_000);
afterAll(async () => { await c?.limpiar(); await otro?.limpiar(); await db.$disconnect(); }, 60_000);

const m = () => c.alumnos.mateo.id;
const v = () => c.alumnos.valentina.id;
const celda = (alumnoId: string, competenciaId: string, valor: string, conclusion = "") => ({ alumnoId, competenciaId, valor, conclusion });

describe("cuándo se puede enviar", () => {
  it("antes de que termine el periodo el botón queda deshabilitado y no se guarda ni se envía", async () => {
    const e = await estadoCalificacionPeriodo(c.ctxDe("tutora"), c.cursoTutora.id, pFuturo, AHORA);
    expect(e).toMatchObject({ estado: "no_disponible", disponibleDesde: "2026-10-30", puedeEnviar: false });
    const g = await guardarBorradorPeriodo(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId: pFuturo, celdas: [celda(m(), competencia, "A")] }, AHORA);
    expect(g).toMatchObject({ ok: false, error: expect.stringContaining("cuando el periodo termina") });
    expect((await enviarCalificacionPeriodo(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId: pFuturo }, AHORA)).ok).toBe(false);
    expect(await c.db.cierreCurso.count({ where: { periodoId: pFuturo } })).toBe(0);
  });
  it("cuando el periodo terminó queda pendiente y se habilita (zona del colegio)", async () => {
    expect(await estadoCalificacionPeriodo(c.ctxDe("tutora"), c.cursoTutora.id, pTerminado, AHORA)).toMatchObject({ estado: "pendiente", puedeEnviar: true, esPropio: true });
    // El último día del periodo ya se puede enviar.
    expect(await estadoCalificacionPeriodo(c.ctxDe("tutora"), c.cursoTutora.id, pFuturo, new Date("2026-10-30T20:00:00-05:00"))).toMatchObject({ estado: "pendiente" });
  });
  it("las notas del periodo se ven como evidencias sin ningún promedio ni valor precargado", async () => {
    const d = await datosCalificacionPeriodo(c.ctxDe("tutora"), c.cursoTutora.id, pTerminado, AHORA);
    expect(d.guardadas).toEqual([]);
    expect(d.editable).toBe(true);
    expect(Object.keys(d)).not.toContain("sugerido");
  });
});

describe("enviar la calificación del periodo", () => {
  it("no se envía con faltantes ni con B o C sin conclusión; lista qué falta", async () => {
    const vacio = await enviarCalificacionPeriodo(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId: pTerminado }, AHORA);
    expect(vacio.ok).toBe(false);
    expect(vacio.faltantes).toHaveLength(2);
    expect(vacio.faltantes?.every((f) => f.falta === "calificacion")).toBe(true);
    const sinConclusion = await guardarBorradorPeriodo(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId: pTerminado, celdas: [celda(m(), competencia, "AD"), celda(v(), competencia, "B")] }, AHORA);
    expect(sinConclusion).toMatchObject({ ok: true, guardadas: 1, omitidas: 1 });
    const r = await enviarCalificacionPeriodo(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId: pTerminado }, AHORA);
    expect(r.faltantes).toEqual([expect.objectContaining({ alumnoId: v(), falta: "calificacion" })]);
    // Con B pero sin conclusión no se guarda ni pasa.
    expect(await c.db.calificacionPeriodo.count({ where: { alumnoId: v(), periodoId: pTerminado } })).toBe(0);
    expect(await c.db.cierreCurso.count({ where: { periodoId: pTerminado } })).toBe(0);
  });
  it("con todo completo se envía, queda auditado y el curso pasa a solo lectura", async () => {
    expect((await guardarBorradorPeriodo(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId: pTerminado, celdas: [celda(v(), competencia, "B", "Necesita reforzar la resta.")] }, AHORA)).ok).toBe(true);
    const r = await enviarCalificacionPeriodo(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId: pTerminado }, AHORA);
    expect(r).toMatchObject({ ok: true, mensaje: expect.stringContaining("3.° B") });
    const cierre = await c.db.cierreCurso.findFirstOrThrow({ where: { cursoId: c.cursoTutora.id, periodoId: pTerminado } });
    expect(cierre.cerradoPorId).toBe(c.miembros.tutora.membership.id);
    expect(await db.auditoria.count({ where: { tenantId: c.tenant.id, accion: "enviar", entidad: "calificacion_periodo", entidadId: c.cursoTutora.id } })).toBe(1);
    expect(await estadoCalificacionPeriodo(c.ctxDe("tutora"), c.cursoTutora.id, pTerminado, AHORA)).toMatchObject({ estado: "enviada", puedeEnviar: false });
    const solo = await guardarBorradorPeriodo(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId: pTerminado, celdas: [celda(m(), competencia, "A")] }, AHORA);
    expect(solo).toMatchObject({ ok: false, error: expect.stringContaining("ya se envió") });
    expect((await enviarCalificacionPeriodo(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId: pTerminado }, AHORA)).ok).toBe(false);
    expect((await datosCalificacionPeriodo(c.ctxDe("tutora"), c.cursoTutora.id, pTerminado, AHORA)).editable).toBe(false);
  });
  it("dirección no envía pero sí reabre; el profesor vuelve a editar", async () => {
    await esperarProhibido(enviarCalificacionPeriodo(c.ctxDe("direccion"), { cursoId: c.cursoTutora.id, periodoId: pTerminado }, AHORA));
    await esperarProhibido(reabrirCalificacionPeriodo(c.ctxDe("tutora"), c.cursoTutora.id, pTerminado));
    expect((await reabrirCalificacionPeriodo(c.ctxDe("direccion"), c.cursoTutora.id, pTerminado)).ok).toBe(true);
    expect(await estadoCalificacionPeriodo(c.ctxDe("tutora"), c.cursoTutora.id, pTerminado, AHORA)).toMatchObject({ estado: "pendiente", puedeEnviar: true });
    expect((await enviarCalificacionPeriodo(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId: pTerminado }, AHORA)).ok).toBe(true);
  });
  it("el profesor de otro curso del salón no califica ni envía el curso ajeno", async () => {
    await esperarProhibido(guardarBorradorPeriodo(c.ctxDe("otroProfesor"), { cursoId: c.cursoTutora.id, periodoId: pTerminado, celdas: [celda(m(), competencia, "A")] }, AHORA));
    await esperarProhibido(enviarCalificacionPeriodo(c.ctxDe("otroProfesor"), { cursoId: c.cursoTutora.id, periodoId: pTerminado }, AHORA));
  });
});

describe("reporte para el tutor", () => {
  it("el tutor ve su salón con solo los cursos enviados; los demás, pendientes y sin notas", async () => {
    const rep = await reporteSalonPeriodo(c.ctxDe("tutora"), c.salon.id, pTerminado, AHORA);
    const mate = rep.cursos.find((x) => x.id === c.cursoTutora.id);
    const cien = rep.cursos.find((x) => x.id === cursoCiencia);
    expect(mate?.enviado?.por).toContain("Lucia");
    expect(cien?.enviado).toBeNull();
    expect(rep.calificaciones).toHaveLength(2);
    // Aunque Ciencia tenga borradores, el tutor no los recibe mientras no se envíen.
    await c.db.calificacionPeriodo.create({ data: { tenantId: c.tenant.id, alumnoId: m(), competenciaId: competenciaCiencia, periodoId: pTerminado, valorLiteral: "C", conclusion: "borrador" } });
    const otra = await reporteSalonPeriodo(c.ctxDe("tutora"), c.salon.id, pTerminado, AHORA);
    expect(otra.calificaciones.some((g) => g.competenciaId === competenciaCiencia)).toBe(false);
    expect((await salonesParaReporte(c.ctxDe("tutora"))).map((s) => s.id)).toEqual([c.salon.id]);
  });
  it("dirección ve cualquier salón; profesor sin tutoría y otro colegio reciben 403", async () => {
    expect((await reporteSalonPeriodo(c.ctxDe("direccion"), c.otroSalon.id, undefined, AHORA)).salon.id).toBe(c.otroSalon.id);
    expect((await salonesParaReporte(c.ctxDe("direccion"))).length).toBe(2);
    await esperarProhibido(reporteSalonPeriodo(c.ctxDe("otroProfesor"), c.salon.id, pTerminado, AHORA));
    await esperarProhibido(reporteSalonPeriodo(c.ctxDe("tutora"), c.otroSalon.id, pTerminado, AHORA));
    await esperarProhibido(reporteSalonPeriodo(c.ctxDe("madre"), c.salon.id, pTerminado, AHORA));
    await esperarProhibido(reporteSalonPeriodo(otro.ctxDe("tutora"), c.salon.id, pTerminado, AHORA));
    await esperarProhibido(reporteSalonPeriodo(otro.ctxDe("direccion"), c.salon.id, pTerminado, AHORA));
  });
  it("el tutor que no dicta el curso no abre la pantalla de calificación de ese curso", async () => {
    await esperarProhibido(datosCalificacionPeriodo(c.ctxDe("tutora"), cursoCiencia, pTerminado, AHORA));
  });
});

describe("libreta", () => {
  it("sigue leyendo CalificacionPeriodo igual que antes", async () => {
    const l = await datosLibreta(c.ctxDe("direccion"), v(), pTerminado);
    const matematica = l.cursos.find((x) => x.nombre === "Matemática");
    const comp = matematica?.competencias.find((x) => x.nombre === "Resuelve problemas de cantidad");
    expect(comp).toMatchObject({ calificacion: { valorLiteral: "B" }, conclusion: "Necesita reforzar la resta." });
  });
});
