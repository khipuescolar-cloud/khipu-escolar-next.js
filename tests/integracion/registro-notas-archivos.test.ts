// Registro de notas (specs/47): observación por alumno, plantilla, importación con vista previa e informe de progreso.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { tablaDesdeCsv } from "@/lib/carga-masiva/tabla";
import { db } from "@/lib/server/db";
import { compartirInformeProgreso, guardarInformeProgreso, informesProgreso, notasDeAlumno, publicarEvaluacion } from "@/lib/server/notas";
import { tablaDesdeXlsx } from "@/lib/server/carga-masiva-archivo";
import { crearCalificacion, editarObservacionRegistro, registroDelCurso } from "@/lib/server/registro-notas";
import { exportarRegistro, importarRegistro, plantillaNotas, previsualizarImportacionRegistro } from "@/lib/server/registro-notas-archivos";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let periodoId: string;
let competenciaId: string;
const hoy = new Date();
const fecha = hoy.toISOString().slice(0, 10);

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-registro-archivos" });
  periodoId = (await c.db.periodo.create({ data: { tenantId: c.tenant.id, anio: hoy.getUTCFullYear(), tipo: "bimestre", numero: 1, nombre: "Periodo abierto", inicio: new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1)), fin: new Date(Date.UTC(hoy.getUTCFullYear(), 11, 31)), niveles: ["primaria"] } })).id;
  competenciaId = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Resuelve problemas" } })).id;
});
afterAll(async () => { await c.limpiar(); await db.$disconnect(); });

const profe = () => c.ctxDe("tutora");
const base = () => ({ cursoId: c.cursoTutora.id, periodoId, competenciaId, fecha });

describe("observación por alumno", () => {
  it("es privada por defecto, visible solo si se pide, y la familia ve únicamente las visibles", async () => {
    const privada = await crearCalificacion(profe(), { ...base(), claveIdempotencia: randomUUID(), nombre: "Práctica privada", notas: [{ alumnoId: c.alumnos.mateo.id, valor: "C", observacion: "Habló con un compañero" }] });
    const visible = await crearCalificacion(profe(), { ...base(), claveIdempotencia: randomUUID(), nombre: "Práctica visible", observacionVisible: true, notas: [{ alumnoId: c.alumnos.mateo.id, valor: "A", observacion: "Explicó muy bien su procedimiento" }] });
    expect(privada.ok && visible.ok).toBe(true);
    const nota = (id?: string) => c.db.nota.findFirstOrThrow({ where: { evaluacionId: id, alumnoId: c.alumnos.mateo.id } });
    expect(await nota(privada.evaluacionId)).toMatchObject({ comentario: "Habló con un compañero", comentarioPrivado: true });
    expect(await nota(visible.evaluacionId)).toMatchObject({ comentario: "Explicó muy bien su procedimiento", comentarioPrivado: false });
    const registro = await registroDelCurso(profe(), c.cursoTutora.id, periodoId);
    expect(registro.evaluaciones.find((e) => e.id === privada.evaluacionId)?.notas[0]).toMatchObject({ comentario: "Habló con un compañero", comentarioPrivado: true });
    for (const id of [privada.evaluacionId, visible.evaluacionId]) {
      const grupoId = (await c.db.evaluacion.findFirstOrThrow({ where: { id } })).grupoId;
      expect((await publicarEvaluacion(profe(), grupoId)).ok).toBe(true);
    }
    const familia = await notasDeAlumno(c.ctxDe("madre"), c.alumnos.mateo.id, periodoId);
    const comentarios = familia.cursos.flatMap((x) => x.evaluaciones).map((e) => [e.titulo, e.comentario]);
    expect(comentarios).toContainEqual(["Práctica privada", null]);
    expect(comentarios).toContainEqual(["Práctica visible", "Explicó muy bien su procedimiento"]);
    expect(await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "evaluacion", entidadId: privada.evaluacionId } })).toBeGreaterThan(0);
  });
  it("sin nota no se guarda la observación; editar cambia texto y visibilidad con auditoría; la familia no edita", async () => {
    const r = await crearCalificacion(profe(), { ...base(), claveIdempotencia: randomUUID(), nombre: "Sin nota", notas: [{ alumnoId: c.alumnos.valentina.id, valor: "", observacion: "Faltó material" }] });
    expect(r).toEqual({ ok: false, error: "Pon una nota para guardar la observación." });
    const ok = await crearCalificacion(profe(), { ...base(), claveIdempotencia: randomUUID(), nombre: "Editable", notas: [{ alumnoId: c.alumnos.mateo.id, valor: "B" }] });
    const entrada = { evaluacionId: ok.evaluacionId!, alumnoId: c.alumnos.mateo.id };
    expect((await editarObservacionRegistro(profe(), { ...entrada, observacion: "Mejoró", visible: true })).ok).toBe(true);
    expect(await c.db.nota.findFirstOrThrow({ where: entrada })).toMatchObject({ comentario: "Mejoró", comentarioPrivado: false });
    expect((await editarObservacionRegistro(profe(), { ...entrada, observacion: "Mejoró", visible: false })).ok).toBe(true);
    expect((await c.db.nota.findFirstOrThrow({ where: entrada })).comentarioPrivado).toBe(true);
    expect((await editarObservacionRegistro(profe(), { ...entrada, observacion: "x".repeat(501) })).ok).toBe(false);
    expect((await editarObservacionRegistro(profe(), { ...entrada, observacion: "" })).ok).toBe(true);
    expect((await c.db.nota.findFirstOrThrow({ where: entrada })).comentario).toBeNull();
    expect(await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "nota", entidadId: ok.evaluacionId } })).toBeGreaterThanOrEqual(3);
    await esperarProhibido(editarObservacionRegistro(c.ctxDe("madre"), { ...entrada, observacion: "hack" }));
  });
});

