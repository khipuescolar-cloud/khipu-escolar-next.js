// Capacidades y desempeños del CNEB (specs/30). Crea dos colegios de prueba aislados y los borra al terminar.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import {
  crearCapacidad, crearDesempeno, editarCapacidad, eliminarDesempeno, estructuraCurso, fijarGradoSalon, importarCneb, moverCapacidad,
} from "@/lib/server/cneb";
import { datosLibreta } from "@/lib/server/libreta";
import { calificacionesPeriodo, crearEvaluacion, editarEvaluacion } from "@/lib/server/notas";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let a: ColegioPrueba;
let b: ColegioPrueba;
let periodoId: string;

beforeAll(async () => {
  [a, b] = await Promise.all([crearColegioPrueba({ plan: "pro", prefijo: "test-cneb" }), crearColegioPrueba({ plan: "pro", prefijo: "test-cneb" })]);
  periodoId = (await db.periodo.create({
    data: { tenantId: a.tenant.id, anio: 2026, tipo: "bimestre", numero: 4, nombre: "IV Bimestre", inicio: new Date("2026-10-01"), fin: new Date("2026-12-18") },
  })).id;
});

afterAll(async () => {
  await a?.limpiar();
  await b?.limpiar();
});

const ok = (r: { ok: boolean; mensaje?: string; error?: string }) => expect(r, (r as { error?: string }).error).toMatchObject({ ok: true });

describe("grado del salón", () => {
  it("sin grado no se importa; solo dirección lo fija y con un grado válido", async () => {
    const r = await importarCneb(a.ctxDe("direccion"), a.cursoTutora.id);
    expect(r).toEqual({ ok: false, error: expect.stringContaining("grado del salón") });
    expect((await estructuraCurso(a.ctxDe("tutora"), a.cursoTutora.id)).salon.grado).toBeNull();

    await esperarProhibido(fijarGradoSalon(a.ctxDe("tutora"), { salonId: a.salon.id, grado: 3 }));
    expect(await fijarGradoSalon(a.ctxDe("direccion"), { salonId: a.salon.id, grado: 9 })).toMatchObject({ ok: false });
    ok(await fijarGradoSalon(a.ctxDe("direccion"), { salonId: a.salon.id, grado: 3 }));
    // Otro colegio no puede tocar el salón.
    expect(await fijarGradoSalon(b.ctxDe("direccion"), { salonId: a.salon.id, grado: 4 })).toMatchObject({ ok: false });
    expect((await db.salon.findUniqueOrThrow({ where: { id: a.salon.id } })).grado).toBe(3);
  });
});

describe("importar desde el CNEB", () => {
  it("solo dirección importa, crea la estructura del grado y es idempotente", async () => {
    await esperarProhibido(importarCneb(a.ctxDe("tutora"), a.cursoTutora.id));
    const r = await importarCneb(a.ctxDe("direccion"), a.cursoTutora.id);
    ok(r);
    expect(r.ok && r.mensaje).toMatch(/^Importamos 4 competencias, 16 capacidades y \d+ desempeños del CNEB\.$/);

    const contar = async () => ({
      competencias: await db.competencia.count({ where: { cursoId: a.cursoTutora.id } }),
      capacidades: await db.capacidad.count({ where: { competencia: { cursoId: a.cursoTutora.id } } }),
      desempenos: await db.desempeno.count({ where: { competencia: { cursoId: a.cursoTutora.id } } }),
    });
    const antes = await contar();
    expect(antes.competencias).toBe(4);
    const otra = await importarCneb(a.ctxDe("direccion"), a.cursoTutora.id);
    expect(otra).toEqual({ ok: true, mensaje: "Ya estaba todo importado. No se agregó nada." });
    expect(await contar()).toEqual(antes);

    const e = await estructuraCurso(a.ctxDe("tutora"), a.cursoTutora.id);
    expect(e.textoGrado).toBe("3.° de primaria");
    expect(e.puedeEditar).toBe(false);
    expect(e.competencias[0].nombre).toBe("Resuelve problemas de cantidad");
    expect(e.competencias[0].desempenos.every((d) => d.codigo?.startsWith("MAT-C1-P3-"))).toBe(true);
    expect(e.competencias[0].desempenos[0].capacidadId).toBe(e.competencias[0].capacidades[0].id);
  });

  it("un curso sin área reconocible pide elegir el área", async () => {
    await fijarGradoSalon(a.ctxDe("direccion"), { salonId: a.otroSalon.id, grado: 5 });
    expect(await importarCneb(a.ctxDe("direccion"), a.cursoAjeno.id)).toEqual({ ok: false, error: "Elige el área del CNEB que corresponde a este curso." });
    ok(await importarCneb(a.ctxDe("direccion"), a.cursoAjeno.id, "comunicacion"));
  });
});

