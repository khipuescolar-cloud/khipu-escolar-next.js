// Tareas estilo Classroom (specs/39): secciones, destinatarios, publicación programada, entregas, revisión, comentarios,
// plazos, calificación sin NSP, avisos y adjuntos. Requiere la BD local; crea sus propios colegios y los borra.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { requireArchivoVisible } from "@/lib/server/archivos";
import { itemsDeAgenda } from "@/lib/server/agenda";
import { publicarEvaluacion, guardarNota } from "@/lib/server/notas";
import { sincronizarNsp } from "@/lib/server/nsp";
import { procesarTareasProgramadas } from "@/lib/server/notificaciones/avisos-tareas";
import {
  anularEntrega, calificarEntrega, cambiarCierreTarea, cambiarPlazo, comentarTarea, crearTarea, detalleTareaFamilia, devolverEntrega,
  editarDestinatarios, eliminarTarea, guardarEntrega, marcarEntregaFisica, marcarNoEntregaron, marcarRevisada, ocultarComentario,
  revisionDeTarea, tareasDeFamilia, tareasDelDocente,
} from "@/lib/server/tareas";
import type { TenantContext } from "@/lib/server/tenant";
import { fechaDb, fechaLima, instanteEnZona, sumarDias } from "@/lib/fechas";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let otro: ColegioPrueba;
let gemelo: string; // Matemática de 5.° A, también de la tutora
const cincoA: string[] = []; // 5 alumnos extra de 5.° A
let alumnoCtx: TenantContext; // cuenta propia de Mateo
let alumnoAjenoCtx: TenantContext; // cuenta propia de Thiago (5.° A)
const hoy = fechaLima(new Date());
const D = sumarDias(hoy, 3);

const pdf = (nombre = "trabajo.pdf") => ({ nombre, buffer: Buffer.from("%PDF-1.4\n%prueba\n") });
const png = (nombre = "foto.png") => ({ nombre, buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]) });

async function cuentaAlumno(col: ColegioPrueba, alumnoId: string): Promise<TenantContext> {
  const id = randomUUID();
  const user = await db.profile.create({ data: { id, email: `alumno-${id.slice(0, 8)}@test-basico.local`, nombres: "Alumno", apellidos: "Prueba" } });
  const membership = await db.membership.create({ data: { tenantId: col.tenant.id, userId: id, rol: "alumno" } });
  await db.alumno.update({ where: { id: alumnoId }, data: { cuentaId: membership.id } });
  perfilesExtra.push(id);
  return { ...col.ctxDe("madre"), user, membership, rol: "alumno", roles: ["alumno"] };
}
const perfilesExtra: string[] = [];

const tutora = () => c.ctxDe("tutora");
const madre = () => c.ctxDe("madre"); // apoderada de Mateo (3.° B)
const padre = () => c.ctxDe("padreSinConsentimiento"); // apoderado de Valentina (3.° B, sin cuenta)

async function tareaPor(titulo: string) {
  return c.db.tarea.findFirstOrThrow({ where: { titulo } });
}
async function asignacion(tareaId: string, alumnoId: string) {
  return c.db.tareaAsignacion.findFirstOrThrow({ where: { tareaId, alumnoId } });
}

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-tareas" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-tareas-otro" });
  gemelo = (await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.otroSalon.id, nombre: "Matemática", profesorId: c.miembros.tutora.membership.id } })).id;
  for (let i = 0; i < 6; i++) {
    cincoA.push((await db.alumno.create({ data: { tenantId: c.tenant.id, salonId: c.otroSalon.id, nombres: `Alumno${i}`, apellidos: "Cinco" } })).id);
  }
  alumnoCtx = await cuentaAlumno(c, c.alumnos.mateo.id);
  alumnoAjenoCtx = await cuentaAlumno(c, c.alumnos.thiago.id);
  await db.periodo.create({ data: { tenantId: c.tenant.id, anio: Number(hoy.slice(0, 4)), tipo: "bimestre", numero: 4, nombre: "IV Bimestre", inicio: fechaDb(sumarDias(hoy, -30)), fin: fechaDb(sumarDias(hoy, 60)), niveles: ["primaria"] } });
});

