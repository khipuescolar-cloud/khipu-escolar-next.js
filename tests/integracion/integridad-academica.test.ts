// Integridad y auditoría de notas (specs/11, specs/37): borrado de evaluaciones, recuperación solo del profesor del
// curso, motivo mínimo en correcciones, libretas emitidas imborrables y emisión antes de publicar, y el cron de
// vencimientos NSP por lotes. Requiere la BD local.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fechaDb, momentoEnZona, sumarDias } from "@/lib/fechas";
import { MENSAJE_EVALUACION_NO_ELIMINABLE, MENSAJE_MOTIVO_CORTO } from "@/lib/integridad-notas";
import { db, type DbTenant } from "@/lib/server/db";
import {
  crearEvaluacion, decidirRecuperacion, eliminarEvaluacion, grillaNotas, guardarNota, publicarEvaluacion, publicarLibreta,
} from "@/lib/server/notas";
import { aplicarVencimientos, nspVencidosSinConsecuencia, sincronizarNsp } from "@/lib/server/nsp";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let periodoId: string;
let compMat: string;
let compCom: string;
let cursoCom: string;
let hoy: string;

/** Envuelve el cliente del colegio y cuenta las llamadas `modelo.método` (fuera de transacciones). */
function contarConsultas<T extends object>(cliente: T, opciones: { fallarEn?: { clave: string; llamada: number } } = {}) {
  const conteo = new Map<string, number>();
  const proxy = new Proxy(cliente, {
    get(objetivo, modelo) {
      const delegado = Reflect.get(objetivo, modelo, objetivo) as unknown;
      if (typeof modelo !== "string" || modelo.startsWith("$") || typeof delegado !== "object" || delegado === null) {
        return typeof delegado === "function" ? (delegado as (...a: unknown[]) => unknown).bind(objetivo) : delegado;
      }
      return new Proxy(delegado, {
        get(d, metodo) {
          const fn = Reflect.get(d, metodo, d) as unknown;
          if (typeof fn !== "function" || typeof metodo !== "string") return fn;
          return (...args: unknown[]) => {
            const clave = `${modelo}.${metodo}`;
            const n = (conteo.get(clave) ?? 0) + 1;
            conteo.set(clave, n);
            if (opciones.fallarEn?.clave === clave && opciones.fallarEn.llamada === n) return Promise.reject(new Error("fallo simulado"));
            return (fn as (...a: unknown[]) => unknown).apply(d, args);
          };
        },
      });
    },
  });
  return { proxy, conteo, de: (clave: string) => conteo.get(clave) ?? 0 };
}

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-integridad" });
  hoy = momentoEnZona(new Date(), c.tenant.zonaHoraria).isoFecha;
  periodoId = (await c.db.periodo.create({
    data: { tenantId: c.tenant.id, anio: 2026, tipo: "trimestre", numero: 3, nombre: "III Trimestre", inicio: new Date("2026-09-01"), fin: new Date("2026-12-18") },
  })).id;
  compMat = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Resuelve problemas", orden: 1 } })).id;
  // Curso de otro docente en el salón de la tutora.
  cursoCom = (await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Comunicación", profesorId: c.miembros.otroProfesor.membership.id } })).id;
  compCom = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: cursoCom, nombre: "Lee", orden: 1 } })).id;
}, 60_000);

afterAll(async () => {
  await c?.limpiar();
}, 60_000);

async function evaluacion(ctx: TenantContext, cursoId: string, competenciaId: string, titulo: string, fecha = sumarDias(hoy, -1)) {
  expect(await crearEvaluacion(ctx, { cursoId, periodoId, competenciaIds: [competenciaId], titulo, fecha, peso: "1" })).toMatchObject({ ok: true });
  return c.db.evaluacion.findFirstOrThrow({ where: { titulo, cursoId } });
}

