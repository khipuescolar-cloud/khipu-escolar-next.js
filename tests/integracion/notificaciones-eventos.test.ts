// Notificaciones académicas por eventos (specs/38): outbox transaccional al publicar, bandeja interna por apoderado y
// alumno, push por dispositivo en la cola `avisos`, sin correo por cada nota. Escenarios de preproducción del pedido.
// Requiere la BD local.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { procesarEventosAcademicos } from "@/lib/server/eventos-academicos";
import { abrirNotificacion, contarNotificacionesSinLeer, listarNotificaciones } from "@/lib/server/notificaciones/bandeja";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { EnvioPermanenteError, type NotificationChannel } from "@/lib/server/notificaciones/tipos";
import { crearEvaluacion, guardarComentarioNota, guardarNota, notasDeAlumno, publicarEvaluacion } from "@/lib/server/notas";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let otro: ColegioPrueba;
let periodoId: string;
let competenciaId: string;
const perfilesExtra: string[] = [];

/** Apoderado extra con consentimiento vigente vinculado a un alumno, con `dispositivos` suscripciones push. */
async function apoderado(alumnoId: string, nombre: string, dispositivos = 0, tenantId = c.tenant.id) {
  const id = randomUUID();
  perfilesExtra.push(id);
  const user = await db.profile.create({ data: { id, email: `apo-${nombre.toLowerCase()}-${id.slice(0, 6)}@test.local`, nombres: nombre, apellidos: "Prueba" } });
  const membership = await db.membership.create({ data: { tenantId, userId: id, rol: "apoderado" } });
  const consentimiento = await db.consentimiento.create({ data: { tenantId, apoderadoId: membership.id, versionTexto: "test" } });
  await db.apoderadoAlumno.create({ data: { tenantId, apoderadoId: membership.id, alumnoId, consentimientoId: consentimiento.id } });
  for (let i = 0; i < dispositivos; i++) {
    await db.pushSuscripcion.create({ data: { userId: id, endpoint: `https://push.test/${id}/${i}`, p256dh: "p".repeat(20), auth: "a".repeat(10) } });
  }
  const ctx: TenantContext = { ...c.ctxDe("madre"), user, membership, rol: "apoderado", roles: ["apoderado"] };
  return { user, membership, ctx };
}

async function actividad(titulo: string, notas: Record<string, string>) {
  const tutora = c.ctxDe("tutora");
  expect(await crearEvaluacion(tutora, { cursoId: c.cursoTutora.id, periodoId, competenciaIds: [competenciaId], titulo, fecha: "2026-10-20", peso: "1" })).toMatchObject({ ok: true });
  const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo } });
  for (const [alumnoId, valor] of Object.entries(notas)) expect(await guardarNota(tutora, { evaluacionId: e.id, alumnoId, valor })).toMatchObject({ ok: true });
  return e;
}

const notificacionesDe = (membershipId: string) => c.db.notificacion.findMany({ where: { membershipId } });

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-notif" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-notif-otro" });
  periodoId = (await c.db.periodo.create({
    data: { tenantId: c.tenant.id, anio: 2026, tipo: "trimestre", numero: 3, nombre: "III Trimestre", inicio: new Date("2026-09-01"), fin: new Date("2026-12-18") },
  })).id;
  competenciaId = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Resuelve problemas", orden: 1 } })).id;
}, 60_000);

afterAll(async () => {
  await c?.limpiar();
  await otro?.limpiar();
  await db.profile.deleteMany({ where: { id: { in: perfilesExtra } } });
}, 120_000);

