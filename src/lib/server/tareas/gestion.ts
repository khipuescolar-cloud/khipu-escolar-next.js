import "server-only";
import { z } from "zod";
import { fechaDb, instanteEnZona, momentoEnZona } from "@/lib/fechas";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { instanteDeEntrega, limiteEfectivo, MAX_ENLACES_TAREA, MAX_INSTRUCCIONES, normalizarEnlace } from "@/lib/tareas";
import { adjuntosDe, borrarDelProveedor, contarRestantes, guardarAdjuntos, quitarAdjuntos, type EntradaAdjunto } from "../adjuntos";
import { auditar } from "../auditoria";
import { cursosDelDocente } from "../cursos";
import { crearEvaluacion, periodoEnCurso } from "../notas";
import { avisarCambioPlazo, avisarTareaPublicada } from "../notificaciones/avisos-tareas";
import { requireFeature, tieneFeature } from "../plan";
import { requireCursoDelProfesor, requireRol, type TenantContext } from "../tenant";
import { mensajeDe, requireTareaAutor, sincronizarAsignaciones, validarAdjuntosTarea } from "./comun";

// Crear, editar, publicar, cerrar, archivar y eliminar tareas; destinatarios por sección y cambios de plazo (specs/39).

const bool = (defecto: boolean) => z.preprocess((v) => (v === undefined || v === null || v === "" ? defecto : v === true || v === "on" || v === "true"), z.boolean());
const opcional = <T extends z.ZodType>(t: T) => z.preprocess((v) => (v === "" || v === null ? undefined : v), t.optional());
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora no es válida.");

const esquemaSeccion = z.object({
  cursoId: z.uuid("Algún curso no es válido."),
  competenciaId: opcional(z.uuid()),
  todos: bool(true),
  alumnoIds: z.array(z.uuid("Algún alumno no es válido.")).max(200).optional(),
  /** Fecha propia de la sección (AAAA-MM-DD); vacía = la general. Usa la hora general. */
  fechaEntrega: opcional(z.iso.date("La fecha de la sección no es válida.")),
});

const esquemaEnlace = z.object({ url: z.string().max(2000), titulo: opcional(z.string().trim().max(120)) });

const esquemaContenido = z.object({
  materialesExistentes: z.array(z.object({ materialId: z.uuid(), versionId: z.uuid().optional() })).max(12).optional(),
  titulo: z.string().trim().min(3, "Escribe el título de la tarea.").max(150, "El título es muy largo (máximo 150 caracteres)."),
  descripcion: opcional(z.string().trim().max(MAX_INSTRUCCIONES, `Las instrucciones son muy largas (máximo ${MAX_INSTRUCCIONES} caracteres).`)),
  indicacionesEntrega: opcional(z.string().trim().max(1000)),
  fechaEntrega: opcional(z.iso.date("Elige una fecha de entrega válida.")),
  horaEntrega: opcional(hora),
  permiteTardias: bool(true),
  comentariosGenerales: bool(false),
  enlaces: z.array(esquemaEnlace).max(MAX_ENLACES_TAREA, `Puedes agregar hasta ${MAX_ENLACES_TAREA} enlaces.`).optional(),
});