describe("borrado de evaluaciones", () => {
  it("nunca publicada se elimina aunque tenga notas de borrador (auditado); publicada alguna vez o con NSP no", async () => {
    const tutora = c.ctxDe("tutora");
    const vacia = await evaluacion(tutora, c.cursoTutora.id, compMat, "Borrador vacío");
    const conNota = await evaluacion(tutora, c.cursoTutora.id, compMat, "Con nota");
    expect(await guardarNota(tutora, { evaluacionId: conNota.id, alumnoId: c.alumnos.mateo.id, valor: "A" })).toEqual({ ok: true });
    expect(await guardarNota(tutora, { evaluacionId: conNota.id, alumnoId: c.alumnos.mateo.id, valor: "B" })).toEqual({ ok: true });
    // Publicada y luego con notas: se publicó alguna vez.
    const publicada = await evaluacion(tutora, c.cursoTutora.id, compMat, "Publicada");
    expect(await guardarNota(tutora, { evaluacionId: publicada.id, alumnoId: c.alumnos.mateo.id, valor: "A" })).toEqual({ ok: true });
    expect(await publicarEvaluacion(tutora, publicada.grupoId)).toMatchObject({ ok: true });
    // Rastro de publicación aunque el estado diga programada (dato raro): publicada_at.
    const conRastro = await c.db.evaluacion.create({
      data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, periodoId, competenciaId: compMat, titulo: "Con rastro", fecha: fechaDb(hoy), estado: "programada", publicadaAt: new Date() },
    });
    const conNsp = await c.db.evaluacion.create({
      data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, periodoId, competenciaId: compMat, titulo: "Con NSP", fecha: fechaDb(hoy), estado: "programada" },
    });
    await c.db.nota.create({ data: { tenantId: c.tenant.id, evaluacionId: conNsp.id, alumnoId: c.alumnos.valentina.id, marca: "nsp" } });

    const g = await grillaNotas(tutora, c.cursoTutora.id, periodoId);
    const eliminable = Object.fromEntries(g.evaluaciones.map((e) => [e.titulo, e.eliminable]));
    expect(eliminable).toEqual({ "Borrador vacío": true, "Con nota": true, Publicada: false, "Con rastro": false, "Con NSP": false });

    for (const e of [publicada, conRastro, conNsp]) {
      expect(await eliminarEvaluacion(tutora, e.id)).toEqual({ ok: false, error: MENSAJE_EVALUACION_NO_ELIMINABLE });
    }
    expect(await c.db.historialNota.count({ where: { evaluacionId: publicada.id } })).toBeGreaterThan(0);

    expect(await eliminarEvaluacion(tutora, vacia.id)).toMatchObject({ ok: true });
    expect(await eliminarEvaluacion(tutora, conNota.id)).toMatchObject({ ok: true });
    expect(await c.db.evaluacion.count({ where: { id: { in: [vacia.id, conNota.id] } } })).toBe(0);
    expect(await c.db.historialNota.count({ where: { evaluacionId: conNota.id } })).toBe(0);
    const registro = await db.auditoria.findFirstOrThrow({ where: { tenantId: c.tenant.id, accion: "borrar", entidad: "evaluacion", entidadId: conNota.id } });
    expect(registro.detalle).toMatchObject({ titulo: "Con nota", curso: "Matemática", notas: 1, historial: 2 });
  });

  it("defensa en la BD: una evaluación con historial no se borra directamente (FK RESTRICT)", async () => {
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Publicada" } });
    await expect(db.evaluacion.delete({ where: { id: e.id } })).rejects.toThrow();
    expect(await c.db.historialNota.count({ where: { evaluacionId: e.id } })).toBeGreaterThan(0);
  });
});