describe("publicar genera un evento; los borradores no notifican", () => {
  it("guardar borradores no crea eventos ni notificaciones; publicar crea un solo evento en la misma transacción", async () => {
    const e = await actividad("Práctica 1", { [c.alumnos.mateo.id]: "A", [c.alumnos.valentina.id]: "B" });
    await guardarNota(c.ctxDe("tutora"), { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "AD" }); // sigue en borrador
    expect(await c.db.eventoAcademico.count()).toBe(0);
    expect(await c.db.notificacion.count()).toBe(0);
    // Dos publicaciones a la vez: una sola gana y hay un solo evento.
    const [a, b] = await Promise.all([publicarEvaluacion(c.ctxDe("tutora"), e.grupoId), publicarEvaluacion(c.ctxDe("tutora"), e.grupoId)]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(await c.db.eventoAcademico.findMany({ where: { grupoId: e.grupoId } })).toMatchObject([{ tipo: "resultados_publicados", estado: "pendiente" }]);
    // Sin worker, la nota ya está publicada para la familia (no depende de las notificaciones).
    const familia = await notasDeAlumno(c.ctxDe("madre"), c.alumnos.mateo.id, periodoId);
    expect(familia.cursos.flatMap((x) => x.evaluaciones).map((x) => x.valor.valorLiteral)).toEqual(["AD"]);
  });

  it("el worker crea una notificación por apoderado y alumno, sin notas en el texto, y no envía correos", async () => {
    const r = await procesarEventosAcademicos({ tenantId: c.tenant.id });
    expect(r).toMatchObject({ procesados: 1, errores: 0 });
    const madre = await notificacionesDe(c.miembros.madre.membership.id);
    expect(madre).toHaveLength(1);
    expect(madre[0]).toMatchObject({ titulo: "Nuevo resultado publicado", alumnoId: c.alumnos.mateo.id });
    expect(madre[0].cuerpo).toContain("Matemática");
    expect(madre[0].cuerpo).not.toMatch(/\bAD\b|\bA\b|\bB\b/);
    expect(madre[0].url).toMatch(/^\/notas\?alumno=.+#ev-/);
    // Correo: ninguno por una calificación nueva.
    expect(await c.db.aviso.count({ where: { canal: "correo", plantilla: { in: ["resultados_publicados", "notificacion_academica", "resumen_academico"] } } })).toBe(0);
    // Procesar otra vez no duplica.
    expect((await procesarEventosAcademicos({ tenantId: c.tenant.id })).procesados).toBe(0);
    expect(await notificacionesDe(c.miembros.madre.membership.id)).toHaveLength(1);
  });

  it("la observación interna del profesor no llega a la familia", async () => {
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Práctica 1" } });
    await guardarComentarioNota(c.ctxDe("tutora"), { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, comentario: "Copió en la prueba", privado: true });
    const familia = await notasDeAlumno(c.ctxDe("madre"), c.alumnos.mateo.id, periodoId);
    expect(JSON.stringify(familia)).not.toContain("Copió");
    await guardarComentarioNota(c.ctxDe("tutora"), { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, comentario: "Muy buen procedimiento" });
    const visible = await notasDeAlumno(c.ctxDe("madre"), c.alumnos.mateo.id, periodoId);
    const ev = visible.cursos.flatMap((x) => x.evaluaciones)[0];
    expect(ev).toMatchObject({ comentario: "Muy buen procedimiento", instrumento: null });
    expect(visible.cursos.find((x) => x.id === c.cursoTutora.id)?.profesor).toBe("Lucia Prueba");
  });
});

describe("destinatarios y dispositivos", () => {
  it("varios apoderados, un dispositivo sin permiso y otro usuario con dos dispositivos", async () => {
    const sinPermiso = await apoderado(c.alumnos.valentina.id, "Sinpush", 0);
    const dosEquipos = await apoderado(c.alumnos.valentina.id, "Dosequipos", 2);
    const e = await actividad("Práctica 2", { [c.alumnos.valentina.id]: "A" });
    await publicarEvaluacion(c.ctxDe("tutora"), e.grupoId);
    await procesarEventosAcademicos({ tenantId: c.tenant.id });
    // Tres apoderados de Valentina (incluido el que revocó el consentimiento: lo ve en Khipu, sin push).
    const notifs = await c.db.notificacion.findMany({ where: { evento: { grupoId: e.grupoId } } });
    expect(new Set(notifs.map((n) => n.membershipId))).toEqual(new Set([sinPermiso.membership.id, dosEquipos.membership.id, c.miembros.padreSinConsentimiento.membership.id]));
    const push = await c.db.aviso.findMany({ where: { referenciaId: e.grupoId, canal: "push" } });
    expect(push).toHaveLength(2); // solo los dos dispositivos de quien tiene push
    expect(new Set(push.map((p) => p.destinatario)).size).toBe(2);
    expect(push.every((p) => p.apoderadoId === dosEquipos.membership.id && p.notificacionId)).toBe(true);
    expect(JSON.stringify(push[0].payload)).not.toMatch(/"A"/);
    expect(await contarNotificacionesSinLeer(sinPermiso.ctx)).toBe(1);
  });

  it("si el servicio push falla, la notificación sigue en la bandeja y el push queda para reintento", async () => {
    const falla: NotificationChannel = { canal: "push", enviar: async () => { throw new Error("Servicio push caído"); } };
    const vencida: NotificationChannel = { canal: "push", enviar: async () => { throw new EnvioPermanenteError("Suscripción push vencida"); } };
    const r = await procesarCola({ tenantId: c.tenant.id, canales: { push: falla }, esperar: async () => {} });
    expect(r.reintentos).toBeGreaterThan(0);
    const pendientes = await c.db.aviso.findMany({ where: { canal: "push", plantilla: "notificacion_academica" } });
    expect(pendientes.every((p) => p.estado === "pendiente" && p.error?.includes("caído"))).toBe(true);
    expect(await c.db.notificacion.count()).toBeGreaterThan(0);
    // Una suscripción vencida (404/410) queda «omitido» sin más reintentos (PushChannel además la borra); la bandeja no cambia.
    await c.db.aviso.updateMany({ where: { canal: "push" }, data: { programadoPara: new Date(0) } });
    await procesarCola({ tenantId: c.tenant.id, canales: { push: vencida }, esperar: async () => {} });
    expect(await c.db.aviso.count({ where: { canal: "push", estado: "omitido" } })).toBe(pendientes.length);
    expect(await c.db.eventoAcademico.count({ where: { estado: "procesado" } })).toBe(2);
  });
});

describe("correcciones, actividades seguidas y seguridad", () => {
  it("corregir una nota publicada: correo de corrección y notificación «Calificación actualizada» solo a esa familia", async () => {
    const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo: "Práctica 1" } });
    expect(await guardarNota(c.ctxDe("tutora"), { evaluacionId: e.id, alumnoId: c.alumnos.mateo.id, valor: "A", motivo: "Error al digitar", tipo: "correccion_digitacion" })).toEqual({ ok: true });
    expect(await c.db.eventoAcademico.count({ where: { tipo: "nota_corregida", alumnoId: c.alumnos.mateo.id } })).toBe(1);
    await procesarEventosAcademicos({ tenantId: c.tenant.id });
    const madre = await notificacionesDe(c.miembros.madre.membership.id);
    expect(madre.map((n) => n.titulo).sort()).toEqual(["Calificación actualizada", "Nuevo resultado publicado"]);
    expect(await c.db.aviso.count({ where: { plantilla: "nota_corregida", canal: "correo", apoderadoId: c.miembros.madre.membership.id } })).toBe(1);
    // Los apoderados de Valentina no reciben nada por la corrección de Mateo.
    expect(await c.db.notificacion.count({ where: { evento: { tipo: "nota_corregida" }, alumnoId: { not: c.alumnos.mateo.id } } })).toBe(0);
  });

  it("varias actividades seguidas: una notificación por actividad, sin duplicados", async () => {
    for (const t of ["Seguida 1", "Seguida 2", "Seguida 3"]) {
      const e = await actividad(t, { [c.alumnos.mateo.id]: "B" });
      await publicarEvaluacion(c.ctxDe("tutora"), e.grupoId);
    }
    await Promise.all([procesarEventosAcademicos({ tenantId: c.tenant.id }), procesarEventosAcademicos({ tenantId: c.tenant.id })]);
    const madre = await notificacionesDe(c.miembros.madre.membership.id);
    expect(madre.filter((n) => n.cuerpo.includes("Seguida"))).toHaveLength(3);
    expect(await c.db.eventoAcademico.count({ where: { estado: { not: "procesado" } } })).toBe(0);
  });

  it("no se consultan notas ni notificaciones de otro alumno ni de otro colegio", async () => {
    await esperarProhibido(notasDeAlumno(c.ctxDe("madre"), c.alumnos.valentina.id, periodoId));
    const ajena = await c.db.notificacion.findFirstOrThrow({ where: { alumnoId: c.alumnos.valentina.id } });
    expect(await abrirNotificacion(c.ctxDe("madre"), ajena.id)).toBeNull();
    expect((await listarNotificaciones(c.ctxDe("madre"))).filas.every((n) => n.alumno?.nombres === "Mateo")).toBe(true);
    // Apoderada de otro colegio: ni la bandeja ni el enlace directo.
    expect((await listarNotificaciones(otro.ctxDe("madre"))).total).toBe(0);
    expect(await abrirNotificacion(otro.ctxDe("madre"), ajena.id)).toBeNull();
    await esperarProhibido(notasDeAlumno(otro.ctxDe("madre"), c.alumnos.mateo.id, periodoId));
    // El personal tiene su propia bandeja (specs/38), pero nunca ve las de una familia; portería no tiene bandeja.
    expect((await listarNotificaciones(c.ctxDe("tutora"))).filas.some((n) => n.id === ajena.id)).toBe(false);
    expect(await abrirNotificacion(c.ctxDe("tutora"), ajena.id)).toBeNull();
    await esperarProhibido(listarNotificaciones(c.ctxDe("porteria")));
    // Abrir la propia la marca leída y devuelve la ruta de la actividad.
    const propia = (await notificacionesDe(c.miembros.madre.membership.id))[0];
    expect(await abrirNotificacion(c.ctxDe("madre"), propia.id)).toBe(propia.url);
    expect((await c.db.notificacion.findUniqueOrThrow({ where: { id: propia.id } })).leidaAt).not.toBeNull();
  });
});

