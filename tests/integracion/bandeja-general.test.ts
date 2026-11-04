// Bandeja de notificaciones general (specs/38): tareas, evaluaciones, mensajes, comunicados y avisos al profesor, en lote,
// sin duplicados al reintentar, con alcance por membresía y colegio; disponible en Khipu Base; una corrección = un push.
// Requiere la BD local.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { procesarEventosAcademicos } from "@/lib/server/eventos-academicos";
import { publicarComunicado } from "@/lib/server/comunicados";
import { abrirNotificacion, contarNotificacionesSinLeer, listarNotificaciones, marcarTodasLeidas } from "@/lib/server/notificaciones/bandeja";
import { avisarTareaNueva } from "@/lib/server/notificaciones/avisos-tareas";
import { entregarNotificaciones } from "@/lib/server/notificaciones/internas";
import { crearEvaluacion, guardarNota, publicarEvaluacion } from "@/lib/server/notas";
import type { TenantContext } from "@/lib/server/tenant";
import { crearTarea } from "@/lib/server/tareas";
import { fechaLima, sumarDias } from "@/lib/fechas";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let base: ColegioPrueba;
const perfiles: string[] = [];

/** Cuenta las llamadas a la BD (cada método de un modelo es una consulta) hechas con este contexto. */
function contarConsultas(ctx: TenantContext) {
  let n = 0;
  const tdb = new Proxy(ctx.db, {
    get(objetivo, clave) {
      const valor = Reflect.get(objetivo, clave);
      if (typeof clave !== "string" || clave.startsWith("$") || !valor || typeof valor !== "object") return valor;
      return new Proxy(valor, {
        get(modelo, metodo) {
          const fn = Reflect.get(modelo, metodo);
          return typeof fn === "function" ? (...args: unknown[]) => { n++; return fn.apply(modelo, args); } : fn;
        },
      });
    },
  });
  return { ctx: { ...ctx, db: tdb } as TenantContext, consultas: () => n };
}

/** Salón nuevo de la tutora con `n` alumnos, cada uno con un apoderado con consentimiento (sin push). */
async function salonConFamilias(nombre: string, n: number) {
  const salon = await c.db.salon.create({ data: { tenantId: c.tenant.id, nombre, nivel: "primaria", anio: 2026, tutorId: c.miembros.tutora.membership.id } });
  const curso = await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: salon.id, nombre: `Arte ${nombre}`, profesorId: c.miembros.tutora.membership.id } });
  const alumnos = Array.from({ length: n }, (_, i) => ({ id: randomUUID(), tenantId: c.tenant.id, salonId: salon.id, nombres: `A${i}`, apellidos: nombre }));
  await db.alumno.createMany({ data: alumnos });
  const ids = alumnos.map(() => randomUUID());
  perfiles.push(...ids);
  await db.profile.createMany({ data: ids.map((id, i) => ({ id, email: `bg-${i}-${id.slice(0, 6)}@test.local`, nombres: `P${i}`, apellidos: nombre })) });
  const membresias = ids.map((userId) => ({ id: randomUUID(), tenantId: c.tenant.id, userId, rol: "apoderado" as const }));
  await db.membership.createMany({ data: membresias });
  await db.consentimiento.createMany({ data: membresias.map((m) => ({ tenantId: c.tenant.id, apoderadoId: m.id, versionTexto: "test" })) });
  await db.apoderadoAlumno.createMany({ data: membresias.map((m, i) => ({ tenantId: c.tenant.id, apoderadoId: m.id, alumnoId: alumnos[i].id })) });
  return { curso, membresias };
}

async function suscribir(userId: string, clave: string) {
  const endpoint = `https://push.test-bandeja.local/${clave}/${randomUUID()}`;
  await db.pushSuscripcion.create({ data: { userId, endpoint, p256dh: "p".repeat(20), auth: "a".repeat(10) } });
  return endpoint;
}

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-bandeja" });
  base = await crearColegioPrueba({ plan: "base", prefijo: "test-bandeja-base" });
}, 60_000);