describe("recuperación: solo el profesor del curso", () => {
  it("la tutora del salón no decide ni registra la recuperación de un curso de otro docente", async () => {
    const fecha = sumarDias(hoy, -2);
    const asistencia = await c.db.asistencia.create({
      data: { tenantId: c.tenant.id, alumnoId: c.alumnos.mateo.id, ambito: "dia", fecha: fechaDb(fecha), hora: "08:00", estado: "falta", origen: "lista" },
    });
    const e = await evaluacion(c.ctxDe("otroProfesor"), cursoCom, compCom, "Lectura", fecha);
    const nsp = await c.db.nota.findFirstOrThrow({ where: { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id } });
    expect(nsp.marca).toBe("nsp");
    const j = await c.db.justificacion.create({
      data: { tenantId: c.tenant.id, asistenciaId: asistencia.id, apoderadoId: c.miembros.madre.membership.id, motivo: "Cita médica", estado: "aceptada", revisadoAt: new Date() },
    });
    await c.db.nota.updateMany({ where: { id: nsp.id }, data: { justificacionId: j.id } });

    const tutora = c.ctxDe("tutora");
    const rechazo = { ok: false, error: "La recuperación la decide y la registra el profesor del curso, no el tutor del salón." };
    expect(await decidirRecuperacion(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, decision: "autorizada" })).toEqual(rechazo);
    expect((await c.db.nota.findUniqueOrThrow({ where: { id: nsp.id } })).recuperacion).toBeNull();

    const profesor = c.ctxDe("otroProfesor");
    expect(await decidirRecuperacion(profesor, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, decision: "autorizada" })).toMatchObject({ ok: true });
    expect(await guardarNota(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "A" })).toEqual(rechazo);
    expect(await guardarNota(profesor, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "A" })).toEqual({ ok: true });
    expect(await c.db.nota.findUniqueOrThrow({ where: { id: nsp.id } })).toMatchObject({ valorLiteral: "A", marca: null });
  });
});

describe("motivo de corrección", () => {
  it("corregir una nota publicada exige un motivo de al menos 5 caracteres no vacíos", async () => {
    const tutora = c.ctxDe("tutora");
    const e = await evaluacion(tutora, c.cursoTutora.id, compMat, "Fracciones publicadas");
    await guardarNota(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.valentina.id, valor: "B" });
    expect(await publicarEvaluacion(tutora, e.grupoId)).toMatchObject({ ok: true });
    const base = { evaluacionId: e.id, alumnoId: c.alumnos.valentina.id, valor: "A", tipo: "correccion_digitacion" as const };
    expect(await guardarNota(tutora, { ...base, motivo: "a b c" })).toEqual({ ok: false, error: MENSAJE_MOTIVO_CORTO });
    expect(await guardarNota(tutora, { ...base, motivo: "  ab  " })).toEqual({ ok: false, error: MENSAJE_MOTIVO_CORTO });
    expect(await guardarNota(tutora, { ...base, motivo: "     " })).toMatchObject({ ok: false });
    expect((await c.db.nota.findFirstOrThrow({ where: { evaluacionId: e.id, alumnoId: c.alumnos.valentina.id } })).valorLiteral).toBe("B");
    expect(await guardarNota(tutora, { ...base, motivo: "Error al digitar" })).toEqual({ ok: true });
  });
});

