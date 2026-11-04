// Requiere la BD local. Área CNEB de los cursos para Nudito (specs/42): relleno, manual, cursos del alumno, aislamiento.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { crearCurso, editarCurso } from "@/lib/server/gestion";
import { areaDeCurso, cursosNuditoDeAlumno, cursosNuditoDelAlumno, fijarAreaCurso, rellenarAreasCursos } from "@/lib/server/nudito/areas-cursos";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let otro: ColegioPrueba;

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-nudito-areas" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-nudito-areas-otro" });
  // El ayudante llama «Ciencia» al curso del 5.° A: ese nombre suelto no es sinónimo del CNEB.
  await db.curso.update({ where: { id: c.cursoAjeno.id }, data: { nombre: "Ciencia y Tecnología" } });
}, 30_000);

afterAll(async () => {
  await c?.limpiar();
  await otro?.limpiar();
}, 30_000);

describe("área CNEB de los cursos", () => {
  it("areaDeCurso detecta por nombre y nivel", () => {
    expect(areaDeCurso("Matemática", "primaria")).toBe("matematica");
    expect(areaDeCurso("Comunicación Integral", "primaria")).toBe("comunicacion");
    expect(areaDeCurso("Ciencia y Tecnología", "secundaria")).toBe("ciencia-tecnologia");
    expect(areaDeCurso("Taller de ajedrez", "primaria")).toBeNull();
  });

  it("rellena las áreas que faltan (idempotente) y no pisa las fijadas a mano", async () => {
    // Los cursos del colegio de prueba se crean directo en la BD (sin área).
    const manual = await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Comunicación", areaCneb: "arte-cultura", areaCnebManual: true } });
    const r = await rellenarAreasCursos(c.tenant.id);
    expect(r.actualizados).toBeGreaterThanOrEqual(2); // Matemática y Ciencia
    expect((await db.curso.findUniqueOrThrow({ where: { id: c.cursoTutora.id } })).areaCneb).toBe("matematica");
    expect((await db.curso.findUniqueOrThrow({ where: { id: c.cursoAjeno.id } })).areaCneb).toBe("ciencia-tecnologia");
    expect((await db.curso.findUniqueOrThrow({ where: { id: manual.id } })).areaCneb).toBe("arte-cultura");
    expect(await rellenarAreasCursos(c.tenant.id)).toEqual({ revisados: 0, actualizados: 0 });
    // El otro colegio no se tocó.
    expect((await db.curso.findUniqueOrThrow({ where: { id: otro.cursoTutora.id } })).areaCneb).toBeNull();
    await db.curso.delete({ where: { id: manual.id } });
  });

  it("crear y renombrar un curso calcula el área, salvo que sea manual", async () => {
    const ctx = c.ctxDe("direccion");
    const id = await crearCurso(ctx, { salonId: c.salon.id, nombre: "Ciencia y Ambiente", profesorId: null });
    expect((await db.curso.findUniqueOrThrow({ where: { id } })).areaCneb).toBe("ciencia-tecnologia");
    await editarCurso(ctx, id, { nombre: "Comunicación", profesorId: null });
    expect((await db.curso.findUniqueOrThrow({ where: { id } })).areaCneb).toBe("comunicacion");
    await fijarAreaCurso(ctx, { cursoId: id, area: "ingles" });
    await editarCurso(ctx, id, { nombre: "Matemática II", profesorId: null });
    expect(await db.curso.findUniqueOrThrow({ where: { id } })).toMatchObject({ areaCneb: "ingles", areaCnebManual: true });
    // null vuelve al cálculo automático.
    await fijarAreaCurso(ctx, { cursoId: id, area: null });
    expect(await db.curso.findUniqueOrThrow({ where: { id } })).toMatchObject({ areaCneb: "matematica", areaCnebManual: false });
    const auditorias = await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "curso", entidadId: id, accion: "editar" } });
    expect(auditorias).toBeGreaterThanOrEqual(4);
    await expect(fijarAreaCurso(ctx, { cursoId: id, area: "astrologia" })).rejects.toThrow(/no existe/);
    await esperarProhibido(fijarAreaCurso(c.ctxDe("tutora"), { cursoId: id, area: "matematica" }));
    await db.curso.delete({ where: { id } });
  });

  it("cursos de Nudito del alumno: solo su salón, una entrada por área", async () => {
    await rellenarAreasCursos(c.tenant.id);
    const extra = await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Razonamiento matemático", areaCneb: "matematica" } });
    const com = await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Comunicación", areaCneb: "comunicacion" } });
    const arte = await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Arte", areaCneb: "arte-cultura" } });
    const cursos = await cursosNuditoDelAlumno(c.db, c.alumnos.mateo.id, ["matematica", "comunicacion", "ciencia-tecnologia"]);
    expect(cursos).toEqual([
      { cursoId: c.cursoTutora.id, nombre: "Matemática", area: "matematica" },
      { cursoId: com.id, nombre: "Comunicación", area: "comunicacion" },
    ]);
    // La Ciencia del 5.° A (otro salón) no aparece; con áreas limitadas, solo esas.
    expect(await cursosNuditoDelAlumno(c.db, c.alumnos.mateo.id, ["comunicacion"])).toHaveLength(1);
    expect((await cursosNuditoDelAlumno(c.db, c.alumnos.thiago.id, ["ciencia-tecnologia"]))[0].cursoId).toBe(c.cursoAjeno.id);
    // La madre de Mateo lo ve; no ve a Thiago.
    expect(await cursosNuditoDeAlumno(c.ctxDe("madre"), c.alumnos.mateo.id)).toHaveLength(2);
    await esperarProhibido(cursosNuditoDeAlumno(c.ctxDe("madre"), c.alumnos.thiago.id));
    await db.curso.deleteMany({ where: { id: { in: [extra.id, com.id, arte.id] } } });
  });

  it("otro colegio no ve nada del alumno", async () => {
    expect(await cursosNuditoDelAlumno(otro.db, c.alumnos.mateo.id, ["matematica"])).toEqual([]);
    await expect(fijarAreaCurso(otro.ctxDe("direccion"), { cursoId: c.cursoTutora.id, area: "ingles" })).rejects.toThrow(/No se encontró/);
    expect((await db.curso.findUniqueOrThrow({ where: { id: c.cursoTutora.id } })).areaCneb).toBe("matematica");
  });
});
