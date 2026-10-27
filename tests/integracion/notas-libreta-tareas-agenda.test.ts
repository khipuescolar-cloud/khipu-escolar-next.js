// Requiere la BD local con el seed (solo lee losolivos). Crea su propio colegio de prueba y lo borra al terminar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Rol } from "@/generated/prisma/enums";
import { crearEvento, itemsDeAgenda } from "@/lib/server/agenda";
import { db, dbTenant } from "@/lib/server/db";
import { datosLibreta } from "@/lib/server/libreta";
import {
  calificacionesPeriodo, crearEvaluacion, guardarCalificacionPeriodo, guardarNota, listarPeriodos, notasDeAlumno,
} from "@/lib/server/notas";
import { crearTarea, tareasDeFamilia } from "@/lib/server/tareas";
import type { TenantContext } from "@/lib/server/tenant";
import { fechaLima, sumarDias } from "@/lib/fechas";

// forbidden() solo lanza el 403 con digest si Next tiene activado authInterrupts (lo hace next.config.ts en la app).
process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";
const PROHIBIDO = { digest: expect.stringContaining(";403") };

const slug = `test-fase2-${randomUUID().slice(0, 8)}`;
const perfiles: string[] = [];
let tenantId: string;
const ids = {} as Record<string, string>;

async function ctxDe(tenant: Awaited<ReturnType<typeof db.tenant.findFirstOrThrow>>, membershipId: string, rol: Rol): Promise<TenantContext> {
  const membership = await db.membership.findUniqueOrThrow({ where: { id: membershipId } });
  const user = await db.profile.findUniqueOrThrow({ where: { id: membership.userId } });
  return { tenant, user, membership, rol, roles: [rol], db: dbTenant(tenant.id) };
}

async function miembro(rol: Rol, nombre: string) {
  const id = randomUUID();
  perfiles.push(id);
  await db.profile.create({ data: { id, email: `${nombre}-${slug}@prueba.local`, nombres: nombre } });
  return db.membership.create({ data: { tenantId, userId: id, rol } });
}

let tenant: Awaited<ReturnType<typeof db.tenant.findFirstOrThrow>>;
let profe: TenantContext, profeAjeno: TenantContext, madreA: TenantContext, madreB: TenantContext, direccion: TenantContext;

