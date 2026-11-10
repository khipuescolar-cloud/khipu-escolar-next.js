import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { temaVisibleParaAlumno } from "@/lib/server/curriculum/modelo";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

describe("modelo curricular global y oferta aislada", () => {
  let a: ColegioPrueba;
  let b: ColegioPrueba;
  const clave = "test.curriculum.global.compartido";

  beforeAll(async () => {
    a = await crearColegioPrueba({ plan: "pro", prefijo: "test-curr-a" });
    b = await crearColegioPrueba({ plan: "pro", prefijo: "test-curr-b" });
    await db.temaCurricular.create({
      data: {
        clave,
        areaCneb: "matematica",
        disciplinas: ["algebra"],
        nivel: "primaria",
        grado: 3,
        procedencia: "prueba",
        estado: "borrador",
      },
    });
  });

  afterAll(async () => {
    await db.temaCurricular.deleteMany({ where: { clave } });
    await a?.limpiar();
    await b?.limpiar();
    await db.$disconnect();
  });

  it("comparte una clave global entre Matemática y Álgebra sin duplicar el tema", async () => {
    const matematica = await a.db.cursoColegio.create({
      data: { tenantId: a.tenant.id, nombre: "Matemática", cursoKhipu: "matematica" },
    });
    const algebra = await b.db.cursoColegio.create({
      data: { tenantId: b.tenant.id, nombre: "Álgebra", cursoKhipu: "algebra" },
    });
    await a.db.cursoColegioGrado.create({
      data: { tenantId: a.tenant.id, cursoColegioId: matematica.id, anio: 2026, nivel: "primaria", grado: 3 },
    });
    await b.db.cursoColegioGrado.create({
      data: { tenantId: b.tenant.id, cursoColegioId: algebra.id, anio: 2026, nivel: "primaria", grado: 3 },
    });
    await a.db.curso.update({ where: { id: a.cursoTutora.id }, data: { cursoColegioId: matematica.id } });
    await b.db.curso.update({ where: { id: b.cursoTutora.id }, data: { cursoColegioId: algebra.id } });

    const tema = await db.temaCurricular.findUniqueOrThrow({ where: { clave } });
    expect(tema.clave).toBe(clave);
    expect(await db.temaCurricular.count({ where: { clave } })).toBe(1);
    expect((await a.db.curso.findUniqueOrThrow({ where: { id: a.cursoTutora.id } })).cursoColegioId).toBe(matematica.id);
    expect((await b.db.curso.findUniqueOrThrow({ where: { id: b.cursoTutora.id } })).cursoColegioId).toBe(algebra.id);
    expect(temaVisibleParaAlumno(tema.estado)).toBe(false);
    expect(temaVisibleParaAlumno("revisado")).toBe(true);
  });

  it("aísla la oferta por colegio y rechaza referencias cruzadas", async () => {
    const cursoB = await b.db.cursoColegio.findFirstOrThrow({ where: { cursoKhipu: "algebra" } });
    expect(await a.db.cursoColegio.findUnique({ where: { id: cursoB.id } })).toBeNull();
    expect(await a.db.cursoColegioGrado.count()).toBe(1);
    await expect(
      a.db.curso.update({ where: { id: a.cursoTutora.id }, data: { cursoColegioId: cursoB.id } }),
    ).rejects.toThrow();
    await expect(
      a.db.cursoColegioGrado.create({
        data: { tenantId: a.tenant.id, cursoColegioId: cursoB.id, anio: 2026, nivel: "primaria", grado: 3 },
      }),
    ).rejects.toThrow();
  });
});
