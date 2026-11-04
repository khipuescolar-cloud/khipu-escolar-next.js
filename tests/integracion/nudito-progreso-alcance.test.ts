// Alcance del progreso de Nudito (specs/44). Requiere la BD local; crea colegios `test-nudito-prog-*` y los borra.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Curso, Membership, Profile } from "@/generated/prisma/client";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { db, dbTenant } from "@/lib/server/db";
import { progresoDeAlumno, progresoDeCurso } from "@/lib/server/nudito/progreso";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let otro: ColegioPrueba;
let cursoCiencia: Curso;
let cuentaMateo: { user: Profile; membership: Membership };

const esperarNoEncontrado = (p: Promise<unknown>) => expect(p).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? e).includes("404"));
const areas = (r: Awaited<ReturnType<typeof progresoDeAlumno>>) => r.porArea.map((a) => a.area).sort();

function ctxMateo(): TenantContext {
  return { tenant: c.tenant, user: cuentaMateo.user, membership: cuentaMateo.membership, rol: "alumno", roles: ["alumno"], db: dbTenant(c.tenant.id), ...accesoModulosDeCodigo("pro") };
}

async function dominio(alumnoId: string, temaClave: string, area: string, estado: "dominado" | "reforzar" | "en_progreso") {
  await db.nuditoDominio.create({
    data: { tenantId: c.tenant.id, alumnoId, temaClave, area, gradoTema: 3, estado, dificultad: 3, intentos: 6, aciertos: 4, aciertosSinPista: 3, politicaVersion: "v1", motivo: "Subió la dificultad tras 3 aciertos seguidos" },
  });
}

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-nudito-prog" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-nudito-prog" });
  await db.curso.update({ where: { id: c.cursoTutora.id }, data: { areaCneb: "matematica" } });
  await db.curso.update({ where: { id: c.cursoAjeno.id }, data: { areaCneb: "ciencia-tecnologia" } });
  // Pedro (otroProfesor) dicta Ciencia y Tecnología también en 3.° B, donde Lucía es tutora.
  cursoCiencia = await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Ciencia y Tecnología", profesorId: c.miembros.otroProfesor.membership.id, areaCneb: "ciencia-tecnologia" } });
  const id = randomUUID();
  const user = await db.profile.create({ data: { id, email: `mateo-${id.slice(0, 8)}@test-nudito.local`, nombres: "Mateo", apellidos: "Quispe" } });
  const membership = await db.membership.create({ data: { tenantId: c.tenant.id, userId: id, rol: "alumno" } });
  await db.alumno.update({ where: { id: c.alumnos.mateo.id }, data: { cuentaId: membership.id } });
  cuentaMateo = { user, membership };
  await dominio(c.alumnos.mateo.id, "mat.p3.fracciones", "matematica", "dominado");
  await dominio(c.alumnos.mateo.id, "mat.p3.restas", "matematica", "reforzar");
  await dominio(c.alumnos.mateo.id, "cyt.p3.plantas", "ciencia-tecnologia", "en_progreso");
  await dominio(c.alumnos.valentina.id, "mat.p3.restas", "matematica", "reforzar");
  await dominio(c.alumnos.thiago.id, "cyt.p5.energia", "ciencia-tecnologia", "dominado");
});

afterAll(async () => {
  await c.limpiar();
  await otro.limpiar();
  await db.profile.deleteMany({ where: { id: cuentaMateo.user.id } });
  await db.$disconnect();
});