const esquemaTarea = esquemaContenido.extend({
  cursoId: z.uuid("Elige el curso."),
  /** publicar (ahora) · programar (en `publicarEn`) · borrador. */
  accion: z.enum(["publicar", "programar", "borrador"]).default("publicar"),
  /** «AAAA-MM-DDTHH:mm» en la zona del colegio. */
  publicarEn: opcional(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Elige cuándo publicar.")),
  secciones: z.array(esquemaSeccion).max(12, "Elige como máximo 12 secciones.").optional(),
  calificable: bool(false),
  competenciaId: opcional(z.uuid()),
  avisarFamilias: bool(false),
});

type Seccion = z.infer<typeof esquemaSeccion>;

async function validarMaterialesExistentes(ctx: TenantContext, entradas: { materialId: string; versionId?: string }[] | undefined) {
  if (!entradas?.length) return [];
  requireFeature(ctx, "documentos");
  if (new Set(entradas.map((e) => e.materialId)).size !== entradas.length) throw new Error("Elegiste un material dos veces.");
  const materiales = await ctx.db.materialClase.findMany({ where: { id: { in: entradas.map((e) => e.materialId) }, creadoPorId: ctx.membership.id, eliminadoAt: null }, include: { versiones: { select: { id: true, numero: true } } } });
  if (materiales.length !== entradas.length) throw new Error("Algún material no está disponible.");
  return entradas.map((e) => {
    const m = materiales.find((x) => x.id === e.materialId)!;
    const version = m.versiones.find((v) => e.versionId ? v.id === e.versionId : v.numero === m.versionActual);
    if (!version) throw new Error("La versión del material no está disponible.");
    return { materialId: m.id, versionId: version.id };
  });
}

async function enlazarMateriales(ctx: TenantContext, tareaId: string, materiales: { materialId: string; versionId: string }[]) {
  if (materiales.length) await ctx.db.tareaMaterial.createMany({ data: materiales.map((m) => ({ tenantId: ctx.tenant.id, tareaId, ...m, creadoPorId: ctx.membership.id })) });
}

/** Fecha general + hora → instante guardado y límite efectivo; error si ya pasó. */
function plazoDe(ctx: TenantContext, fecha: string | undefined, horaEntrega: string | undefined, ahora: Date) {
  if (!fecha) return { instante: null, conHora: false, error: null as string | null };
  const conHora = !!horaEntrega;
  const instante = instanteDeEntrega(fecha, horaEntrega ?? null, ctx.tenant.zonaHoraria);
  const limite = limiteEfectivo(instante, conHora, ctx.tenant.zonaHoraria)!;
  return { instante, conHora, error: limite < ahora ? "La fecha de entrega ya pasó." : null };
}

/** Cursos «gemelos» del docente: mismo nombre de curso en otros salones que también dicta (para secciones adicionales). */
export async function cursosGemelos(ctx: TenantContext, cursoId: string) {
  requireFeature(ctx, "tareas");
  const cursos = await cursosDelDocente(ctx);
  const origen = cursos.find((c) => c.id === cursoId);
  if (!origen) return [];
  const nombre = origen.nombre.trim().toLocaleLowerCase("es");
  return cursos.filter((c) => c.id !== cursoId && c.nombre.trim().toLocaleLowerCase("es") === nombre);
}

/**
 * Valida las secciones: cada curso debe ser del docente y tener el mismo nombre que el de origen; cada alumno elegido
 * debe estar activo en el salón de su sección (y, por `ctx.db`, en este colegio). Devuelve las secciones normalizadas.
 */
async function validarSecciones(ctx: TenantContext, cursoId: string, entrada: Seccion[] | undefined): Promise<{ error: string } | { secciones: (Seccion & { salonId: string })[] }> {
  const lista = entrada && entrada.length > 0 ? [...entrada] : [{ cursoId, todos: true }];
  if (!lista.some((s) => s.cursoId === cursoId)) lista.unshift({ cursoId, todos: true });
  const ids = lista.map((s) => s.cursoId);
  if (new Set(ids).size !== ids.length) return { error: "Elegiste la misma sección dos veces." };
  const origen = await ctx.db.curso.findFirst({ where: { id: cursoId }, select: { nombre: true } });
  if (!origen) return { error: "No encontramos ese curso." };
  const cursos = await ctx.db.curso.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, salonId: true } });
  const salida: (Seccion & { salonId: string })[] = [];
  for (const s of lista) {
    const c = cursos.find((x) => x.id === s.cursoId);
    if (!c) return { error: "Alguna sección no es de este colegio." };
    await requireCursoDelProfesor(ctx, c.id);
    if (c.nombre.trim().toLocaleLowerCase("es") !== origen.nombre.trim().toLocaleLowerCase("es")) return { error: "Las secciones adicionales deben ser del mismo curso." };
    const alumnoIds = [...new Set(s.alumnoIds ?? [])];
    if (!s.todos) {
      if (alumnoIds.length === 0) return { error: "Elige al menos un estudiante en cada sección o marca «Todos»." };
      const validos = await ctx.db.alumno.count({ where: { id: { in: alumnoIds }, salonId: c.salonId, estado: "activo" } });
      if (validos !== alumnoIds.length) return { error: "Algún estudiante elegido no pertenece a ese salón." };
    }
    salida.push({ ...s, alumnoIds, salonId: c.salonId });
  }
  return { secciones: salida };
}