beforeAll(async () => {
  tenant = await db.tenant.create({ data: { slug, nombre: "Colegio de prueba fase 2", plan: "fase2", escalaCalificacion: "vigesimal" } });
  tenantId = tenant.id;
  const [mProfe, mAjeno, mA, mB, mDir] = await Promise.all([
    miembro("profesor", "profe"), miembro("profesor", "ajeno"), miembro("apoderado", "madrea"), miembro("apoderado", "madreb"), miembro("direccion", "dir"),
  ]);
  const salon = await db.salon.create({ data: { tenantId, nombre: "Salón A", nivel: "academia", anio: 2026, tutorId: mProfe.id } });
  const salonB = await db.salon.create({ data: { tenantId, nombre: "Salón B", nivel: "academia", anio: 2026, tutorId: mAjeno.id } });
  ids.salon = salon.id;
  ids.salonB = salonB.id;
  const curso = await db.curso.create({ data: { tenantId, salonId: salon.id, nombre: "Álgebra", profesorId: mProfe.id } });
  ids.curso = curso.id;
  const a1 = await db.alumno.create({ data: { tenantId, salonId: salon.id, nombres: "Ana", apellidos: "Uno" } });
  const a2 = await db.alumno.create({ data: { tenantId, salonId: salon.id, nombres: "Beto", apellidos: "Dos" } });
  ids.a1 = a1.id;
  ids.a2 = a2.id;
  await db.apoderadoAlumno.create({ data: { tenantId, apoderadoId: mA.id, alumnoId: a1.id } });
  await db.apoderadoAlumno.create({ data: { tenantId, apoderadoId: mB.id, alumnoId: a2.id } });
  const abierto = await db.periodo.create({ data: { tenantId, anio: 2026, tipo: "bimestre", numero: 4, nombre: "IV Bimestre", inicio: new Date("2026-10-01"), fin: new Date("2026-12-18") } });
  const cerrado = await db.periodo.create({ data: { tenantId, anio: 2026, tipo: "bimestre", numero: 3, nombre: "III Bimestre", inicio: new Date("2026-08-01"), fin: new Date("2026-09-30"), cerrado: true } });
  ids.abierto = abierto.id;
  ids.cerrado = cerrado.id;
  const comp = await db.competencia.create({ data: { tenantId, cursoId: curso.id, nombre: "Resuelve problemas" } });
  ids.comp = comp.id;
  const evA = await db.evaluacion.create({ data: { tenantId, cursoId: curso.id, periodoId: abierto.id, competenciaId: comp.id, titulo: "Práctica 1", fecha: new Date("2026-10-10"), peso: 1 } });
  const evB = await db.evaluacion.create({ data: { tenantId, cursoId: curso.id, periodoId: abierto.id, competenciaId: comp.id, titulo: "Examen", fecha: new Date("2026-10-20"), peso: 3 } });
  const evC = await db.evaluacion.create({ data: { tenantId, cursoId: curso.id, periodoId: cerrado.id, titulo: "Antiguo", fecha: new Date("2026-09-01"), peso: 1 } });
  ids.evA = evA.id;
  ids.evB = evB.id;
  ids.evC = evC.id;
  for (const [alumnoId, valor] of [[a1.id, 15], [a2.id, 7]] as const) {
    await db.nota.create({ data: { tenantId, evaluacionId: evA.id, alumnoId, valorNumerico: valor, registradoPorId: mProfe.id } });
  }
  await db.calificacionPeriodo.create({ data: { tenantId, alumnoId: a1.id, competenciaId: comp.id, periodoId: cerrado.id, valorNumerico: 14, conclusion: "Va bien." } });
  await db.asistencia.createMany({
    data: [
      { tenantId, alumnoId: a1.id, fecha: new Date("2026-08-05"), ambito: "dia", hora: "07:50", estado: "llego", registradoPorId: mProfe.id },
      { tenantId, alumnoId: a1.id, fecha: new Date("2026-08-06"), ambito: "dia", hora: "08:20", estado: "tarde", registradoPorId: mProfe.id },
      { tenantId, alumnoId: a1.id, fecha: new Date("2026-08-07"), ambito: "dia", hora: "00:00", estado: "falta", registradoPorId: mProfe.id },
    ],
  });
  await db.eventoAgenda.create({ data: { tenantId, salonId: salonB.id, titulo: "Solo salón B", inicio: new Date(), creadoPorId: mAjeno.id } });
  await db.eventoAgenda.create({ data: { tenantId, titulo: "Para todo el colegio", inicio: new Date(), creadoPorId: mDir.id } });

  [profe, profeAjeno, madreA, madreB, direccion] = await Promise.all([
    ctxDe(tenant, mProfe.id, "profesor"), ctxDe(tenant, mAjeno.id, "profesor"), ctxDe(tenant, mA.id, "apoderado"),
    ctxDe(tenant, mB.id, "apoderado"), ctxDe(tenant, mDir.id, "direccion"),
  ]);
});

afterAll(async () => {
  await db.tenant.deleteMany({ where: { slug } }); // cascada: salones, notas, auditoría…
  await db.profile.deleteMany({ where: { id: { in: perfiles } } });
  await db.$disconnect();
});

describe("notas: alcance de las familias", () => {
  it("el apoderado ve las notas de su hijo, solo las suyas", async () => {
    const datos = await notasDeAlumno(madreA, ids.a1, ids.abierto);
    const evaluaciones = datos.cursos.flatMap((c) => c.evaluaciones);
    expect(evaluaciones).toHaveLength(1);
    expect(evaluaciones[0].valor.valorNumerico).toBe(15);
    // Nunca promedios del salón, rankings ni comparaciones.
    expect(JSON.stringify(datos)).not.toMatch(/promedio|ranking|puesto|salon_promedio/i);
    expect(JSON.stringify(datos)).not.toContain('"valorNumerico":7');
  });

  it("el apoderado no puede ver las notas ni la libreta de otro alumno", async () => {
    await expect(notasDeAlumno(madreA, ids.a2, ids.abierto)).rejects.toMatchObject(PROHIBIDO);
    await expect(datosLibreta(madreA, ids.a2, ids.cerrado)).rejects.toMatchObject(PROHIBIDO);
    await expect(notasDeAlumno(madreB, ids.a1, ids.abierto)).rejects.toMatchObject(PROHIBIDO);
  });

  it("el apoderado no puede escribir notas", async () => {
    await expect(guardarNota(madreA, { evaluacionId: ids.evA, alumnoId: ids.a1, valor: "20" })).rejects.toMatchObject(PROHIBIDO);
  });
});

