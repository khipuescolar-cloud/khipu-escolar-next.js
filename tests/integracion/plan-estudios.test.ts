import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { crearSalon, crearCurso } from "@/lib/server/gestion";
import { guardarCursoColegio, guardarMallaGrado } from "@/lib/server/plan-estudios";
import { armarPlanDesdeCursos } from "../../scripts/curriculum/plan-desde-cursos";
import { crearColegioPrueba, type ColegioPrueba, esperarProhibido } from "./ayudantes/colegio-prueba";

describe("plan de estudios por colegio", () => {
  let a: ColegioPrueba;
  let b: ColegioPrueba;
  beforeAll(async () => {
    a = await crearColegioPrueba({ plan: "pro", prefijo: "test-malla-a" });
    b = await crearColegioPrueba({ plan: "pro", prefijo: "test-malla-b" });
    await a.db.salon.updateMany({ where: { id: { in: [a.salon.id, a.otroSalon.id] } }, data: { grado: 3 } });
    await b.db.salon.update({ where: { id: b.salon.id }, data: { grado: 3 } });
  });
  afterAll(async () => {
    await a?.limpiar();
    await b?.limpiar();
    await db.$disconnect();
  });

  it("crea el curso de la malla en todos los salones y en los nuevos", async () => {
    const ctx = a.ctxDe("direccion");
    const id = await guardarCursoColegio(ctx, { cursoKhipu: "algebra" });
    const r = await guardarMallaGrado(ctx, { anio: 2026, nivel: "primaria", grado: 3, cursoColegioIds: [id] });
    expect(r.creados).toBe(2);
    expect(await a.db.curso.count({ where: { cursoColegioId: id } })).toBe(2);
    const curso = await a.db.curso.findFirstOrThrow({ where: { cursoColegioId: id } });
    expect(curso.areaCneb).toBe("matematica");
    expect(await a.db.competencia.count({ where: { cursoId: curso.id } })).toBeGreaterThan(0);
    const salonId = await crearSalon(ctx, { nombre: "3.° C", nivel: "primaria", grado: 3, seccion: "C", anio: 2026, tutorId: a.miembros.tutora.membership.id });
    expect(await a.db.curso.count({ where: { salonId, cursoColegioId: id } })).toBe(1);
    expect((await guardarMallaGrado(ctx, { anio: 2026, nivel: "primaria", grado: 3, cursoColegioIds: [id] })).creados).toBe(0);
  });

  it("conserva cursos con asistencia o sesión de Nudito y avisa al quitarlo de la malla", async () => {
    const ctx = a.ctxDe("direccion");
    const curso = await a.db.curso.findFirstOrThrow({ where: { salonId: a.salon.id, cursoColegio: { cursoKhipu: "algebra" } } });
    await a.db.asistencia.create({ data: {
      tenantId: a.tenant.id, alumnoId: a.alumnos.mateo.id, cursoId: curso.id, ambito: curso.id,
      fecha: new Date("2026-04-01"), hora: "08:00", estado: "llego",
    } });
    const cursoNudito = await a.db.curso.findFirstOrThrow({ where: { salonId: a.otroSalon.id, cursoColegio: { cursoKhipu: "algebra" } } });
    await a.db.nuditoSesion.create({ data: { tenantId: a.tenant.id, alumnoId: a.alumnos.mateo.id, membershipId: a.miembros.tutora.membership.id, cursoId: cursoNudito.id, semilla: 1 } });
    const r = await guardarMallaGrado(ctx, { anio: 2026, nivel: "primaria", grado: 3, cursoColegioIds: [] });
    expect(r.avisos.join(" ")).toContain("conserva datos asociados");
    expect(await a.db.curso.findUnique({ where: { id: curso.id } })).not.toBeNull();
    expect(await a.db.curso.findUnique({ where: { id: cursoNudito.id } })).not.toBeNull();
    expect(r.borrados).toBeGreaterThan(0);
  });

  it("rechaza cursos de otro colegio y al profesor", async () => {
    const idB = await guardarCursoColegio(b.ctxDe("direccion"), { cursoKhipu: "quimica" });
    await expect(guardarMallaGrado(a.ctxDe("direccion"), { anio: 2026, nivel: "primaria", grado: 3, cursoColegioIds: [idB] })).rejects.toThrow("no pertenece");
    await esperarProhibido(guardarCursoColegio(a.ctxDe("tutora"), { cursoKhipu: "fisica" }));
    expect(await a.db.cursoColegio.count({ where: { id: idB } })).toBe(0);
  });

  it("enlaza un curso manual y el backfill es idempotente", async () => {
    const ctx = b.ctxDe("direccion");
    const manual = await crearCurso(ctx, { salonId: b.salon.id, nombre: "Álgebra", profesorId: b.miembros.tutora.membership.id });
    const enlazado = await b.db.curso.findUniqueOrThrow({ where: { id: manual } });
    expect(enlazado.cursoColegioId).not.toBeNull();
    const primero = await armarPlanDesdeCursos(db, b.tenant.id);
    const segundo = await armarPlanDesdeCursos(db, b.tenant.id);
    expect(primero.cursos).toBeGreaterThan(0);
    expect(segundo).toMatchObject({ definiciones: 0, enlaces: 0, ofertas: 0 });
  });
});