/** Vista previa de destinatarios antes de publicar: cuántos y quiénes por sección (no escribe nada). */
export async function vistaPreviaDestinatarios(ctx: TenantContext, entrada: { cursoId: string; secciones?: Seccion[] }) {
  requireFeature(ctx, "tareas");
  requireRol(ctx, ["profesor"]);
  await requireCursoDelProfesor(ctx, entrada.cursoId);
  const v = await validarSecciones(ctx, entrada.cursoId, entrada.secciones?.map((s) => esquemaSeccion.parse(s)));
  if ("error" in v) return { error: v.error, secciones: [], total: 0 };
  const secciones = [];
  for (const s of v.secciones) {
    const alumnos = await ctx.db.alumno.findMany({
      where: { salonId: s.salonId, estado: "activo", ...(s.todos ? {} : { id: { in: s.alumnoIds } }) },
      select: { id: true, nombres: true, apellidos: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    });
    secciones.push({ cursoId: s.cursoId, todos: s.todos, alumnos });
  }
  return { error: null, secciones, total: secciones.reduce((n, s) => n + s.alumnos.length, 0) };
}

/** Alumnos activos de los salones de los cursos dados (selector de destinatarios con búsqueda). */
export async function alumnosParaDestinatarios(ctx: TenantContext, cursoIds: string[]) {
  requireFeature(ctx, "tareas");
  requireRol(ctx, ["profesor"]);
  for (const id of cursoIds) await requireCursoDelProfesor(ctx, id);
  const cursos = await ctx.db.curso.findMany({ where: { id: { in: cursoIds } }, select: { id: true, salonId: true } });
  const alumnos = await ctx.db.alumno.findMany({
    where: { salonId: { in: cursos.map((c) => c.salonId) }, estado: "activo" },
    select: { id: true, nombres: true, apellidos: true, salonId: true },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });
  return cursos.map((c) => ({ cursoId: c.id, alumnos: alumnos.filter((a) => a.salonId === c.salonId).map((a) => ({ id: a.id, nombres: a.nombres, apellidos: a.apellidos })) }));
}

function enlacesValidos(enlaces: z.infer<typeof esquemaEnlace>[] | undefined): { error: string } | { lista: { url: string; titulo: string | null }[] } {
  const lista: { url: string; titulo: string | null }[] = [];
  for (const e of enlaces ?? []) {
    if (!e.url.trim()) continue;
    const url = normalizarEnlace(e.url);
    if (!url) return { error: "Algún enlace no es válido: debe empezar con http:// o https://." };
    lista.push({ url, titulo: e.titulo ?? null });
  }
  return { lista };
}

/**
 * Crea la evaluación (columna del registro) de cada sección de una tarea calificable, reutilizando `crearEvaluacion`
 * (specs/11) con `tareaId`: sin NSP. Solo si el colegio tiene Notas y hay un periodo abierto del nivel. Idempotente.
 */
async function crearEvaluacionesDeTarea(ctx: TenantContext, tareaId: string): Promise<string | null> {
  if (!tieneFeature(ctx, "notas")) return null;
  const t = await ctx.db.tarea.findFirst({ where: { id: tareaId }, include: { cursos: { include: { curso: { select: { salon: { select: { nivel: true } } } } } } } });
  if (!t?.calificable) return null;
  const hoy = momentoEnZona(new Date(), ctx.tenant.zonaHoraria).isoFecha;
  let sinPeriodo = 0;
  for (const s of t.cursos) {
    if (s.evaluacionGrupoId) continue;
    const plazo = s.fechaEntrega ?? t.fechaEntrega;
    const fecha = plazo ? momentoEnZona(plazo, ctx.tenant.zonaHoraria).isoFecha : hoy;
    const periodos = await ctx.db.periodo.findMany({ where: { niveles: { has: s.curso.salon.nivel }, cerrado: false } });
    const periodo = periodos.find((p) => p.inicio <= fechaDb(fecha) && fechaDb(fecha) <= p.fin) ?? periodoEnCurso(periodos);
    if (!periodo) {
      sinPeriodo++;
      continue;
    }
    const r = await crearEvaluacion(ctx, {
      cursoId: s.cursoId, periodoId: periodo.id, titulo: `Tarea: ${t.titulo}`.slice(0, 120), fecha, peso: 1,
      competenciaId: s.competenciaId ?? (s.cursoId === t.cursoId ? t.competenciaId ?? undefined : undefined),
    }, { tareaId });
    if (!r.ok) {
      sinPeriodo++;
      continue;
    }
    const e = await ctx.db.evaluacion.findFirst({ where: { tareaId, cursoId: s.cursoId }, select: { grupoId: true } });
    if (e) await ctx.db.tareaCurso.updateMany({ where: { id: s.id }, data: { evaluacionGrupoId: e.grupoId } });
  }
  return sinPeriodo > 0 ? " No pudimos crear la columna de calificación de alguna sección: revisa que haya un periodo abierto." : null;
}

/**
 * El profesor crea una tarea en un curso que dicta (y, si quiere, en sus secciones gemelas). Dirección solo consulta.
 * Acepta la forma anterior (`cursoId`, `titulo`, `descripcion`, `fechaEntrega`): publica ya, para todo el salón.
 */
export async function crearTarea(ctx: TenantContext, entrada: unknown, adjuntos: EntradaAdjunto[] = [], ahora = new Date()): Promise<Resultado & { tareaId?: string }> {
  requireFeature(ctx, "tareas");
  requireRol(ctx, ["profesor"]);
  const d = esquemaTarea.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const materiales = await validarMaterialesExistentes(ctx, d.data.materialesExistentes);
  await requireCursoDelProfesor(ctx, d.data.cursoId);
  const plazo = plazoDe(ctx, d.data.fechaEntrega, d.data.horaEntrega, ahora);
  if (plazo.error) return fallo(plazo.error);
  let publicarEn: Date | null = null;
  if (d.data.accion === "programar") {
    if (!d.data.publicarEn) return fallo("Elige cuándo publicar.");
    const [f, h] = d.data.publicarEn.split("T");
    publicarEn = instanteEnZona(f, h, ctx.tenant.zonaHoraria);
    if (publicarEn <= ahora) return fallo("La publicación programada debe ser en el futuro.");
  }
  const v = await validarSecciones(ctx, d.data.cursoId, d.data.secciones);
  if ("error" in v) return fallo(v.error);
  const enlaces = enlacesValidos(d.data.enlaces);
  if ("error" in enlaces) return fallo(enlaces.error);
  for (const s of v.secciones) {
    if (s.fechaEntrega && plazoDe(ctx, s.fechaEntrega, d.data.horaEntrega, ahora).error) return fallo("La fecha de alguna sección ya pasó.");
  }
  if (d.data.calificable && !d.data.competenciaId) return fallo("Elige una competencia para la tarea calificable.");
  if (d.data.competenciaId && (await ctx.db.competencia.count({ where: { id: d.data.competenciaId, cursoId: d.data.cursoId, desactivadaAt: null } })) === 0) {
    return fallo("Esa competencia no es de este curso.");
  }
  if (d.data.calificable) {
    for (const s of v.secciones) {
      const compId = s.competenciaId ?? (s.cursoId === d.data.cursoId ? d.data.competenciaId : undefined);
      if (!compId) return fallo("Elige una competencia para cada sección calificable.");
      if ((await ctx.db.competencia.count({ where: { id: compId, cursoId: s.cursoId, desactivadaAt: null } })) === 0) return fallo("Una competencia no pertenece a su sección o está desactivada.");
    }
  }
  let validados;
  try {
    validados = validarAdjuntosTarea(ctx, adjuntos);
  } catch (e) {
    return fallo(mensajeDe(e));
  }

  const borrador = d.data.accion === "borrador";
  const t = await ctx.db.tarea.create({
    data: {
      tenantId: ctx.tenant.id, cursoId: d.data.cursoId, titulo: d.data.titulo, descripcion: d.data.descripcion ?? null,
      indicacionesEntrega: d.data.indicacionesEntrega ?? null, fechaEntrega: plazo.instante, conHora: plazo.conHora,
      permiteTardias: d.data.permiteTardias, comentariosGenerales: d.data.comentariosGenerales, calificable: d.data.calificable,
      competenciaId: d.data.competenciaId ?? null, estado: borrador ? "borrador" : "publicada", publicarEn,
      publicadaAt: borrador ? null : (publicarEn ?? ahora),
      // Sin «avisar», la tarea nace como ya avisada: el cron no la notificará al llegar su hora.
      avisadaAt: d.data.avisarFamilias ? null : ahora,
      creadoPorId: ctx.membership.id,
    },
  });
  try {
    for (const s of v.secciones) {
      const tc = await ctx.db.tareaCurso.create({
        data: {
          tenantId: ctx.tenant.id, tareaId: t.id, cursoId: s.cursoId, todos: s.todos, competenciaId: s.competenciaId ?? (s.cursoId === d.data.cursoId ? d.data.competenciaId ?? null : null),
          fechaEntrega: s.fechaEntrega ? instanteDeEntrega(s.fechaEntrega, d.data.horaEntrega ?? null, ctx.tenant.zonaHoraria) : null,
        },
      });
      if (!s.todos) {
        await ctx.db.tareaAsignacion.createMany({ data: (s.alumnoIds ?? []).map((alumnoId) => ({ tenantId: ctx.tenant.id, tareaId: t.id, tareaCursoId: tc.id, alumnoId })), skipDuplicates: true });
      }
    }
    await sincronizarAsignaciones(ctx.db, ctx.tenant.id, t.id);
    if (enlaces.lista.length) await ctx.db.tareaEnlace.createMany({ data: enlaces.lista.map((e, orden) => ({ tenantId: ctx.tenant.id, tareaId: t.id, ...e, orden })) });
    await guardarAdjuntos(ctx, { tareaId: t.id }, validados);
    await enlazarMateriales(ctx, t.id, materiales);
  } catch (e) {
    await ctx.db.tarea.deleteMany({ where: { id: t.id } });
    throw e;
  }
  const avisoCalif = borrador ? null : await crearEvaluacionesDeTarea(ctx, t.id);
  const asignados = await ctx.db.tareaAsignacion.count({ where: { tareaId: t.id } });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "tarea", entidadId: t.id,
    detalle: { adjuntos: validados.length, secciones: v.secciones.length, destinatarios: asignados, estado: t.estado, programada: !!publicarEn },
  });
  if (!borrador && !publicarEn && d.data.avisarFamilias) await avisarTareaPublicada(ctx.db, ctx.tenant, t.id, ahora);
  const msg = borrador ? "Borrador guardado." : publicarEn ? "Tarea programada." : "Tarea creada.";
  return { ...ok(`${msg}${avisoCalif ?? ""}`), tareaId: t.id };
}