afterAll(async () => {
  await c.limpiar();
  await otro.limpiar();
  await db.profile.deleteMany({ where: { id: { in: perfilesExtra } } });
});

describe("crear tareas multi-sección con destinatarios", () => {
  it("3.° B todos y 5.° A cinco seleccionados: asignaciones exactas y sin duplicados", async () => {
    const r = await crearTarea(tutora(), {
      cursoId: c.cursoTutora.id, titulo: "Multi sección", fechaEntrega: D,
      secciones: [{ cursoId: c.cursoTutora.id, todos: true }, { cursoId: gemelo, todos: false, alumnoIds: [...cincoA.slice(0, 5), cincoA[0]] }],
    });
    expect(r).toMatchObject({ ok: true });
    const t = await tareaPor("Multi sección");
    expect(await c.db.tareaCurso.count({ where: { tareaId: t.id } })).toBe(2);
    const asign = await c.db.tareaAsignacion.findMany({ where: { tareaId: t.id } });
    expect(asign).toHaveLength(2 + 5); // Mateo y Valentina + 5 elegidos (el repetido no duplica)
    expect(asign.map((a) => a.alumnoId)).not.toContain(c.alumnos.thiago.id);
    // Thiago (5.° A, no elegido) no la ve; Mateo sí.
    expect((await tareasDeFamilia(alumnoAjenoCtx))[0].grupos.semana.concat((await tareasDeFamilia(alumnoAjenoCtx))[0].grupos.manana).map((x) => x.id)).not.toContain(t.id);
    const deMateo = (await tareasDeFamilia(alumnoCtx))[0];
    expect([...deMateo.grupos.manana, ...deMateo.grupos.semana].map((x) => x.id)).toContain(t.id);
  });

  it("rechaza alumnos de otro salón u otro colegio y secciones que no son del docente", async () => {
    const base = { cursoId: c.cursoTutora.id, fechaEntrega: D };
    expect(await crearTarea(tutora(), { ...base, titulo: "Otro salón", secciones: [{ cursoId: c.cursoTutora.id, todos: false, alumnoIds: [c.alumnos.thiago.id] }] })).toMatchObject({ ok: false });
    expect(await crearTarea(tutora(), { ...base, titulo: "Otro colegio", secciones: [{ cursoId: c.cursoTutora.id, todos: false, alumnoIds: [otro.alumnos.mateo.id] }] })).toMatchObject({ ok: false });
    await esperarProhibido(crearTarea(tutora(), { ...base, titulo: "Curso ajeno", secciones: [{ cursoId: c.cursoAjeno.id, todos: true }] }));
    await esperarProhibido(crearTarea(c.ctxDe("otroProfesor"), { ...base, titulo: "Intrusa" }));
    expect(await c.db.tarea.count({ where: { titulo: { in: ["Otro salón", "Otro colegio", "Curso ajeno", "Intrusa"] } } })).toBe(0);
  });

  it("programada: no visible ni en agenda antes de su hora; el cron la avisa una vez al llegar", async () => {
    const ahora = new Date();
    const publicarEn = new Date(ahora.getTime() + 2 * 3600_000);
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(publicarEn);
    const p = (t: string) => fmt.find((x) => x.type === t)!.value;
    const texto = `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}`;
    expect(await crearTarea(tutora(), { cursoId: c.cursoTutora.id, titulo: "Programada", fechaEntrega: D, accion: "programar", publicarEn: texto, avisarFamilias: true })).toMatchObject({ ok: true });
    const t = await tareaPor("Programada");
    const visibles = (await tareasDeFamilia(madre()))[0];
    expect([...visibles.grupos.manana, ...visibles.grupos.semana, ...visibles.grupos.despues].map((x) => x.id)).not.toContain(t.id);
    const agenda = await itemsDeAgenda(madre(), new Date(), new Date(Date.now() + 10 * 86_400_000));
    expect(agenda.map((i) => i.titulo)).not.toContain("Entrega: Programada");
    await esperarProhibido(detalleTareaFamilia(madre(), t.id, c.alumnos.mateo.id));
    expect((await procesarTareasProgramadas(ahora)).avisadas).toBe(0);
    expect(await c.db.notificacion.count({ where: { clave: `tarea:${t.id}` } })).toBe(0);

    const despues = new Date(publicarEn.getTime() + 60_000);
    await procesarTareasProgramadas(despues);
    await procesarTareasProgramadas(despues);
    // La bandeja no exige consentimiento: madre, padre y la cuenta de Mateo (una vez, aunque el cron corra dos veces).
    expect(await c.db.notificacion.count({ where: { clave: `tarea:${t.id}` } })).toBe(3);
  });
});