describe("aislamiento por colegio y permisos", () => {
  it("otro colegio no ve ni cambia la estructura", async () => {
    const comp = await db.competencia.findFirstOrThrow({ where: { cursoId: a.cursoTutora.id }, include: { capacidades: true, desempenos: true } });
    await esperarProhibido(estructuraCurso(b.ctxDe("direccion"), a.cursoTutora.id));
    await esperarProhibido(importarCneb(b.ctxDe("direccion"), a.cursoTutora.id));
    expect(await crearCapacidad(b.ctxDe("direccion"), { competenciaId: comp.id, nombre: "Intrusa" })).toMatchObject({ ok: false });
    expect(await editarCapacidad(b.ctxDe("direccion"), comp.capacidades[0].id, { nombre: "Cambiada" })).toMatchObject({ ok: false });
    expect(await eliminarDesempeno(b.ctxDe("direccion"), comp.desempenos[0].id)).toMatchObject({ ok: false });
    expect(await db.desempeno.count({ where: { id: comp.desempenos[0].id } })).toBe(1);
    expect((await db.capacidad.findUniqueOrThrow({ where: { id: comp.capacidades[0].id } })).nombre).not.toBe("Cambiada");
  });

  it("el profesor no edita capacidades ni desempeños; dirección sí, y reordena", async () => {
    const comp = await db.competencia.findFirstOrThrow({ where: { cursoId: a.cursoTutora.id }, include: { capacidades: { orderBy: { orden: "asc" } } } });
    await esperarProhibido(crearCapacidad(a.ctxDe("tutora"), { competenciaId: comp.id, nombre: "Nueva capacidad" }));
    await esperarProhibido(crearDesempeno(a.ctxDe("tutora"), { competenciaId: comp.id, descripcion: "Un desempeño propio del colegio." }));
    expect(await crearDesempeno(a.ctxDe("direccion"), { competenciaId: comp.id, descripcion: "corto" })).toMatchObject({ ok: false });
    ok(await crearDesempeno(a.ctxDe("direccion"), { competenciaId: comp.id, capacidadId: comp.capacidades[1].id, descripcion: "Resuelve problemas de la tienda escolar con monedas y billetes.", codigo: "NH-01" }));
    const creado = await db.desempeno.findFirstOrThrow({ where: { codigo: "NH-01", tenantId: a.tenant.id } });
    expect(creado).toMatchObject({ nivel: "primaria", grado: 3, capacidadId: comp.capacidades[1].id });

    ok(await moverCapacidad(a.ctxDe("direccion"), comp.capacidades[1].id, "arriba"));
    const orden = await db.capacidad.findMany({ where: { competenciaId: comp.id }, orderBy: { orden: "asc" }, select: { id: true } });
    expect(orden[0].id).toBe(comp.capacidades[1].id);
  });
});