const esquemaEdicion = esquemaContenido.extend({ motivoPlazo: opcional(z.string().trim().max(300)) });

/**
 * El autor edita contenido, enlaces, adjuntos y plazo general. Si cambia el plazo, se registra en `tarea_cambios_plazo`,
 * se audita (antes/después), se recalcula «tarde» solo de asignaciones aún sin entregar y se avisa.
 */
export async function actualizarTarea(
  ctx: TenantContext, tareaId: string, entrada: unknown,
  adjuntos: { nuevos?: EntradaAdjunto[]; quitar?: string[] } = {}, ahora = new Date(),
): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  requireRol(ctx, ["profesor", "direccion"]);
  const d = esquemaEdicion.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const materiales = d.data.materialesExistentes ? await validarMaterialesExistentes(ctx, d.data.materialesExistentes) : null;
  const t = await requireTareaAutor(ctx, tareaId);
  const plazo = d.data.fechaEntrega ? plazoDe(ctx, d.data.fechaEntrega, d.data.horaEntrega, ahora) : { instante: null, conHora: false, error: null };
  const cambioPlazo = (plazo.instante?.getTime() ?? null) !== (t.fechaEntrega?.getTime() ?? null) || plazo.conHora !== t.conHora;
  // La fecha solo se valida si cambió: se puede corregir el texto de una tarea que ya venció.
  if (cambioPlazo && plazo.error) return fallo(plazo.error);
  const enlaces = d.data.enlaces ? enlacesValidos(d.data.enlaces) : null;
  if (enlaces && "error" in enlaces) return fallo(enlaces.error);
  const quitar = adjuntos.quitar ?? [];
  let validados;
  try {
    validados = validarAdjuntosTarea(ctx, adjuntos.nuevos ?? [], await contarRestantes(ctx, { tareaId }, quitar));
  } catch (e) {
    return fallo(mensajeDe(e));
  }
  await quitarAdjuntos(ctx, { tareaId }, quitar);
  await guardarAdjuntos(ctx, { tareaId }, validados);
  if (materiales) {
    await ctx.db.tareaMaterial.deleteMany({ where: { tareaId } });
    await enlazarMateriales(ctx, tareaId, materiales);
  }
  if (enlaces) {
    await ctx.db.tareaEnlace.deleteMany({ where: { tareaId } });
    if (enlaces.lista.length) await ctx.db.tareaEnlace.createMany({ data: enlaces.lista.map((e, orden) => ({ tenantId: ctx.tenant.id, tareaId, ...e, orden })) });
  }
  await ctx.db.tarea.updateMany({
    where: { id: tareaId },
    data: {
      titulo: d.data.titulo, descripcion: d.data.descripcion ?? null, indicacionesEntrega: d.data.indicacionesEntrega ?? null,
      permiteTardias: d.data.permiteTardias, comentariosGenerales: d.data.comentariosGenerales,
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "tarea", entidadId: tareaId });
  if (cambioPlazo) {
    const r = await cambiarPlazo(ctx, tareaId, { fechaEntrega: d.data.fechaEntrega, horaEntrega: d.data.horaEntrega, motivo: d.data.motivoPlazo }, ahora);
    if (!r.ok) return r;
  }
  return ok("Tarea actualizada.");
}