describe("entregas", () => {
  it("puntual vs. tarde según la hora límite en la zona del colegio", async () => {
    expect(await crearTarea(tutora(), { cursoId: c.cursoTutora.id, titulo: "Con hora", fechaEntrega: D, horaEntrega: "10:00" })).toMatchObject({ ok: true });
    const t = await tareaPor("Con hora");
    expect(await guardarEntrega(alumnoCtx, t.id, c.alumnos.mateo.id, { texto: "listo", enviar: true }, {}, instanteEnZona(D, "09:59"))).toMatchObject({ ok: true });
    expect((await asignacion(t.id, c.alumnos.mateo.id))).toMatchObject({ estado: "entregada", tarde: false });
    expect(await guardarEntrega(padre(), t.id, c.alumnos.valentina.id, { texto: "tarde", enviar: true }, {}, instanteEnZona(D, "10:01"))).toMatchObject({ ok: true });
    const v = await asignacion(t.id, c.alumnos.valentina.id);
    expect(v).toMatchObject({ estado: "entregada", tarde: true, entregadaPorId: c.miembros.padreSinConsentimiento.membership.id });
  });

  it("sin hora vence al final del día; sin fecha nunca vence", async () => {
    expect(await crearTarea(tutora(), { cursoId: c.cursoTutora.id, titulo: "Solo fecha", fechaEntrega: D })).toMatchObject({ ok: true });
    const t = await tareaPor("Solo fecha");
    expect(await guardarEntrega(alumnoCtx, t.id, c.alumnos.mateo.id, { texto: "noche", enviar: true }, {}, instanteEnZona(D, "23:30"))).toMatchObject({ ok: true });
    expect((await asignacion(t.id, c.alumnos.mateo.id)).tarde).toBe(false);

    expect(await crearTarea(tutora(), { cursoId: c.cursoTutora.id, titulo: "Sin fecha", permiteTardias: false })).toMatchObject({ ok: true });
    const s = await tareaPor("Sin fecha");
    expect(s.fechaEntrega).toBeNull();
    const lejos = new Date(Date.now() + 400 * 86_400_000);
    expect(await guardarEntrega(alumnoCtx, s.id, c.alumnos.mateo.id, { texto: "un año después", enviar: true }, {}, lejos)).toMatchObject({ ok: true });
    expect((await asignacion(s.id, c.alumnos.mateo.id)).tarde).toBe(false);
    const agenda = await itemsDeAgenda(madre(), new Date(Date.now() - 86_400_000), new Date(Date.now() + 30 * 86_400_000));
    expect(agenda.map((i) => i.titulo)).not.toContain("Entrega: Sin fecha");
  });

  it("no permite tardías: rechaza después del plazo; cerrar entregas bloquea", async () => {
    expect(await crearTarea(tutora(), { cursoId: c.cursoTutora.id, titulo: "Estricta", fechaEntrega: D, horaEntrega: "08:00", permiteTardias: false })).toMatchObject({ ok: true });
    const t = await tareaPor("Estricta");
    expect(await guardarEntrega(alumnoCtx, t.id, c.alumnos.mateo.id, { texto: "x", enviar: true }, {}, instanteEnZona(D, "08:30"))).toMatchObject({ ok: false });
    expect((await asignacion(t.id, c.alumnos.mateo.id)).estado).toBe("asignada");

    expect(await cambiarCierreTarea(tutora(), t.id, true)).toMatchObject({ ok: true });
    expect(await guardarEntrega(padre(), t.id, c.alumnos.valentina.id, { texto: "x", enviar: true })).toMatchObject({ ok: false, error: expect.stringContaining("cerró") });
    expect(await cambiarCierreTarea(tutora(), t.id, false)).toMatchObject({ ok: true });
    expect(await guardarEntrega(padre(), t.id, c.alumnos.valentina.id, { texto: "x", enviar: true })).toMatchObject({ ok: true });
  });

  it("devolver y reentregar: intentos numerados; anular antes de revisión; revisada no se anula", async () => {
    expect(await crearTarea(tutora(), { cursoId: c.cursoTutora.id, titulo: "Reentrega", fechaEntrega: D })).toMatchObject({ ok: true });
    const t = await tareaPor("Reentrega");
    expect(await guardarEntrega(alumnoCtx, t.id, c.alumnos.mateo.id, { texto: "borrador" }, { nuevos: [pdf()] })).toMatchObject({ ok: true });
    expect((await asignacion(t.id, c.alumnos.mateo.id)).estado).toBe("en_proceso");
    expect(await guardarEntrega(alumnoCtx, t.id, c.alumnos.mateo.id, { enviar: true })).toMatchObject({ ok: true });
    expect(await anularEntrega(alumnoCtx, t.id, c.alumnos.mateo.id)).toMatchObject({ ok: true });
    expect((await asignacion(t.id, c.alumnos.mateo.id)).estado).toBe("en_proceso");
    expect(await guardarEntrega(alumnoCtx, t.id, c.alumnos.mateo.id, { enviar: true })).toMatchObject({ ok: true });

    const a = await asignacion(t.id, c.alumnos.mateo.id);
    expect(await devolverEntrega(tutora(), a.id, "Falta la conclusión.")).toMatchObject({ ok: true });
    expect((await asignacion(t.id, c.alumnos.mateo.id)).estado).toBe("devuelta");
    expect(await c.db.notificacion.count({ where: { clave: { startsWith: `tarea-devuelta:${a.id}:` } } })).toBeGreaterThan(0);
    expect(await guardarEntrega(alumnoCtx, t.id, c.alumnos.mateo.id, { texto: "con conclusión", enviar: true }, { nuevos: [png()] })).toMatchObject({ ok: true });
    const intentos = await c.db.tareaEntrega.findMany({ where: { asignacionId: a.id }, orderBy: { numero: "asc" } });
    expect(intentos.map((i) => [i.numero, i.borrador])).toEqual([[1, false], [2, false]]);
    expect(await marcarRevisada(tutora(), a.id)).toMatchObject({ ok: true });
    expect(await anularEntrega(alumnoCtx, t.id, c.alumnos.mateo.id)).toMatchObject({ ok: false });

    const detalle = await detalleTareaFamilia(madre(), t.id, c.alumnos.mateo.id);
    expect(detalle.intentos).toHaveLength(2);
    expect(detalle.comentarios.map((x) => x.texto)).toContain("Falta la conclusión.");
  });

  it("el docente marca «entregada en físico»", async () => {
    const t = await tareaPor("Reentrega");
    const v = await asignacion(t.id, c.alumnos.valentina.id);
    expect(await marcarEntregaFisica(tutora(), v.id)).toMatchObject({ ok: true });
    expect(await asignacion(t.id, c.alumnos.valentina.id)).toMatchObject({ estado: "entregada", enFisico: true });
    await esperarProhibido(marcarEntregaFisica(c.ctxDe("otroProfesor"), v.id));
  });

  it("quitar destinatario conserva su entrega y deja de verla; volver a agregarlo la recupera", async () => {
    const t = await tareaPor("Multi sección");
    expect(await guardarEntrega(padre(), t.id, c.alumnos.valentina.id, { texto: "hecha", enviar: true })).toMatchObject({ ok: true });
    const s = await c.db.tareaCurso.findFirstOrThrow({ where: { tareaId: t.id, cursoId: c.cursoTutora.id } });
    expect(await editarDestinatarios(tutora(), t.id, { tareaCursoId: s.id, todos: true, quitar: [c.alumnos.valentina.id] })).toMatchObject({ ok: true });
    const a = await asignacion(t.id, c.alumnos.valentina.id);
    expect(a.retiradaAt).not.toBeNull();
    expect(await c.db.tareaEntrega.count({ where: { asignacionId: a.id, borrador: false } })).toBe(1);
    await esperarProhibido(detalleTareaFamilia(padre(), t.id, c.alumnos.valentina.id));
    expect(await editarDestinatarios(tutora(), t.id, { tareaCursoId: s.id, todos: true, agregar: [c.alumnos.valentina.id] })).toMatchObject({ ok: true });
    expect((await asignacion(t.id, c.alumnos.valentina.id))).toMatchObject({ retiradaAt: null, estado: "entregada" });
  });
});