afterAll(async () => {
  await db.pushSuscripcion.deleteMany({ where: { endpoint: { startsWith: "https://push.test-bandeja.local/" } } });
  await c?.limpiar();
  await base?.limpiar();
  await db.profile.deleteMany({ where: { id: { in: perfiles } } });
}, 120_000);

describe("productores en lote y sin duplicados", () => {
  it("tarea nueva: una notificación por familia y por alumno con cuenta; push con consentimiento; reintentar no duplica", async () => {
    // Cuenta propia de Mateo (rol alumno).
    const id = randomUUID();
    perfiles.push(id);
    await db.profile.create({ data: { id, email: `alumno-${id.slice(0, 6)}@test.local`, nombres: "Mateo", apellidos: "Quispe" } });
    const cuenta = await db.membership.create({ data: { tenantId: c.tenant.id, userId: id, rol: "alumno" } });
    await db.alumno.update({ where: { id: c.alumnos.mateo.id }, data: { cuentaId: cuenta.id } });
    const endpoint = await suscribir(c.miembros.madre.user.id, "madre");

    const fecha = sumarDias(fechaLima(new Date()), 2);
    expect(await crearTarea(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, titulo: "Lectura", fechaEntrega: fecha, avisarFamilias: true })).toMatchObject({ ok: true });
    const tarea = await c.db.tarea.findFirstOrThrow({ where: { titulo: "Lectura" } });
    const notifs = () => c.db.notificacion.findMany({ where: { clave: `tarea:${tarea.id}` } });
    expect(new Set((await notifs()).map((n) => n.membershipId))).toEqual(new Set([c.miembros.madre.membership.id, c.miembros.padreSinConsentimiento.membership.id, cuenta.id]));
    const push = () => c.db.aviso.findMany({ where: { referenciaId: tarea.id } });
    expect((await push()).map((a) => [a.canal, a.destinatario])).toEqual([["push", endpoint]]); // sin correo; el padre revocó el consentimiento

    // Reintento (doble envío del formulario o un reproceso): nada nuevo.
    await avisarTareaNueva(c.ctxDe("tutora"), tarea.id, { avisarFamilias: true });
    expect(await notifs()).toHaveLength(3);
    expect(await push()).toHaveLength(1);

    // El alumno la ve en su bandeja.
    const alumnoCtx: TenantContext = { ...c.ctxDe("madre"), user: { ...c.miembros.madre.user, id }, membership: cuenta, rol: "alumno", roles: ["alumno"] };
    const suya = await listarNotificaciones(alumnoCtx);
    expect(suya.filas.map((n) => [n.tipo, n.cuerpo])).toEqual([["tarea", expect.stringMatching(/^Tienes una tarea nueva de Matemática: «Lectura»/)]]);
    await db.alumno.update({ where: { id: c.alumnos.mateo.id }, data: { cuentaId: null } });
  });

  it("el número de consultas no crece con el salón (tarea y evaluación programada)", async () => {
    const chico = await salonConFamilias("Chico", 2);
    const grande = await salonConFamilias("Grande", 60);
    const fecha = sumarDias(fechaLima(new Date()), 2);
    const consultasTarea = async (cursoId: string) => {
      await c.db.tarea.create({ data: { tenantId: c.tenant.id, cursoId, titulo: `T-${cursoId}`, fechaEntrega: new Date(`${fecha}T12:00:00Z`), creadoPorId: c.miembros.tutora.membership.id } });
      const t = await c.db.tarea.findFirstOrThrow({ where: { titulo: `T-${cursoId}` } });
      const medido = contarConsultas(c.ctxDe("tutora"));
      expect(await avisarTareaNueva(medido.ctx, t.id, { avisarFamilias: true })).toBeGreaterThan(0);
      return medido.consultas();
    };
    const enChico = await consultasTarea(chico.curso.id);
    const enGrande = await consultasTarea(grande.curso.id);
    expect(enGrande).toBe(enChico);
    expect(enGrande).toBeLessThanOrEqual(10);
    expect(await c.db.notificacion.count({ where: { tipo: "tarea", membershipId: { in: grande.membresias.map((m) => m.id) } } })).toBe(60);

    const periodoId = (await c.db.periodo.create({
      data: { tenantId: c.tenant.id, anio: 2026, tipo: "trimestre", numero: 3, nombre: "III Trimestre", inicio: new Date("2026-09-01"), fin: new Date("2026-12-18") },
    })).id;
    const consultasEvaluacion = async (cursoId: string) => {
      const medido = contarConsultas(c.ctxDe("tutora"));
      expect(await crearEvaluacion(medido.ctx, { cursoId, periodoId, titulo: `E-${cursoId}`, fecha: "2026-11-20", peso: "1", avisar: true })).toMatchObject({ ok: true });
      return medido.consultas();
    };
    expect(await consultasEvaluacion(grande.curso.id)).toBe(await consultasEvaluacion(chico.curso.id));
    expect(await c.db.notificacion.count({ where: { tipo: "evaluacion_programada", membershipId: { in: grande.membresias.map((m) => m.id) } } })).toBe(60);
  }, 60_000);

  it("comunicado: notificación por familia; normal sin correo, importante con correo; el helper no duplica al reintentar", async () => {
    const normal = await publicarComunicado(c.ctxDe("direccion"), { titulo: "Feria", cuerpo: "Habrá feria.", audiencia: { tipo: "salon", salonId: c.salon.id } });
    const importante = await publicarComunicado(c.ctxDe("direccion"), { titulo: "Simulacro", cuerpo: "Simulacro de sismo.", audiencia: { tipo: "salon", salonId: c.salon.id }, importante: true });
    expect(await c.db.notificacion.count({ where: { clave: `comunicado:${normal.id}` } })).toBe(2);
    expect(await c.db.aviso.count({ where: { referenciaId: normal.id, canal: "correo" } })).toBe(0);
    expect(await c.db.aviso.findMany({ where: { referenciaId: importante.id, canal: "correo" }, select: { destinatario: true } })).toEqual([{ destinatario: c.miembros.madre.user.email }]);
    expect(await c.db.aviso.count({ where: { referenciaId: importante.id, canal: "push" } })).toBe(1);

    // Reintentar la entrega con la misma clave no duplica bandeja, push ni correo.
    const entrega = {
      membershipId: c.miembros.madre.membership.id, alumnoId: null, titulo: "Comunicado: Simulacro", cuerpo: "x", url: "/comunicados",
      email: c.miembros.madre.user.email, endpoints: ["https://push.test-bandeja.local/fijo"], apoderadoId: c.miembros.madre.membership.id,
      payload: { colegio: c.tenant.nombre, titulo: "Simulacro", url: "http://c" },
    };
    const datos = { tenant: c.tenant, tipo: "comunicado" as const, clave: `comunicado:${importante.id}`, tipoAviso: "comunicado" as const, plantilla: "comunicado" as const, referenciaId: importante.id, entregas: [entrega] };
    const otra = await entregarNotificaciones(c.db, datos);
    expect(otra.notificaciones).toBe(0);
    expect(otra.avisos).toBe(1); // solo el dispositivo nuevo
    expect(await entregarNotificaciones(c.db, datos)).toMatchObject({ notificaciones: 0, avisos: 0 });
    expect(await c.db.aviso.count({ where: { referenciaId: importante.id, canal: "correo" } })).toBe(1);
  });
});