const esquemaPlazo = z.object({
  fechaEntrega: opcional(z.iso.date("Elige una fecha válida.")),
  horaEntrega: opcional(hora),
  /** Sección con fecha propia; vacío = plazo general. */
  tareaCursoId: opcional(z.uuid()),
  motivo: opcional(z.string().trim().max(300)),
});

/**
 * Cambia el plazo (general o de una sección). Historial inmutable + auditoría con antes/después. Las entregas ya
 * enviadas conservan su hora real y su condición; solo se recalcula `tarde` de las asignaciones sin entregar (siempre
 * false hasta que entreguen: `tarde` se fija al enviar con el plazo vigente en ese momento).
 */
export async function cambiarPlazo(ctx: TenantContext, tareaId: string, entrada: unknown, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const d = esquemaPlazo.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const t = await requireTareaAutor(ctx, tareaId);
  const plazo = plazoDe(ctx, d.data.fechaEntrega, d.data.horaEntrega, ahora);
  if (plazo.error) return fallo(plazo.error);
  let anterior: Date | null = t.fechaEntrega;
  if (d.data.tareaCursoId) {
    const s = await ctx.db.tareaCurso.findFirst({ where: { id: d.data.tareaCursoId, tareaId } });
    if (!s) return fallo("No encontramos esa sección.");
    anterior = s.fechaEntrega;
    await ctx.db.tareaCurso.updateMany({ where: { id: s.id }, data: { fechaEntrega: plazo.instante } });
  } else {
    await ctx.db.tarea.updateMany({ where: { id: tareaId }, data: { fechaEntrega: plazo.instante, conHora: plazo.conHora } });
  }
  const cambio = await ctx.db.tareaCambioPlazo.create({
    data: { tenantId: ctx.tenant.id, tareaId, tareaCursoId: d.data.tareaCursoId ?? null, anterior, nuevo: plazo.instante, motivo: d.data.motivo ?? null, cambiadoPorId: ctx.membership.id },
  });
  // Pendientes: sin entrega enviada, no son tardías (se decide al entregar con el plazo nuevo).
  await ctx.db.tareaAsignacion.updateMany({
    where: { tareaId, estado: { in: ["asignada", "en_proceso"] }, entregadaAt: null, ...(d.data.tareaCursoId ? { tareaCursoId: d.data.tareaCursoId } : {}) },
    data: { tarde: false },
  });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "tarea_plazo", entidadId: tareaId,
    detalle: { antes: anterior?.toISOString() ?? null, despues: plazo.instante?.toISOString() ?? null, seccion: d.data.tareaCursoId ?? null, motivo: d.data.motivo ?? null },
  });
  await avisarCambioPlazo(ctx, { tareaId, cambioId: cambio.id, tareaCursoId: d.data.tareaCursoId, nuevo: plazo.instante, conHora: plazo.conHora });
  return ok("Plazo actualizado.");
}

