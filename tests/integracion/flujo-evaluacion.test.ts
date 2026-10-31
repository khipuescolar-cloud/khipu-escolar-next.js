// Flujo de evaluación (specs/11): una prueba que mide varias competencias, instrumento, calificación sugerida por promedio
// e informe de progreso a mitad del periodo que la familia ve cuando el profesor lo comparte. Requiere la BD local.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import {
  calificacionesPeriodo, compartirInformeProgreso, crearEvaluacion, exportarNotasCurso, grillaNotas, guardarInformeProgreso, guardarNota,
  informesProgreso, notasDeAlumno,
} from "@/lib/server/notas";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let periodoId: string;
let lee: { id: string };
let escribe: { id: string };

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-flujo-evaluacion" });
  const p = await c.db.periodo.create({
    data: { tenantId: c.tenant.id, anio: 2027, tipo: "trimestre", numero: 1, nombre: "I Trimestre", inicio: new Date("2027-03-08"), fin: new Date("2027-06-11") },
  });
  periodoId = p.id;
  lee = await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Lee diversos tipos de textos", orden: 1 } });
  escribe = await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Escribe diversos tipos de textos", orden: 2 } });
}, 30_000);
afterAll(async () => {
  await c?.limpiar();
}, 30_000);

describe("flujo de evaluación", () => {
  it("una prueba escrita de dos competencias crea una columna por competencia con su instrumento", async () => {
    const ctx = c.ctxDe("tutora");
    const r = await crearEvaluacion(ctx, {
      cursoId: c.cursoTutora.id, periodoId, competenciaIds: [lee.id, escribe.id], titulo: "Prueba escrita 1",
      fecha: "2027-04-10", peso: "1", instrumento: "prueba_escrita",
    });
    expect(r).toEqual({ ok: true, mensaje: "Evaluación creada: una columna por cada una de sus 2 competencias." });
    const g = await grillaNotas(ctx, c.cursoTutora.id, periodoId);
    expect(g.evaluaciones.map((e) => [e.competenciaId, e.instrumento, e.columna]).sort()).toEqual([
      [escribe.id, "prueba_escrita", "Prueba escrita 1 · Escribe diversos tipos de textos"],
      [lee.id, "prueba_escrita", "Prueba escrita 1 · Lee diversos tipos de textos"],
    ].sort());
    // El CSV usa los nombres únicos de columna.
    const { csv } = await exportarNotasCurso(ctx, c.cursoTutora.id, periodoId);
    expect(csv).toContain("Prueba escrita 1 · Lee diversos tipos de textos");
  });

  it("la calificación sugerida es el promedio (A y B → A) por defecto", async () => {
    const ctx = c.ctxDe("tutora");
    const ok = (r: unknown) => expect(r).toMatchObject({ ok: true });
    ok(await crearEvaluacion(ctx, { cursoId: c.cursoTutora.id, periodoId, competenciaIds: [lee.id], titulo: "Lista de cotejo", fecha: "2027-04-20", peso: "1", instrumento: "lista_cotejo" }));
    const g = await grillaNotas(ctx, c.cursoTutora.id, periodoId);
    const deLee = g.evaluaciones.filter((e) => e.competenciaId === lee.id);
    ok(await guardarNota(ctx, { evaluacionId: deLee[0].id, alumnoId: c.alumnos.mateo.id, valor: "A" }));
    ok(await guardarNota(ctx, { evaluacionId: deLee[1].id, alumnoId: c.alumnos.mateo.id, valor: "B" }));
    const cal = await calificacionesPeriodo(ctx, c.cursoTutora.id, periodoId);
    expect(cal.calculo).toBe("promedio");
    const mateo = cal.filas.find((f) => f.competencia.id === lee.id)!.alumnos.find((a) => a.alumno.id === c.alumnos.mateo.id)!;
    expect(mateo.sugerido).toEqual({ valorLiteral: "A", valorNumerico: null });

    await db.tenant.update({ where: { id: c.tenant.id }, data: { calculoLiteral: "frecuente" } });
    const ctxFrecuente = { ...ctx, tenant: { ...ctx.tenant, calculoLiteral: "frecuente" as const } };
    const fr = await calificacionesPeriodo(ctxFrecuente, c.cursoTutora.id, periodoId);
    expect(fr.filas.find((f) => f.competencia.id === lee.id)!.alumnos.find((a) => a.alumno.id === c.alumnos.mateo.id)!.sugerido)
      .toEqual({ valorLiteral: "B", valorNumerico: null }); // empate: la más reciente
  });

  it("el informe de progreso solo lo escribe el profesor y la familia lo ve recién al compartirlo", async () => {
    const tutora = c.ctxDe("tutora");
    const entrada = {
      alumnoId: c.alumnos.mateo.id, competenciaId: lee.id, periodoId,
      logros: "Identifica la idea principal.", mejorar: "Hacer inferencias.", recomendaciones: "Leer 15 minutos diarios.",
    };
    await esperarProhibido(guardarInformeProgreso(c.ctxDe("otroProfesor"), entrada));
    await esperarProhibido(guardarInformeProgreso(c.ctxDe("direccion"), entrada));
    expect(await compartirInformeProgreso(tutora, c.cursoTutora.id, periodoId)).toEqual({ ok: false, error: "Escribe al menos un informe antes de compartirlo con las familias." });
    expect(await guardarInformeProgreso(tutora, { ...entrada, logros: "x".repeat(601) })).toMatchObject({ ok: false });
    expect(await guardarInformeProgreso(tutora, entrada)).toEqual({ ok: true, mensaje: "Informe guardado." });

    const madre = c.ctxDe("madre");
    const antes = await notasDeAlumno(madre, c.alumnos.mateo.id, periodoId);
    expect(antes.cursos.flatMap((x) => x.competencias).every((x) => x.informe === null)).toBe(true);

    const r = await compartirInformeProgreso(tutora, c.cursoTutora.id, periodoId);
    expect(r).toMatchObject({ ok: true, mensaje: expect.stringContaining("Informe compartido.") });
    expect(await compartirInformeProgreso(tutora, c.cursoTutora.id, periodoId)).toEqual({ ok: false, error: "Este informe ya se compartió. Usa «Reenviar aviso» si quieres avisar otra vez." });
    expect(await compartirInformeProgreso(tutora, c.cursoTutora.id, periodoId, { reenviar: true })).toMatchObject({ ok: true, mensaje: expect.stringContaining("Aviso reenviado.") });
    const avisos = await db.aviso.findMany({ where: { tenantId: c.tenant.id, plantilla: "informe_progreso" } });
    expect(avisos.length).toBeGreaterThan(0);
    expect(avisos.every((a) => a.apoderadoId === c.miembros.madre.membership.id)).toBe(true);

    const despues = await notasDeAlumno(madre, c.alumnos.mateo.id, periodoId);
    const informe = despues.cursos.flatMap((x) => x.competencias).find((x) => x.id === lee.id)!.informe;
    expect(informe).toEqual({ logros: "Identifica la idea principal.", mejorar: "Hacer inferencias.", recomendaciones: "Leer 15 minutos diarios." });

    const vista = await informesProgreso(tutora, c.cursoTutora.id, periodoId);
    expect(vista.escritos).toBe(1);
    expect(vista.envio).not.toBeNull();

    // Las tres partes vacías borran el informe.
    expect(await guardarInformeProgreso(tutora, { ...entrada, logros: "", mejorar: "", recomendaciones: "" })).toEqual({ ok: true, mensaje: "Informe borrado." });
  });
});