describe("alcance de la bandeja", () => {
  it("un apoderado no ve las de otro; otro colegio no ve nada; portería no tiene bandeja; el personal ve las suyas", async () => {
    const ajena = await c.db.notificacion.findFirstOrThrow({ where: { membershipId: c.miembros.padreSinConsentimiento.membership.id } });
    expect(await abrirNotificacion(c.ctxDe("madre"), ajena.id)).toBeNull();
    expect((await listarNotificaciones(c.ctxDe("madre"))).filas.some((n) => n.id === ajena.id)).toBe(false);
    expect((await listarNotificaciones(base.ctxDe("madre"))).total).toBe(0);
    expect(await abrirNotificacion(base.ctxDe("madre"), ajena.id)).toBeNull();
    await esperarProhibido(listarNotificaciones(c.ctxDe("porteria")));
    expect(await contarNotificacionesSinLeer(c.ctxDe("porteria"))).toBe(0);

    // Profesor: la suya sin alumno (p. ej. un mensaje) la ve y la abre.
    await c.db.notificacion.create({ data: { tenantId: c.tenant.id, membershipId: c.miembros.otroProfesor.membership.id, tipo: "mensaje", clave: "prueba", titulo: "Mensaje nuevo", cuerpo: "x", url: "/mensajes" } });
    const profe = c.ctxDe("otroProfesor");
    expect(await contarNotificacionesSinLeer(profe)).toBe(1);
    const [n] = (await listarNotificaciones(profe)).filas;
    expect(await abrirNotificacion(profe, n.id)).toBe("/mensajes");
    expect(await marcarTodasLeidas(profe)).toBe(0);
  });

  it("si la familia se desvincula del alumno, deja de ver sus notificaciones", async () => {
    const madre = c.ctxDe("madre");
    const antes = (await listarNotificaciones(madre)).total;
    expect(antes).toBeGreaterThan(0);
    await c.db.apoderadoAlumno.deleteMany({ where: { apoderadoId: madre.membership.id, alumnoId: c.alumnos.mateo.id } });
    const despues = await listarNotificaciones(madre);
    expect(despues.filas.every((n) => n.alumno === null)).toBe(true); // solo quedan las que no son de un alumno (comunicados)
    await c.db.apoderadoAlumno.create({ data: { tenantId: c.tenant.id, apoderadoId: madre.membership.id, alumnoId: c.alumnos.mateo.id } });
  });

  it("en Khipu Base la bandeja está disponible (módulo avisos)", async () => {
    await base.db.notificacion.create({ data: { tenantId: base.tenant.id, membershipId: base.miembros.madre.membership.id, tipo: "comunicado", clave: "base", titulo: "Comunicado", cuerpo: "x", url: "/comunicados" } });
    expect((await listarNotificaciones(base.ctxDe("madre"))).total).toBe(1);
    expect((await listarNotificaciones(base.ctxDe("tutora"))).total).toBe(0);
  });
});