/** Publica un borrador (ahora o programado). */
export async function publicarTarea(ctx: TenantContext, tareaId: string, entrada: { publicarEn?: string; avisarFamilias?: boolean } = {}, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const t = await requireTareaAutor(ctx, tareaId);
  if (t.estado !== "borrador") return fallo("Esta tarea ya está publicada.");
  let publicarEn: Date | null = null;
  if (entrada.publicarEn) {
    const [f, h] = entrada.publicarEn.split("T");
    publicarEn = instanteEnZona(f, h, ctx.tenant.zonaHoraria);
    if (!(publicarEn > ahora)) return fallo("La publicación programada debe ser en el futuro.");
  }
  await sincronizarAsignaciones(ctx.db, ctx.tenant.id, tareaId);
  const r = await ctx.db.tarea.updateMany({
    where: { id: tareaId, estado: "borrador" },
    data: { estado: "publicada", publicarEn, publicadaAt: publicarEn ?? ahora, avisadaAt: entrada.avisarFamilias === false ? ahora : null },
  });
  if (r.count === 0) return fallo("Esta tarea ya está publicada.");
  const avisoCalif = await crearEvaluacionesDeTarea(ctx, tareaId);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "tarea_publicada", entidadId: tareaId, detalle: { programada: !!publicarEn } });
  if (!publicarEn && entrada.avisarFamilias !== false) await avisarTareaPublicada(ctx.db, ctx.tenant, tareaId, ahora);
  return ok(`${publicarEn ? "Tarea programada." : "Tarea publicada."}${avisoCalif ?? ""}`);
}