describe("notas: escritura del profesor", () => {
  it("guarda una nota vigesimal y rechaza valores fuera de 0–20", async () => {
    expect((await guardarNota(profe, { evaluacionId: ids.evB, alumnoId: ids.a1, valor: "17" })).ok).toBe(true);
    expect((await db.nota.findFirstOrThrow({ where: { evaluacionId: ids.evB, alumnoId: ids.a1 } })).valorNumerico?.toString()).toBe("17");
    const r = await guardarNota(profe, { evaluacionId: ids.evB, alumnoId: ids.a1, valor: "21" });
    expect(r.ok).toBe(false);
    expect((await guardarNota(profe, { evaluacionId: ids.evB, alumnoId: ids.a1, valor: "" })).ok).toBe(true);
    expect(await db.nota.count({ where: { evaluacionId: ids.evB, alumnoId: ids.a1 } })).toBe(0);
  });

  it("un profesor ajeno al curso no puede escribir", async () => {
    await expect(guardarNota(profeAjeno, { evaluacionId: ids.evA, alumnoId: ids.a1, valor: "10" })).rejects.toMatchObject(PROHIBIDO);
  });

  it("un periodo cerrado no se edita", async () => {
    const r = await guardarNota(profe, { evaluacionId: ids.evC, alumnoId: ids.a1, valor: "12" });
    expect(r).toEqual({ ok: false, error: expect.stringContaining("cerrado") });
    expect(await db.nota.count({ where: { evaluacionId: ids.evC } })).toBe(0);
    const c = await guardarCalificacionPeriodo(profe, { alumnoId: ids.a1, competenciaId: ids.comp, periodoId: ids.cerrado, valor: "18", conclusion: "" });
    expect(c.ok).toBe(false);
    const e = await crearEvaluacion(profe, { cursoId: ids.curso, periodoId: ids.cerrado, titulo: "Nueva", fecha: "2026-10-01", peso: 1 });
    expect(e.ok).toBe(false);
  });

  it("dirección ve todo pero no edita notas", async () => {
    await expect(guardarNota(direccion, { evaluacionId: ids.evA, alumnoId: ids.a1, valor: "10" })).rejects.toMatchObject(PROHIBIDO);
  });

  it("sugiere el promedio ponderado y guarda la calificación confirmada", async () => {
    await guardarNota(profe, { evaluacionId: ids.evB, alumnoId: ids.a1, valor: "19" });
    const c = await calificacionesPeriodo(profe, ids.curso, ids.abierto);
    const fila = c.filas[0].alumnos.find((a) => a.alumno.id === ids.a1)!;
    expect(fila.sugerido?.valorNumerico).toBe(18); // (15·1 + 19·3) / 4 = 18
    expect((await guardarCalificacionPeriodo(profe, { alumnoId: ids.a1, competenciaId: ids.comp, periodoId: ids.abierto, valor: "18", conclusion: "" })).ok).toBe(true);
  });

  it("en escala literal B y C exigen conclusión", async () => {
    const literal = { ...profe, tenant: { ...tenant, escalaCalificacion: "literal" as const } };
    const sin = await guardarCalificacionPeriodo(literal, { alumnoId: ids.a2, competenciaId: ids.comp, periodoId: ids.abierto, valor: "B", conclusion: "" });
    expect(sin.ok).toBe(false);
    const con = await guardarCalificacionPeriodo(literal, { alumnoId: ids.a2, competenciaId: ids.comp, periodoId: ids.abierto, valor: "B", conclusion: "Necesita reforzar fracciones." });
    expect(con.ok).toBe(true);
    const a = await guardarCalificacionPeriodo(literal, { alumnoId: ids.a2, competenciaId: ids.comp, periodoId: ids.abierto, valor: "A", conclusion: "" });
    expect(a.ok).toBe(true);
  });
});

describe("libreta", () => {
  it("arma la libreta con calificaciones, conclusión y asistencia, y audita la vista", async () => {
    const l = await datosLibreta(madreA, ids.a1, ids.cerrado, "exportar");
    expect(l.cursos[0].competencias[0]).toMatchObject({ nombre: "Resuelve problemas", conclusion: "Va bien." });
    expect(l.cursos[0].competencias[0].calificacion?.valorNumerico).toBe(14);
    expect(l.asistencia).toMatchObject({ llego: 1, tarde: 1, falta: 1, total: 3 });
    expect(await db.auditoria.count({ where: { tenantId, entidad: "libreta", accion: "exportar", entidadId: ids.a1 } })).toBe(1);
  });

  it("un profesor de otro salón no accede a la libreta", async () => {
    await expect(datosLibreta(profeAjeno, ids.a1, ids.cerrado)).rejects.toMatchObject(PROHIBIDO);
    expect((await datosLibreta(profe, ids.a1, ids.cerrado)).alumno.nombres).toBe("Ana");
  });
});