describe("evaluaciones con desempeños", () => {
  it("el profesor del curso marca desempeños válidos; nadie más ni desempeños ajenos", async () => {
    const [cantidad, regularidad] = await db.competencia.findMany({
      where: { cursoId: a.cursoTutora.id }, orderBy: { orden: "asc" }, include: { desempenos: { where: { grado: 3 }, orderBy: { orden: "asc" } } },
    });
    const base = { cursoId: a.cursoTutora.id, periodoId, competenciaId: cantidad.id, fecha: "2026-10-20", peso: "1" };
    const dos = cantidad.desempenos.slice(0, 2).map((d) => d.id);

    await esperarProhibido(crearEvaluacion(a.ctxDe("otroProfesor"), { ...base, titulo: "Ajena", desempenoIds: dos }));
    await esperarProhibido(crearEvaluacion(a.ctxDe("direccion"), { ...base, titulo: "Dirección", desempenoIds: dos }));
    expect(await crearEvaluacion(a.ctxDe("tutora"), { ...base, titulo: "Mezcla", desempenoIds: [regularidad.desempenos[0].id] }))
      .toEqual({ ok: false, error: "Algún desempeño no es de esta competencia o del grado del salón." });
    expect(await crearEvaluacion(a.ctxDe("tutora"), { ...base, competenciaId: "", titulo: "Sin competencia", desempenoIds: dos }))
      .toEqual({ ok: false, error: "Elige la competencia antes de marcar desempeños." });
    // Un desempeño de otro colegio no se puede vincular.
    await fijarGradoSalon(b.ctxDe("direccion"), { salonId: b.salon.id, grado: 3 });
    ok(await importarCneb(b.ctxDe("direccion"), b.cursoTutora.id));
    const ajeno = await db.desempeno.findFirstOrThrow({ where: { tenantId: b.tenant.id } });
    expect(await crearEvaluacion(a.ctxDe("tutora"), { ...base, titulo: "Con ajeno", desempenoIds: [ajeno.id] })).toMatchObject({ ok: false });

    ok(await crearEvaluacion(a.ctxDe("tutora"), { ...base, titulo: "Práctica de fracciones", desempenoIds: dos }));
    const ev = await db.evaluacion.findFirstOrThrow({ where: { tenantId: a.tenant.id, titulo: "Práctica de fracciones" }, include: { desempenos: true } });
    expect(ev.desempenos.map((d) => d.desempenoId).sort()).toEqual([...dos].sort());

    // Editar sin enviar desempeños los conserva; con lista vacía los quita.
    ok(await editarEvaluacion(a.ctxDe("tutora"), ev.id, { competenciaId: cantidad.id, titulo: "Práctica de fracciones", fecha: "2026-10-21", peso: "1" }));
    expect(await db.evaluacionDesempeno.count({ where: { evaluacionId: ev.id } })).toBe(2);

    // Nota del alumno → desempeños evaluados en la calificación del periodo y en la libreta.
    await db.nota.create({ data: { tenantId: a.tenant.id, evaluacionId: ev.id, alumnoId: a.alumnos.mateo.id, valorLiteral: "A", registradoPorId: a.miembros.tutora.membership.id } });
    const cal = await calificacionesPeriodo(a.ctxDe("tutora"), a.cursoTutora.id, periodoId);
    const fila = cal.filas.find((f) => f.competencia.id === cantidad.id)!;
    expect(fila.alumnos.find((x) => x.alumno.id === a.alumnos.mateo.id)!.desempenos.map((d) => d.id)).toEqual(dos);
    expect(fila.alumnos.find((x) => x.alumno.id === a.alumnos.valentina.id)!.desempenos).toEqual([]);

    const libreta = await datosLibreta(a.ctxDe("direccion"), a.alumnos.mateo.id, periodoId);
    const comp = libreta.cursos.find((c) => c.nombre === "Matemática")!.competencias.find((c) => c.nombre === cantidad.nombre)!;
    expect(comp.capacidades).toContain("Traduce cantidades a expresiones numéricas");
    expect(comp.desempenosEvaluados).toHaveLength(2);

    ok(await editarEvaluacion(a.ctxDe("tutora"), ev.id, { competenciaId: cantidad.id, titulo: "Práctica de fracciones", fecha: "2026-10-21", peso: "1", desempenoIds: [] }));
    expect(await db.evaluacionDesempeno.count({ where: { evaluacionId: ev.id } })).toBe(0);
  });
});