describe("progreso de un alumno", () => {
  it("alumno: el suyo (todas las áreas); nunca el de otro", async () => {
    expect(areas(await progresoDeAlumno(ctxMateo(), { alumnoId: c.alumnos.mateo.id }))).toEqual(["ciencia-tecnologia", "matematica"]);
    await esperarProhibido(progresoDeAlumno(ctxMateo(), { alumnoId: c.alumnos.valentina.id }));
  });

  it("apoderado: sus hijos; no otros alumnos", async () => {
    const r = await progresoDeAlumno(c.ctxDe("madre"), { alumnoId: c.alumnos.mateo.id });
    expect(areas(r)).toEqual(["ciencia-tecnologia", "matematica"]);
    const mat = r.porArea.find((a) => a.area === "matematica")!;
    expect(mat.temas.map((t) => [t.clave, t.estado])).toEqual([["mat.p3.fracciones", "dominado"], ["mat.p3.restas", "reforzar"]]);
    expect(mat.temas[0].motivo).toContain("dificultad");
    await esperarProhibido(progresoDeAlumno(c.ctxDe("madre"), { alumnoId: c.alumnos.thiago.id }));
  });

  it("profesor: solo el área del curso que dicta; el tutor, todas las áreas de su salón", async () => {
    expect(areas(await progresoDeAlumno(c.ctxDe("otroProfesor"), { alumnoId: c.alumnos.mateo.id }))).toEqual(["ciencia-tecnologia"]);
    await esperarProhibido(progresoDeAlumno(c.ctxDe("otroProfesor"), { alumnoId: c.alumnos.mateo.id, area: "matematica" }));
    expect(areas(await progresoDeAlumno(c.ctxDe("tutora"), { alumnoId: c.alumnos.mateo.id }))).toEqual(["ciencia-tecnologia", "matematica"]);
    // Pedro es tutor de 5.° A: ve todas las áreas de Thiago; Lucía no dicta en 5.° A.
    expect(areas(await progresoDeAlumno(c.ctxDe("otroProfesor"), { alumnoId: c.alumnos.thiago.id }))).toEqual(["ciencia-tecnologia"]);
    await esperarProhibido(progresoDeAlumno(c.ctxDe("tutora"), { alumnoId: c.alumnos.thiago.id }));
  });

  it("dirección: todo el colegio; portería no", async () => {
    expect(areas(await progresoDeAlumno(c.ctxDe("direccion"), { alumnoId: c.alumnos.mateo.id }))).toEqual(["ciencia-tecnologia", "matematica"]);
    await esperarProhibido(progresoDeAlumno(c.ctxDe("porteria"), { alumnoId: c.alumnos.mateo.id }));
  });

  it("otro colegio: el alumno no existe para él (404)", async () => {
    await esperarNoEncontrado(progresoDeAlumno(otro.ctxDe("direccion"), { alumnoId: c.alumnos.mateo.id }));
  });

  it("nunca devuelve evidencia cruda ni textos de conversación", async () => {
    const json = JSON.stringify(await progresoDeAlumno(c.ctxDe("direccion"), { alumnoId: c.alumnos.mateo.id }));
    expect(json).not.toMatch(/evidencia|respuesta|cuerpo/);
  });
});

describe("progreso de un curso", () => {
  it("tutor y dirección ven el agregado por alumno y los temas difíciles del área del curso", async () => {
    const r = await progresoDeCurso(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id });
    const mateo = r.alumnos.find((a) => a.alumnoId === c.alumnos.mateo.id)!;
    expect(mateo).toMatchObject({ dominados: 1, reforzar: 1, enProgreso: 0 });
    expect(mateo.ultimaActividad).not.toBeNull();
    expect(r.temasDificiles).toEqual([{ clave: "mat.p3.restas", nombre: "mat.p3.restas", alumnos: 2 }]);
    expect(await progresoDeCurso(c.ctxDe("direccion"), { cursoId: c.cursoTutora.id })).toEqual(r);
    // El tutor también ve el curso de Ciencia de su salón; ahí solo cuenta esa área.
    const ciencia = await progresoDeCurso(c.ctxDe("tutora"), { cursoId: cursoCiencia.id });
    expect(ciencia.alumnos.find((a) => a.alumnoId === c.alumnos.mateo.id)).toMatchObject({ dominados: 0, reforzar: 0, enProgreso: 1 });
  });

  it("profesor sin ese curso, familias y otro colegio → 403/404", async () => {
    await esperarProhibido(progresoDeCurso(c.ctxDe("otroProfesor"), { cursoId: c.cursoTutora.id }));
    await esperarProhibido(progresoDeCurso(c.ctxDe("madre"), { cursoId: c.cursoTutora.id }));
    await esperarProhibido(progresoDeCurso(ctxMateo(), { cursoId: c.cursoTutora.id }));
    await esperarNoEncontrado(progresoDeCurso(otro.ctxDe("direccion"), { cursoId: c.cursoTutora.id }));
  });
});