describe("libretas emitidas", () => {
  it("un fallo a medias no deja el periodo publicado; el reintento completa las faltantes sin duplicar", async () => {
    const cerrado = (await c.db.periodo.create({
      data: { tenantId: c.tenant.id, anio: 2026, tipo: "bimestre", numero: 2, nombre: "II Bimestre", inicio: new Date("2026-05-01"), fin: new Date("2026-07-15"), cerrado: true },
    })).id;
    const direccion = c.ctxDe("direccion");
    const fallando = contarConsultas(direccion.db, { fallarEn: { clave: "libretaEmitida.createMany", llamada: 2 } });
    const r = await publicarLibreta({ ...direccion, db: fallando.proxy as DbTenant }, cerrado);
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("No pudimos emitir todas las libretas") });
    expect((await c.db.periodo.findUniqueOrThrow({ where: { id: cerrado } })).libretaPublicadaAt).toBeNull();
    expect(await c.db.libretaEmitida.count({ where: { periodoId: cerrado } })).toBe(1);

    expect(await publicarLibreta(direccion, cerrado)).toMatchObject({ ok: true });
    expect((await c.db.periodo.findUniqueOrThrow({ where: { id: cerrado } })).libretaPublicadaAt).not.toBeNull();
    const emitidas = await c.db.libretaEmitida.findMany({ where: { periodoId: cerrado } });
    expect(emitidas).toHaveLength(3); // los 3 alumnos activos de salones con cursos
    expect(new Set(emitidas.map((x) => x.alumnoId)).size).toBe(3);
    expect(await publicarLibreta(direccion, cerrado, { reenviar: true })).toMatchObject({ ok: true });
    expect(await c.db.libretaEmitida.count({ where: { periodoId: cerrado } })).toBe(3);

    // No se borran: ni a mano ni en cascada con el alumno o el periodo.
    await expect(db.libretaEmitida.delete({ where: { id: emitidas[0].id } })).rejects.toThrow(/no se borra/);
    await expect(db.periodo.delete({ where: { id: cerrado } })).rejects.toThrow();
    await expect(db.alumno.delete({ where: { id: c.alumnos.thiago.id } })).rejects.toThrow();
    expect(await c.db.libretaEmitida.count({ where: { periodoId: cerrado } })).toBe(3);
  });

  it("borrar el colegio completo sigue funcionando (cascada desde tenants)", async () => {
    const t = await crearColegioPrueba({ plan: "pro", prefijo: "test-integridad-borrar" });
    const p = await t.db.periodo.create({
      data: { tenantId: t.tenant.id, anio: 2026, tipo: "bimestre", numero: 1, nombre: "I Bimestre", inicio: new Date("2026-03-01"), fin: new Date("2026-05-01"), cerrado: true },
    });
    const comp = await t.db.competencia.create({ data: { tenantId: t.tenant.id, cursoId: t.cursoTutora.id, nombre: "C", orden: 1 } });
    const e = await t.db.evaluacion.create({ data: { tenantId: t.tenant.id, cursoId: t.cursoTutora.id, periodoId: p.id, competenciaId: comp.id, titulo: "E", fecha: fechaDb("2026-03-10") } });
    await t.db.historialNota.create({ data: { tenantId: t.tenant.id, evaluacionId: e.id, alumnoId: t.alumnos.mateo.id, valorNuevo: "A" } });
    expect(await publicarLibreta(t.ctxDe("direccion"), p.id)).toMatchObject({ ok: true });
    expect(await t.db.libretaEmitida.count({ where: { periodoId: p.id } })).toBeGreaterThan(0);
    await t.limpiar();
    expect(await db.tenant.count({ where: { id: t.tenant.id } })).toBe(0);
    expect(await db.libretaEmitida.count({ where: { tenantId: t.tenant.id } })).toBe(0);
  });
});

