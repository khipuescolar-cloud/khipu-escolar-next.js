// Evaluaciones (specs/11): programar con aviso, notas en borrador, publicar resultados sin avisos duplicados, historial
// de notas, evaluaciones en la agenda, comentario del tutor e instrumentos con criterios. Requiere la BD local.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { itemsDeAgenda } from "@/lib/server/agenda";
import { crearCriterio, criteriosDeEvaluacion, eliminarCriterio, guardarResultadoCriterio } from "@/lib/server/criterios";
import { datosLibreta, guardarComentarioTutor } from "@/lib/server/libreta";
import { cambiarEstadoPeriodo, crearEvaluacion, grillaNotas, guardarNota, historialEvaluacion, notasDeAlumno, publicarEvaluacion } from "@/lib/server/notas";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let periodoId: string;
let lee: { id: string };
let escribe: { id: string };
let grupoId: string;
let columnas: { id: string; competenciaId: string | null }[];

const avisos = (plantilla: string, referenciaId: string) => db.aviso.findMany({ where: { tenantId: c.tenant.id, plantilla, referenciaId } });

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-evaluaciones-pub" });
  periodoId = (await c.db.periodo.create({
    data: { tenantId: c.tenant.id, anio: 2026, tipo: "trimestre", numero: 3, nombre: "III Trimestre", inicio: new Date("2026-09-01"), fin: new Date("2026-12-18") },
  })).id;
  lee = await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Lee", orden: 1 } });
  escribe = await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Escribe", orden: 2 } });
}, 30_000);
afterAll(async () => {
  await c?.limpiar();
}, 30_000);