describe("correcciones", () => {
  it("corregir una nota publicada: un solo push por dispositivo (bandeja) y el correo de corrección aparte", async () => {
    const endpoint = (await db.pushSuscripcion.findFirstOrThrow({ where: { userId: c.miembros.madre.user.id } })).endpoint;
    const tutora = c.ctxDe("tutora");
    const periodo = await c.db.periodo.findFirstOrThrow({});
    const comp = await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Resuelve", orden: 1 } });
    await crearEvaluacion(tutora, { cursoId: c.cursoTutora.id, periodoId: periodo.id, competenciaIds: [comp.id], titulo: "Práctica corregida", fecha: "2026-10-20", peso: "1" });
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Práctica corregida" } });
    await guardarNota(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "B" });
    await publicarEvaluacion(tutora, e.grupoId);
    await procesarEventosAcademicos({ tenantId: c.tenant.id });
    const desde = new Date();
    expect(await guardarNota(tutora, { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "A", motivo: "Error al digitar", tipo: "correccion_digitacion" })).toEqual({ ok: true });
    await procesarEventosAcademicos({ tenantId: c.tenant.id });
    const push = await c.db.aviso.findMany({ where: { canal: "push", destinatario: endpoint, createdAt: { gte: desde } } });
    expect(push.map((p) => p.plantilla)).toEqual(["notificacion_academica"]);
    expect(await c.db.aviso.count({ where: { plantilla: "nota_corregida", canal: "correo", apoderadoId: c.miembros.madre.membership.id, createdAt: { gte: desde } } })).toBe(1);
  });
});