describe("privacidad", () => {
  it("apoderado y alumno no ven tareas, entregas ni comentarios privados de otro alumno", async () => {
    const t = await tareaPor("Reentrega");
    await esperarProhibido(detalleTareaFamilia(madre(), t.id, c.alumnos.valentina.id));
    await esperarProhibido(guardarEntrega(madre(), t.id, c.alumnos.valentina.id, { texto: "x", enviar: true }));
    await esperarProhibido(detalleTareaFamilia(alumnoCtx, t.id, c.alumnos.valentina.id));
    await esperarProhibido(comentarTarea(alumnoCtx, t.id, { alumnoId: c.alumnos.valentina.id, texto: "hola" }));
    const valentina = await asignacion(t.id, c.alumnos.valentina.id);
    await c.db.tareaComentario.create({ data: { tenantId: c.tenant.id, tareaId: t.id, asignacionId: valentina.id, autorId: c.miembros.tutora.membership.id, texto: "Privado para Valentina" } });
    const d = await detalleTareaFamilia(alumnoCtx, t.id, c.alumnos.mateo.id);
    expect(d.comentarios.map((x) => x.texto)).not.toContain("Privado para Valentina");
    // Archivo de la entrega de Mateo: lo bajan él, su madre, la profesora del curso y dirección; nadie más.
    const archivo = await c.db.archivo.findFirstOrThrow({ where: { entrega: { asignacion: { tareaId: t.id, alumnoId: c.alumnos.mateo.id } } } });
    for (const quien of [alumnoCtx, madre(), tutora(), c.ctxDe("direccion")]) expect((await requireArchivoVisible(quien, archivo.id)).id).toBe(archivo.id);
    for (const quien of [padre(), alumnoAjenoCtx, c.ctxDe("otroProfesor")]) await esperarProhibido(requireArchivoVisible(quien, archivo.id));
    await esperarProhibido(requireArchivoVisible({ ...c.ctxDe("direccion"), soporte: { accesoId: randomUUID(), expiraAt: new Date(Date.now() + 3600_000) } }, archivo.id));
    expect(await c.db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "tarea_entrega_archivo", entidadId: archivo.id } })).toBeGreaterThan(0);
  });

  it("un profesor de otro curso del salón no ve la revisión de entregas", async () => {
    const t = await tareaPor("Reentrega");
    await esperarProhibido(revisionDeTarea(c.ctxDe("otroProfesor"), t.id));
    const r = await revisionDeTarea(c.ctxDe("direccion"), t.id);
    expect(r.secciones[0].contadores.entregaron).toBeGreaterThanOrEqual(1);
  });

  it("comentarios generales solo si la tarea los activa, y el docente puede ocultarlos", async () => {
    const t = await tareaPor("Reentrega");
    expect(await comentarTarea(madre(), t.id, { alumnoId: c.alumnos.mateo.id, general: true, texto: "¿Hasta qué hora?" })).toMatchObject({ ok: false });
    expect(await crearTarea(tutora(), { cursoId: c.cursoTutora.id, titulo: "Con foro", fechaEntrega: D, comentariosGenerales: true })).toMatchObject({ ok: true });
    const f = await tareaPor("Con foro");
    expect(await comentarTarea(madre(), f.id, { alumnoId: c.alumnos.mateo.id, general: true, texto: "¿Hasta qué hora?" })).toMatchObject({ ok: true });
    expect((await detalleTareaFamilia(padre(), f.id, c.alumnos.valentina.id)).comentarios.map((x) => x.texto)).toContain("¿Hasta qué hora?");
    const com = await c.db.tareaComentario.findFirstOrThrow({ where: { tareaId: f.id } });
    expect(await ocultarComentario(tutora(), com.id)).toMatchObject({ ok: true });
    expect((await detalleTareaFamilia(padre(), f.id, c.alumnos.valentina.id)).comentarios).toHaveLength(0);
  });
});

