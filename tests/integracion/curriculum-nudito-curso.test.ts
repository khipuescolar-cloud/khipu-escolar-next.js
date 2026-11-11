import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";
import { agrupar } from "@/lib/server/plan-anual/acceso";
import { catalogoDelCurso } from "@/lib/server/plan-anual/catalogo-curso";
import { crearTemario, agregarTemasTemario, aceptarTemario } from "@/lib/server/plan-anual/temario";
import { cursosNuditoDelAlumno } from "@/lib/server/nudito/areas-cursos";
import { temasPublicadosDelAlumno } from "@/lib/server/nudito/plan-publicado";

vi.stubEnv("KHIPU_TEST_NUDITO_PLUS", "1");
let colegio: ColegioPrueba;
let planId: string;
let clavesQuimica: string[];
beforeAll(async () => {
  colegio = await crearColegioPrueba({ plan: "pro", prefijo: "curr-nudito-curso" });
  await colegio.db.salon.update({ where: { id: colegio.salon.id }, data: { grado: 5 } });
  const quimica = await colegio.db.cursoColegio.create({ data: { tenantId: colegio.tenant.id, nombre: "Química", cursoKhipu: "quimica" } });
  const cyt = await colegio.db.cursoColegio.create({ data: { tenantId: colegio.tenant.id, nombre: "Ciencia y Tecnología", cursoKhipu: "ciencia-tecnologia" } });
  await colegio.db.cursoColegioGrado.createMany({ data: [quimica, cyt].map(c => ({ tenantId: colegio.tenant.id, cursoColegioId: c.id, anio: 2026, nivel: "primaria", grado: 5 })) });
  await colegio.db.curso.update({ where: { id: colegio.cursoTutora.id }, data: { nombre: "Química", areaCneb: "ciencia-tecnologia", cursoColegioId: quimica.id } });
  const cursoArea = await colegio.db.curso.create({ data: { tenantId: colegio.tenant.id, salonId: colegio.salon.id, nombre: "Ciencia y Tecnología", areaCneb: "ciencia-tecnologia", profesorId: colegio.miembros.otroProfesor.membership.id, cursoColegioId: cyt.id } });
  expect(cursoArea.id).toBeTruthy();
  const grupo = { anio: 2026, nivel: "primaria" as const, grado: 5, area: "quimica", nombreCurso: "Química" };
  planId = (await crearTemario(colegio.ctxDe("tutora"), grupo)).id;
  clavesQuimica = (await catalogoDelCurso(colegio.db, grupo)).map(t => t.clave);
}, 30000);
afterAll(async () => { await colegio?.limpiar(); }, 30000);

describe("Nudito separa cursos Khipu y prepara práctica", () => {
  it("agrupa Química aparte y excluye su disciplina del área", async () => {
    const grupos = agrupar([
      { nombre: "Química", cursoColegio: { cursoKhipu: "quimica" }, salon: { anio: 2026, nivel: "primaria", grado: 5 } },
      { nombre: "Ciencia y Tecnología", cursoColegio: { cursoKhipu: "ciencia-tecnologia" }, salon: { anio: 2026, nivel: "primaria", grado: 5 } },
    ]);
    expect(grupos.map(g => g.area)).toEqual(["ciencia-tecnologia", "quimica"]);
    const cyt = await catalogoDelCurso(colegio.db, { anio: 2026, nivel: "primaria", grado: 5, area: "ciencia-tecnologia" });
    const quimica = await catalogoDelCurso(colegio.db, { anio: 2026, nivel: "primaria", grado: 5, area: "quimica" });
    expect(quimica.length).toBeGreaterThan(0);
    expect(cyt.some(t => quimica.some(q => q.clave === t.clave))).toBe(false);
  });

  it("muestra los dos cursos y respeta el orden del temario publicado", async () => {
    expect((await cursosNuditoDelAlumno(colegio.db, colegio.alumnos.mateo.id, ["ciencia-tecnologia"])).map(c => c.nombre)).toEqual(["Ciencia y Tecnología", "Química"]);
    const elegidos = clavesQuimica.slice(0, 2);
    await agregarTemasTemario(colegio.ctxDe("tutora"), planId, elegidos);
    await aceptarTemario(colegio.ctxDe("tutora"), planId);
    const visibles = await temasPublicadosDelAlumno(colegio.ctxDe("direccion"), { alumno: colegio.alumnos.mateo, modo: "alumno" }, colegio.cursoTutora.id);
    expect(visibles.map(t => t.clave)).toEqual(elegidos);
  });
});