describe("programar y publicar evaluaciones", () => {
  it("programar avisa una vez a cada familia del salón y las notas quedan en borrador", async () => {
    const tutora = c.ctxDe("tutora");
    const r = await crearEvaluacion(tutora, {
      cursoId: c.cursoTutora.id, periodoId, competenciaIds: [lee.id, escribe.id], titulo: "Examen trimestral", fecha: "2026-11-22",
      peso: "1", descripcion: "Comprensión lectora y producción de textos.", avisar: true,
    });
    expect(r).toEqual({ ok: true, mensaje: "Evaluación creada: una columna por cada una de sus 2 competencias. Avisamos a 2 familias." });
    const g = await grillaNotas(tutora, c.cursoTutora.id, periodoId);
    columnas = g.evaluaciones;
    grupoId = g.evaluaciones[0].grupoId;
    expect(new Set(g.evaluaciones.map((e) => e.grupoId)).size).toBe(1);
    expect(g.evaluaciones.every((e) => e.estado === "programada" && e.descripcion === "Comprensión lectora y producción de textos.")).toBe(true);
    // Una sola evaluación con dos columnas = una notificación por familia en la bandeja (specs/38), sin correo. La familia
    // sin consentimiento vigente la ve en Khipu (sin push); nadie tiene dispositivos, así que no hay filas en la cola.
    const notifs = await c.db.notificacion.findMany({ where: { tipo: "evaluacion_programada", clave: `evaluacion:${grupoId}` } });
    expect(new Set(notifs.map((n) => n.membershipId))).toEqual(new Set([c.miembros.madre.membership.id, c.miembros.padreSinConsentimiento.membership.id]));
    expect(notifs).toHaveLength(2);
    expect(await avisos("evaluacion_programada", grupoId)).toHaveLength(0);

    for (const col of columnas) expect(await guardarNota(tutora, { evaluacionId: col.id, alumnoId: c.alumnos.mateo.id, valor: "B" })).toMatchObject({ ok: true });
    const familia = await notasDeAlumno(c.ctxDe("madre"), c.alumnos.mateo.id, periodoId);
    expect(familia.cursos.flatMap((x) => x.evaluaciones)).toHaveLength(0);
  });

  it("la agenda muestra la evaluación una vez, sin hora", async () => {
    const items = await itemsDeAgenda(c.ctxDe("madre"), new Date("2026-11-20T05:00:00Z"), new Date("2026-11-25T05:00:00Z"));
    const ev = items.filter((i) => i.tipo === "examen");
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ titulo: "Evaluación: Examen trimestral", sinHora: true, descripcion: "Comprensión lectora y producción de textos." });
  });

  it("publicar muestra las notas a la familia sin correo (notificación por evento, specs/38); solo el profesor del curso publica", async () => {
    await esperarProhibido(publicarEvaluacion(c.ctxDe("otroProfesor"), grupoId));
    await esperarProhibido(publicarEvaluacion(c.ctxDe("direccion"), grupoId));
    const tutora = c.ctxDe("tutora");
    expect(await publicarEvaluacion(tutora, grupoId)).toEqual({ ok: true, mensaje: "Resultados publicados. Las familias ya pueden verlos y reciben una notificación en Khipu." });
    expect(await publicarEvaluacion(tutora, grupoId)).toEqual({ ok: false, error: "Los resultados ya se publicaron." });
    expect(await avisos("resultados_publicados", grupoId)).toHaveLength(0);

    const familia = await notasDeAlumno(c.ctxDe("madre"), c.alumnos.mateo.id, periodoId);
    expect(familia.cursos.flatMap((x) => x.evaluaciones).map((e) => e.valor.valorLiteral)).toEqual(["B", "B"]);
  });

  it("sin notas no se publica; una evaluación sin aviso no avisa", async () => {
    const tutora = c.ctxDe("tutora");
    expect(await crearEvaluacion(tutora, { cursoId: c.cursoTutora.id, periodoId, competenciaIds: [lee.id], titulo: "Lista diaria", fecha: "2026-11-10", peso: "1" }))
      .toEqual({ ok: true, mensaje: "Evaluación creada." });
    const g = await grillaNotas(tutora, c.cursoTutora.id, periodoId);
    const otra = g.evaluaciones.find((e) => e.titulo === "Lista diaria")!;
    expect(await avisos("evaluacion_programada", otra.grupoId)).toHaveLength(0);
    expect(await c.db.notificacion.count({ where: { clave: `evaluacion:${otra.grupoId}` } })).toBe(0);
    expect(await publicarEvaluacion(tutora, otra.grupoId)).toEqual({ ok: false, error: "Pon al menos una nota antes de publicar los resultados." });
  });

  it("el historial guarda cada cambio de nota con el valor anterior y quién lo hizo", async () => {
    const tutora = c.ctxDe("tutora");
    const col = columnas.find((x) => x.competenciaId === lee.id)!;
    const corr = { motivo: "Error al digitar", tipo: "correccion_digitacion" as const };
    expect(await guardarNota(tutora, { evaluacionId: col.id, alumnoId: c.alumnos.mateo.id, valor: "A" })).toMatchObject({ ok: false }); // publicada: pide motivo
    await guardarNota(tutora, { evaluacionId: col.id, alumnoId: c.alumnos.mateo.id, valor: "A", ...corr });
    await guardarNota(tutora, { evaluacionId: col.id, alumnoId: c.alumnos.mateo.id, valor: "A", ...corr }); // sin cambio: no se registra
    await guardarNota(tutora, { evaluacionId: col.id, alumnoId: c.alumnos.mateo.id, valor: "", ...corr });
    const h = await historialEvaluacion(c.ctxDe("direccion"), grupoId);
    const deLee = h.filter((x) => x.competencia === "Lee").map((x) => [x.anterior, x.nuevo]);
    expect(deLee).toEqual([["A", null], ["B", "A"], [null, "B"]]);
    expect(h[0].por).toBe("Lucia Prueba");
    await esperarProhibido(historialEvaluacion(c.ctxDe("otroProfesor"), grupoId));
  });
});