describe("volumen", () => {
  it("publicar 30 notas de un salón y 1.000 resultados en lotes, con un número fijo de consultas", async () => {
    // 1.000 alumnos en un salón nuevo con un apoderado cada uno (sin push) y el curso de la tutora.
    const salon = await c.db.salon.create({ data: { tenantId: c.tenant.id, nombre: "Volumen", nivel: "primaria", anio: 2026, tutorId: c.miembros.tutora.membership.id } });
    const curso = await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: salon.id, nombre: "Ciencia", profesorId: c.miembros.tutora.membership.id } });
    const comp = await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: curso.id, nombre: "Indaga", orden: 1 } });
    const alumnos = Array.from({ length: 1000 }, (_, i) => ({ id: randomUUID(), tenantId: c.tenant.id, salonId: salon.id, nombres: `A${i}`, apellidos: "Volumen" }));
    await db.alumno.createMany({ data: alumnos });
    const ids = alumnos.map(() => randomUUID());
    perfilesExtra.push(...ids);
    await db.profile.createMany({ data: ids.map((id, i) => ({ id, email: `vol-${i}-${id.slice(0, 6)}@test.local`, nombres: `P${i}`, apellidos: "Volumen" })) });
    const membresias = ids.map((userId) => ({ id: randomUUID(), tenantId: c.tenant.id, userId, rol: "apoderado" as const }));
    await db.membership.createMany({ data: membresias });
    await db.apoderadoAlumno.createMany({ data: membresias.map((m, i) => ({ tenantId: c.tenant.id, apoderadoId: m.id, alumnoId: alumnos[i].id })) });

    const tutora = c.ctxDe("tutora");
    for (const [titulo, n] of [["Treinta", 30], ["Mil", 1000]] as const) {
      await crearEvaluacion(tutora, { cursoId: curso.id, periodoId, competenciaIds: [comp.id], titulo, fecha: "2026-10-21", peso: "1" });
      const e = await c.db.evaluacion.findFirstOrThrow({ where: { titulo, cursoId: curso.id } });
      await db.nota.createMany({ data: alumnos.slice(0, n).map((a) => ({ tenantId: c.tenant.id, evaluacionId: e.id, alumnoId: a.id, valorLiteral: "A" as const, registradoPorId: c.miembros.tutora.membership.id })) });
      await publicarEvaluacion(tutora, e.grupoId);
      const inicio = Date.now();
      const r = await procesarEventosAcademicos({ tenantId: c.tenant.id });
      const ms = Date.now() - inicio;
      expect(r).toMatchObject({ procesados: 1, errores: 0, notificaciones: n });
      expect(await c.db.notificacion.count({ where: { evento: { grupoId: e.grupoId } } })).toBe(n);
      expect(ms).toBeLessThan(15_000); // lotes de 500 con createMany, no una consulta por alumno
    }
  }, 120_000);
});