describe("plazos, calificación y avisos", () => {
  it("cambio de plazo: historial inmutable, auditoría con antes/después, aviso sin correo; entregas enviadas conservan su condición", async () => {
    const t = await tareaPor("Con hora");
    const antes = await asignacion(t.id, c.alumnos.valentina.id);
    expect(await cambiarPlazo(tutora(), t.id, { fechaEntrega: sumarDias(D, 2), horaEntrega: "12:00", motivo: "Feriado" })).toMatchObject({ ok: true });
    const cambio = await c.db.tareaCambioPlazo.findFirstOrThrow({ where: { tareaId: t.id } });
    expect(cambio.nuevo?.toISOString()).toBe(instanteEnZona(sumarDias(D, 2), "12:00").toISOString());
    await expect(db.tareaCambioPlazo.update({ where: { id: cambio.id }, data: { motivo: "otro" } })).rejects.toThrow();
    expect(await c.db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "tarea_plazo", entidadId: t.id } })).toBe(1);
    expect((await asignacion(t.id, c.alumnos.valentina.id))).toMatchObject({ tarde: true, entregadaAt: antes.entregadaAt });
    expect(await c.db.aviso.count({ where: { tenantId: c.tenant.id, tipo: "tarea", canal: "correo" } })).toBe(0);
  });

  it("calificable: crea la evaluación ligada (sin NSP aunque el alumno falte el día del plazo); NE solo explícito; publica con el flujo de Notas", async () => {
    // Mateo falta el día del plazo.
    await db.asistencia.create({ data: { tenantId: c.tenant.id, alumnoId: c.alumnos.mateo.id, ambito: "dia", fecha: fechaDb(D), hora: "08:30", estado: "falta" } });
    const competencia = await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Resuelve problemas de cantidad" } });
    expect(await crearTarea(tutora(), {
      cursoId: c.cursoTutora.id, titulo: "Calificada", fechaEntrega: D, calificable: true, competenciaId: competencia.id,
      secciones: [{ cursoId: c.cursoTutora.id, todos: false, alumnoIds: [c.alumnos.mateo.id] }],
    })).toMatchObject({ ok: true });
    const t = await tareaPor("Calificada");
    const ev = await c.db.evaluacion.findFirstOrThrow({ where: { tareaId: t.id } });
    const s = await c.db.tareaCurso.findFirstOrThrow({ where: { tareaId: t.id } });
    expect(s.evaluacionGrupoId).toBe(ev.grupoId);
    expect(await c.db.nota.count({ where: { evaluacionId: ev.id } })).toBe(0);
    await sincronizarNsp(c.db, c.tenant, { fecha: fechaDb(D), alumnoIds: [c.alumnos.mateo.id, c.alumnos.valentina.id] });
    await sincronizarNsp(c.db, c.tenant, { evaluacionIds: [ev.id] });
    expect(await c.db.nota.count({ where: { evaluacionId: ev.id, marca: "nsp" } })).toBe(0);
    // Valentina no está asignada: no lleva nota.
    expect(await guardarNota(tutora(), { evaluacionId: ev.id, alumnoId: c.alumnos.valentina.id, valor: "A" })).toMatchObject({ ok: false });
    // NE solo por acción explícita.
    expect(await marcarNoEntregaron(tutora(), t.id, s.id)).toMatchObject({ ok: true });
    expect(await c.db.nota.findFirst({ where: { evaluacionId: ev.id, alumnoId: c.alumnos.mateo.id } })).toMatchObject({ marca: "no_entrego" });
    const a = await asignacion(t.id, c.alumnos.mateo.id);
    expect(await calificarEntrega(tutora(), a.id, { valor: "A" })).toMatchObject({ ok: true });
    expect((await detalleTareaFamilia(madre(), t.id, c.alumnos.mateo.id)).calificacion).toBeNull(); // aún no publicada
    expect(await publicarEvaluacion(tutora(), ev.grupoId)).toMatchObject({ ok: true });
    expect((await detalleTareaFamilia(madre(), t.id, c.alumnos.mateo.id)).calificacion).toBe("A");
  });

  it("aviso de tarea publicada idempotente, a destinatarios, sin correo", async () => {
    expect(await crearTarea(tutora(), { cursoId: c.cursoTutora.id, titulo: "Avisada", fechaEntrega: D, avisarFamilias: true, secciones: [{ cursoId: c.cursoTutora.id, todos: false, alumnoIds: [c.alumnos.mateo.id] }] })).toMatchObject({ ok: true });
    const t = await tareaPor("Avisada");
    const notifs = await c.db.notificacion.findMany({ where: { clave: `tarea:${t.id}` } });
    expect(notifs.map((n) => n.membershipId).sort()).toEqual([c.miembros.madre.membership.id, alumnoCtx.membership.id].sort());
    await procesarTareasProgramadas(new Date(Date.now() + 86_400_000));
    expect(await c.db.notificacion.count({ where: { clave: `tarea:${t.id}` } })).toBe(2);
    expect(await c.db.aviso.count({ where: { referenciaId: t.id, canal: "correo" } })).toBe(0);
  });

  it("solo se elimina una tarea sin entregas; la lista docente trae contadores", async () => {
    const lista = await tareasDelDocente(tutora());
    const r = lista.find((x) => x.titulo === "Reentrega")!;
    expect(r.contadores).toMatchObject({ asignados: 2, revisadas: 1 });
    expect(await eliminarTarea(tutora(), r.id)).toMatchObject({ ok: false });
    const libre = lista.find((x) => x.titulo === "Con foro")!;
    expect(await eliminarTarea(tutora(), libre.id)).toMatchObject({ ok: true });
  });
});

describe("adjuntos de tareas", () => {
  it("acepta PDF/PNG con su extensión, rechaza extensión falsa y respeta el límite del colegio", async () => {
    expect(await crearTarea(tutora(), { cursoId: c.cursoTutora.id, titulo: "Falsa", fechaEntrega: D }, [{ nombre: "tarea.pdf", buffer: png().buffer }])).toMatchObject({ ok: false, error: expect.stringContaining("extensión") });
    await db.tenant.update({ where: { id: c.tenant.id }, data: { tareasMaxArchivos: 1 } });
    const ctx = { ...tutora(), tenant: { ...tutora().tenant, tareasMaxArchivos: 1 } };
    expect(await crearTarea(ctx, { cursoId: c.cursoTutora.id, titulo: "Dos archivos", fechaEntrega: D }, [pdf("a.pdf"), pdf("b.pdf")])).toMatchObject({ ok: false });
    expect(await crearTarea(ctx, { cursoId: c.cursoTutora.id, titulo: "Un archivo", fechaEntrega: D }, [pdf("a.pdf")])).toMatchObject({ ok: true });
    await db.tenant.update({ where: { id: c.tenant.id }, data: { tareasMaxArchivos: 5 } });
  });
});