describe("plantilla, vista previa e importación", () => {
  it("la plantilla Excel y CSV traen a los alumnos del curso y las competencias válidas", async () => {
    const xlsx = await plantillaNotas(profe(), c.cursoTutora.id, periodoId, "xlsx");
    expect(xlsx.nombre).toMatch(/^plantilla-notas-.*\.xlsx$/);
    const tabla = await tablaDesdeXlsx(Uint8Array.from(xlsx.contenido as Uint8Array).buffer);
    expect(tabla?.encabezado).toEqual(["alumno_id", "apellidos_nombres", "nota", "observacion"]);
    expect(tabla?.filas.map((f) => f.celdas[0]).sort()).toEqual([c.alumnos.mateo.id, c.alumnos.valentina.id].sort());
    const csv = await plantillaNotas(profe(), c.cursoTutora.id, periodoId, "csv");
    expect(String(csv.contenido).startsWith("﻿alumno_id;apellidos_nombres;nota;observacion")).toBe(true);
    await esperarProhibido(plantillaNotas(c.ctxDe("otroProfesor"), c.cursoTutora.id, periodoId, "csv"));
  });
  it("la vista previa marca alumno desconocido, nota inválida y pendientes sin guardar; importar es idempotente", async () => {
    const entrada = { ...base(), nombre: "Importada", claveIdempotencia: randomUUID() };
    const csv = `alumno_id;apellidos_nombres;nota;observacion\n${c.alumnos.mateo.id};Quispe, Mateo;AD;Participó mucho\n${randomUUID()};Fantasma, Ana;A;\n${c.alumnos.valentina.id};Ríos, Valentina;Z;\n`;
    const vista = await previsualizarImportacionRegistro(profe(), entrada, tablaDesdeCsv(csv)!);
    expect(vista.filas.map((f) => f.alumno)).toEqual(["Quispe, Mateo"]);
    expect(vista.errores.map((e) => e.mensaje)).toEqual([expect.stringContaining("Alumno desconocido"), expect.stringContaining("inválida")]);
    expect(vista.bloqueo).toBeNull();
    expect(await c.db.evaluacion.count({ where: { claveIdempotencia: entrada.claveIdempotencia } })).toBe(0);
    const conPendiente = tablaDesdeCsv(`alumno_id;apellidos_nombres;nota;observacion\n${c.alumnos.mateo.id};;B;\n${c.alumnos.valentina.id};;;\n`)!;
    expect((await previsualizarImportacionRegistro(profe(), entrada, conPendiente)).pendientes).toBe(1);
    const sinNota = tablaDesdeCsv(`alumno_id;apellidos_nombres;nota;observacion\n${c.alumnos.valentina.id};;;Solo texto\n`)!;
    expect((await previsualizarImportacionRegistro(profe(), entrada, sinNota)).errores[0].mensaje).toContain("Pon una nota para guardar la observación.");
    const tabla = tablaDesdeCsv(csv)!;
    const primera = await importarRegistro(profe(), entrada, tabla);
    const segunda = await importarRegistro(profe(), entrada, tabla);
    expect(primera.ok && segunda.ok).toBe(true);
    expect(await c.db.evaluacion.count({ where: { claveIdempotencia: entrada.claveIdempotencia } })).toBe(1);
    const nota = await c.db.nota.findFirstOrThrow({ where: { evaluacion: { claveIdempotencia: entrada.claveIdempotencia }, alumnoId: c.alumnos.mateo.id } });
    expect(nota).toMatchObject({ valorLiteral: "AD", comentario: "Participó mucho", comentarioPrivado: true });
    expect(await c.db.nota.count({ where: { evaluacion: { claveIdempotencia: entrada.claveIdempotencia } } })).toBe(1);
  });
  it("valida en el servidor competencia, fecha y alumnos de otro curso, y exporta con observaciones", async () => {
    const tabla = tablaDesdeCsv(`alumno_id;nota\n${c.alumnos.thiago.id};A\n`)!;
    const ajeno = await previsualizarImportacionRegistro(profe(), { ...base(), nombre: "X1", claveIdempotencia: randomUUID() }, tabla);
    expect(ajeno.filas).toHaveLength(0);
    expect(ajeno.errores[0].mensaje).toContain("Alumno desconocido");
    expect((await previsualizarImportacionRegistro(profe(), { ...base(), competenciaId: randomUUID(), nombre: "X2", claveIdempotencia: randomUUID() }, tabla)).bloqueo).toContain("competencia");
    expect((await previsualizarImportacionRegistro(profe(), { ...base(), fecha: "2000-01-01", nombre: "X3", claveIdempotencia: randomUUID() }, tabla)).bloqueo).toContain("dentro del periodo");
    const { csv, nombre } = await exportarRegistro(c.ctxDe("direccion"), c.cursoTutora.id, periodoId);
    expect(nombre).toMatch(/^registro-.*\.csv$/);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Resuelve problemas");
    expect(csv).toContain("[Privada] Participó mucho");
    expect(csv).toContain("Explicó muy bien su procedimiento");
  });
});