/** Cierra o reabre las entregas. Cerrada: nadie puede entregar ni anular; las entregas existentes se conservan. */
export async function cambiarCierreTarea(ctx: TenantContext, tareaId: string, cerrar: boolean, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  await requireTareaAutor(ctx, tareaId);
  const r = await ctx.db.tarea.updateMany({
    where: { id: tareaId, estado: cerrar ? "publicada" : "cerrada" },
    data: cerrar ? { estado: "cerrada", cerradaAt: ahora } : { estado: "publicada", cerradaAt: null },
  });
  if (r.count === 0) return fallo(cerrar ? "Solo se cierran tareas publicadas." : "Esta tarea no está cerrada.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: cerrar ? "tarea_cerrada" : "tarea_reabierta", entidadId: tareaId });
  return ok(cerrar ? "Entregas cerradas." : "Entregas reabiertas.");
}

/** Archiva la tarea: sale de las listas de familias y docentes; las entregas y notas se conservan. */
export async function archivarTarea(ctx: TenantContext, tareaId: string): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  await requireTareaAutor(ctx, tareaId);
  await ctx.db.tarea.updateMany({ where: { id: tareaId }, data: { estado: "archivada" } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "tarea_archivada", entidadId: tareaId });
  return ok("Tarea archivada.");
}