describe("comentario del tutor", () => {
  it("solo el tutor del salón lo escribe, va en la libreta y no cambia con el periodo cerrado", async () => {
    const entrada = { alumnoId: c.alumnos.mateo.id, periodoId, texto: "Mateo participa con entusiasmo." };
    await esperarProhibido(guardarComentarioTutor(c.ctxDe("otroProfesor"), entrada));
    await esperarProhibido(guardarComentarioTutor(c.ctxDe("direccion"), entrada));
    expect(await guardarComentarioTutor(c.ctxDe("tutora"), entrada)).toEqual({ ok: true, mensaje: "Comentario guardado." });
    const libreta = await datosLibreta(c.ctxDe("tutora"), c.alumnos.mateo.id, periodoId);
    expect(libreta).toMatchObject({ comentarioTutor: "Mateo participa con entusiasmo.", puedeComentar: true });
    expect((await datosLibreta(c.ctxDe("direccion"), c.alumnos.mateo.id, periodoId)).puedeComentar).toBe(false);
  });
});

describe("instrumentos con criterios", () => {
  it("guarda puntajes y cumple/no cumple tal cual, valida rangos y no toca la nota", async () => {
    const tutora = c.ctxDe("tutora");
    const col = columnas.find((x) => x.competenciaId === escribe.id)!;
    await esperarProhibido(crearCriterio(c.ctxDe("otroProfesor"), { evaluacionId: col.id, descripcion: "Ajeno", escala: "cumple" }));
    expect(await crearCriterio(tutora, { evaluacionId: col.id, descripcion: "Usa conectores", escala: "puntaje" }))
      .toEqual({ ok: false, error: "Indica el puntaje máximo del criterio." });
    expect(await crearCriterio(tutora, { evaluacionId: col.id, descripcion: "Usa conectores", escala: "puntaje", puntajeMaximo: 3 })).toEqual({ ok: true, mensaje: "Criterio agregado." });
    expect(await crearCriterio(tutora, { evaluacionId: col.id, descripcion: "Pone título", escala: "cumple" })).toMatchObject({ ok: true });
    const [conectores, titulo] = (await criteriosDeEvaluacion(tutora, col.id)).criterios;

    expect(await guardarResultadoCriterio(tutora, { criterioId: conectores.id, alumnoId: c.alumnos.mateo.id, valor: "4" })).toEqual({ ok: false, error: "Escribe un puntaje de 0 a 3." });
    expect(await guardarResultadoCriterio(tutora, { criterioId: conectores.id, alumnoId: c.alumnos.mateo.id, valor: "2,5" })).toEqual({ ok: true });
    expect(await guardarResultadoCriterio(tutora, { criterioId: titulo.id, alumnoId: c.alumnos.mateo.id, valor: "si" })).toEqual({ ok: true });
    expect(await guardarResultadoCriterio(tutora, { criterioId: titulo.id, alumnoId: c.alumnos.thiago.id, valor: "si" })).toEqual({ ok: false, error: "Ese alumno no está en este curso." });
    const d = await criteriosDeEvaluacion(tutora, col.id);
    expect(d.resultados.map((r) => [r.puntaje, r.cumple]).sort()).toEqual([[2.5, null], [null, true]].sort());
    const nota = await db.nota.findFirst({ where: { evaluacionId: col.id, alumnoId: c.alumnos.mateo.id } });
    expect(nota?.valorLiteral).toBe("B"); // los criterios no cambian la nota

    expect(await eliminarCriterio(tutora, conectores.id)).toEqual({ ok: true, mensaje: "Criterio eliminado con sus resultados." });
    await cambiarEstadoPeriodo(c.ctxDe("direccion"), periodoId, true);
    expect(await guardarResultadoCriterio(tutora, { criterioId: titulo.id, alumnoId: c.alumnos.mateo.id, valor: "no" })).toMatchObject({ ok: false });
    expect(await guardarComentarioTutor(tutora, { alumnoId: c.alumnos.mateo.id, periodoId, texto: "Otro" }))
      .toEqual({ ok: false, error: "Este periodo está cerrado. El comentario ya no se puede cambiar." });
  });
});