describe("cron de vencimientos NSP", () => {
  it("con más de 2000 NSP vigentes no vencidos, aplica los vencidos con un número acotado de consultas", async () => {
    const v = await crearColegioPrueba({ plan: "pro", prefijo: "test-integridad-nsp" });
    try {
      const pid = (await v.db.periodo.create({
        data: { tenantId: v.tenant.id, anio: 2026, tipo: "trimestre", numero: 3, nombre: "III", inicio: new Date("2026-09-01"), fin: new Date("2026-12-18") },
      })).id;
      const salon = await v.db.salon.create({ data: { tenantId: v.tenant.id, nombre: "Volumen", nivel: "primaria", anio: 2026 } });
      const curso = await v.db.curso.create({ data: { tenantId: v.tenant.id, salonId: salon.id, nombre: "Ciencia", profesorId: v.miembros.tutora.membership.id } });
      const alumnos = Array.from({ length: 2100 }, (_, i) => ({ id: randomUUID(), tenantId: v.tenant.id, salonId: salon.id, nombres: `A${i}`, apellidos: "Volumen" }));
      await db.alumno.createMany({ data: alumnos });
      const reciente = await v.db.evaluacion.create({ data: { tenantId: v.tenant.id, cursoId: curso.id, periodoId: pid, titulo: "Reciente", fecha: fechaDb(hoy) } });
      const vieja = await v.db.evaluacion.create({ data: { tenantId: v.tenant.id, cursoId: curso.id, periodoId: pid, titulo: "Vieja", fecha: fechaDb(sumarDias(hoy, -30)) } });
      await db.nota.createMany({ data: alumnos.map((a) => ({ tenantId: v.tenant.id, evaluacionId: reciente.id, alumnoId: a.id, marca: "nsp" as const })) });
      await db.nota.createMany({ data: alumnos.slice(0, 3).map((a) => ({ tenantId: v.tenant.id, evaluacionId: vieja.id, alumnoId: a.id, marca: "nsp" as const })) });

      const sinConfigurar = await db.tenant.findUniqueOrThrow({ where: { id: v.tenant.id } });
      const conteo1 = contarConsultas(v.db);
      expect(await nspVencidosSinConsecuencia(conteo1.proxy as DbTenant, sinConfigurar)).toBe(3);
      expect(conteo1.de("nota.findMany")).toBe(1);
      expect(conteo1.de("justificacion.findMany")).toBe(1);

      const tenant = await db.tenant.update({ where: { id: v.tenant.id }, data: { consecuenciaVencimientoLiteral: "C" } });
      const conteo2 = contarConsultas(v.db);
      expect(await aplicarVencimientos(conteo2.proxy as DbTenant, tenant)).toMatchObject({ aplicadas: 3, sinConfigurar: 0 });
      expect(conteo2.de("nota.findMany")).toBe(1);
      expect(conteo2.de("justificacion.findMany")).toBe(1);
      expect(await v.db.nota.count({ where: { evaluacionId: vieja.id, valorLiteral: "C", vencidaAt: { not: null } } })).toBe(3);
      expect(await v.db.nota.count({ where: { evaluacionId: reciente.id, marca: "nsp", valorLiteral: null } })).toBe(2100);
      expect(await aplicarVencimientos(v.db, tenant)).toMatchObject({ aplicadas: 0 }); // idempotente

      // Lotes pequeños: el cursor recorre todos los vencidos.
      const otros = await v.db.evaluacion.create({ data: { tenantId: v.tenant.id, cursoId: curso.id, periodoId: pid, titulo: "Vieja 2", fecha: fechaDb(sumarDias(hoy, -40)) } });
      await db.nota.createMany({ data: alumnos.slice(0, 1200).map((a) => ({ tenantId: v.tenant.id, evaluacionId: otros.id, alumnoId: a.id, marca: "nsp" as const })) });
      const conteo3 = contarConsultas(v.db);
      expect(await nspVencidosSinConsecuencia(conteo3.proxy as DbTenant, sinConfigurar)).toBe(1200);
      expect(conteo3.de("nota.findMany")).toBe(3); // 500 + 500 + 200
      expect(conteo3.de("justificacion.findMany")).toBe(3);

      // sincronizarNsp por evaluación: los alumnos de todos los salones en una sola consulta.
      const e1 = await v.db.evaluacion.create({ data: { tenantId: v.tenant.id, cursoId: v.cursoTutora.id, periodoId: pid, titulo: "S1", fecha: fechaDb(hoy) } });
      const e2 = await v.db.evaluacion.create({ data: { tenantId: v.tenant.id, cursoId: v.cursoAjeno.id, periodoId: pid, titulo: "S2", fecha: fechaDb(hoy) } });
      const conteo4 = contarConsultas(v.db);
      await sincronizarNsp(conteo4.proxy as DbTenant, tenant, { evaluacionIds: [e1.id, e2.id] });
      expect(conteo4.de("alumno.findMany")).toBe(1);
    } finally {
      await v.limpiar();
    }
  }, 120_000);
});