describe("informe de progreso", () => {
  it("sigue funcionando: guardar por alumno y competencia, ver estado y compartir", async () => {
    expect((await guardarInformeProgreso(profe(), { alumnoId: c.alumnos.mateo.id, competenciaId, periodoId, logros: "Resuelve sumas", mejorar: "Restas", recomendaciones: "Practicar en casa" })).ok).toBe(true);
    const antes = await informesProgreso(profe(), c.cursoTutora.id, periodoId);
    const fila = antes.filas.find((f) => f.competencia.id === competenciaId)!;
    expect(fila.alumnos.find((a) => a.alumno.id === c.alumnos.mateo.id)).toMatchObject({ informe: { logros: "Resuelve sumas", mejorar: "Restas", recomendaciones: "Practicar en casa" } });
    expect(fila.alumnos.find((a) => a.alumno.id === c.alumnos.mateo.id)!.notas.length).toBeGreaterThan(0);
    expect(fila.alumnos.find((a) => a.alumno.id === c.alumnos.valentina.id)!.informe).toBeNull();
    expect(antes.envio).toBeNull();
    expect((await compartirInformeProgreso(profe(), c.cursoTutora.id, periodoId)).ok).toBe(true);
    expect((await informesProgreso(profe(), c.cursoTutora.id, periodoId)).envio).not.toBeNull();
  });
});