describe("tareas y agenda", () => {
  it("el profesor crea tareas solo en sus cursos y las familias las ven agrupadas por hijo", async () => {
    const hoy = fechaLima(new Date());
    expect((await crearTarea(profe, { cursoId: ids.curso, titulo: "Ejercicios 1 a 10", fechaEntrega: sumarDias(hoy, 1) })).ok).toBe(true);
    expect((await crearTarea(profe, { cursoId: ids.curso, titulo: "Proyecto final", fechaEntrega: sumarDias(hoy, 20) })).ok).toBe(true);
    expect((await crearTarea(profe, { cursoId: ids.curso, titulo: "Vieja", fechaEntrega: sumarDias(hoy, -2) })).ok).toBe(false);
    await expect(crearTarea(profeAjeno, { cursoId: ids.curso, titulo: "Intrusa", fechaEntrega: sumarDias(hoy, 3) })).rejects.toMatchObject(PROHIBIDO);
    await expect(crearTarea(madreA, { cursoId: ids.curso, titulo: "Intrusa", fechaEntrega: sumarDias(hoy, 3) })).rejects.toMatchObject(PROHIBIDO);

    const hijos = await tareasDeFamilia(madreA);
    expect(hijos).toHaveLength(1);
    expect(hijos[0].grupos.manana.map((t) => t.titulo)).toEqual(["Ejercicios 1 a 10"]);
    expect(hijos[0].grupos.despues.map((t) => t.titulo)).toEqual(["Proyecto final"]);
    expect(hijos[0].grupos.semana).toHaveLength(0);
  });

  it("la agenda muestra eventos del colegio y del salón propio, y las tareas como entregas", async () => {
    const desde = new Date(Date.now() - 86_400_000);
    const hasta = new Date(Date.now() + 40 * 86_400_000);
    const titulos = (await itemsDeAgenda(madreA, desde, hasta)).map((i) => i.titulo);
    expect(titulos).toContain("Para todo el colegio");
    expect(titulos).toContain("Entrega: Ejercicios 1 a 10");
    expect(titulos).not.toContain("Solo salón B");
    expect((await itemsDeAgenda(direccion, desde, hasta)).map((i) => i.titulo)).toContain("Solo salón B");
  });

  it("el profesor crea eventos solo de sus salones; el apoderado no crea", async () => {
    const f = fechaLima(new Date());
    expect((await crearEvento(profe, { titulo: "Examen de Álgebra", tipo: "examen", fecha: f, salonId: ids.salon })).ok).toBe(true);
    expect((await crearEvento(profe, { titulo: "Ajeno", tipo: "evento", fecha: f, salonId: ids.salonB })).ok).toBe(false);
    expect((await crearEvento(profe, { titulo: "Sin salón", tipo: "evento", fecha: f })).ok).toBe(false);
    expect((await crearEvento(direccion, { titulo: "Feriado", tipo: "feriado", fecha: f })).ok).toBe(true);
    await expect(crearEvento(madreA, { titulo: "No", tipo: "evento", fecha: f })).rejects.toMatchObject(PROHIBIDO);
  });
});

describe("plan Básico", () => {
  it("responde 403 en notas, libreta, tareas y agenda", async () => {
    const lo = await db.tenant.findUniqueOrThrow({ where: { slug: "losolivos" } });
    expect(lo.plan).toBe("basico");
    const dir = await db.membership.findFirstOrThrow({ where: { tenantId: lo.id, rol: "direccion" } });
    const ctx = await ctxDe(lo, dir.id, "direccion");
    const alumno = await db.alumno.findFirstOrThrow({ where: { tenantId: lo.id } });
    const periodo = randomUUID();
    await expect(listarPeriodos(ctx)).rejects.toMatchObject(PROHIBIDO);
    await expect(notasDeAlumno(ctx, alumno.id, periodo)).rejects.toMatchObject(PROHIBIDO);
    await expect(datosLibreta(ctx, alumno.id, periodo)).rejects.toMatchObject(PROHIBIDO);
    await expect(itemsDeAgenda(ctx, new Date(), new Date())).rejects.toMatchObject(PROHIBIDO);
    await expect(tareasDeFamilia(ctx)).rejects.toMatchObject(PROHIBIDO);
  });
});