/** Elimina la tarea solo si nadie entregó (ni borradores con archivos). Dirección puede eliminar también. */
export async function eliminarTarea(ctx: TenantContext, tareaId: string): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  requireRol(ctx, ["profesor", "direccion"]);
  const t = await ctx.db.tarea.findFirst({ where: { id: tareaId } });
  if (!t) return fallo("No encontramos esa tarea.");
  if (ctx.rol === "profesor") await requireTareaAutor(ctx, tareaId);
  const entregas = await ctx.db.tareaEntrega.count({ where: { asignacion: { tareaId } } });
  if (entregas > 0) return fallo("Esta tarea ya tiene entregas: archívala en lugar de eliminarla.");
  if ((await ctx.db.evaluacion.count({ where: { tareaId, notas: { some: {} } } })) > 0) return fallo("Esta tarea ya tiene notas: archívala en lugar de eliminarla.");
  const archivos = await adjuntosDe(ctx, { tareaId });
  await ctx.db.evaluacion.deleteMany({ where: { tareaId, notas: { none: {} }, historial: { none: {} } } });
  await ctx.db.tarea.deleteMany({ where: { id: tareaId } }); // adjuntos, secciones y asignaciones se borran en cascada
  await borrarDelProveedor(archivos);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "tarea", entidadId: tareaId });
  return ok("Tarea eliminada.");
}

const esquemaDestinatarios = z.object({
  tareaCursoId: z.uuid(),
  todos: bool(false),
  agregar: z.array(z.uuid()).max(200).default([]),
  quitar: z.array(z.uuid()).max(200).default([]),
});

/**
 * Edita destinatarios de una sección: agregar = `createMany skipDuplicates` (o revivir a un retirado); quitar =
 * `retirada_at` (deja de verla, se conservan sus entregas). «Todos» sincroniza el salón completo.
 */
export async function editarDestinatarios(ctx: TenantContext, tareaId: string, entrada: unknown, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const d = esquemaDestinatarios.safeParse(entrada);
  if (!d.success) return fallo("Revisa los estudiantes elegidos.");
  await requireTareaAutor(ctx, tareaId);
  const s = await ctx.db.tareaCurso.findFirst({ where: { id: d.data.tareaCursoId, tareaId }, include: { curso: { select: { salonId: true } } } });
  if (!s) return fallo("No encontramos esa sección.");
  if (d.data.agregar.length) {
    const validos = await ctx.db.alumno.count({ where: { id: { in: d.data.agregar }, salonId: s.curso.salonId, estado: "activo" } });
    if (validos !== new Set(d.data.agregar).size) return fallo("Algún estudiante elegido no pertenece a ese salón.");
    await ctx.db.tareaAsignacion.createMany({ data: d.data.agregar.map((alumnoId) => ({ tenantId: ctx.tenant.id, tareaId, tareaCursoId: s.id, alumnoId })), skipDuplicates: true });
    await ctx.db.tareaAsignacion.updateMany({ where: { tareaId, tareaCursoId: s.id, alumnoId: { in: d.data.agregar } }, data: { retiradaAt: null } });
  }
  if (d.data.quitar.length) {
    await ctx.db.tareaAsignacion.updateMany({ where: { tareaId, tareaCursoId: s.id, alumnoId: { in: d.data.quitar }, retiradaAt: null }, data: { retiradaAt: ahora } });
  }
  if (d.data.todos !== s.todos) await ctx.db.tareaCurso.updateMany({ where: { id: s.id }, data: { todos: d.data.todos } });
  if (d.data.todos) await sincronizarAsignaciones(ctx.db, ctx.tenant.id, tareaId);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "tarea_destinatarios", entidadId: tareaId, detalle: { seccion: s.id, agregados: d.data.agregar.length, quitados: d.data.quitar.length, todos: d.data.todos } });
  return ok("Destinatarios actualizados.");
}

/** Cursos donde el usuario puede crear tareas (para el formulario). */
export async function cursosParaTareas(ctx: TenantContext) {
  requireFeature(ctx, "tareas");
  return cursosDelDocente(ctx);
}
