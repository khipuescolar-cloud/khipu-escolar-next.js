import "server-only";
import { z } from "zod";
import type { AdjuntoVista } from "@/lib/adjuntos";
import { MAX_DIAS_RANGO, diasNoLectivos, fechasEntre, proyectarClases, type FiltroAgenda } from "@/lib/agenda-calendario";
import { fechaLima, instanteLima, momentoEnZona } from "@/lib/fechas";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { adjuntoVista } from "./adjuntos";
import { auditar } from "./auditoria";
import { buscarBloques, wherePorProfesor } from "./horario";
import { feriadosAplicables } from "./plataforma-configuracion";
import { requireFeature, tieneFeature } from "./plan";
import { salonEsActivo, whereSalonActivo } from "./salones-activos";
import { tareasVisiblesParaAgenda } from "./tareas";
import { requireRol, salonIdsVisibles, type TenantContext } from "./tenant";

export type CategoriaAgenda = "clase" | "mi-reunion" | "personal" | "academico" | "institucional" | "salon";

export type ItemAgenda = {
  id: string;
  tipo: "evento" | "reunion" | "examen" | "feriado" | "actividad" | "entrega" | "clase";
  /** Para los filtros del calendario (specs/12): clase, mi-reunion, personal, academico (evaluaciones y entregas),
   * institucional (EventoAgenda sin salón) o salon (EventoAgenda de un salón). */
  categoria: CategoriaAgenda;
  /** Salón del ítem (null si es de todo el colegio o una reunión sin salón). */
  salonId: string | null;
  titulo: string;
  descripcion: string | null;
  inicio: Date;
  /** Fin (reuniones, eventos que lo tienen y clases); null si no se indicó. */
  fin: Date | null;
  /** Lugar de la reunión. */
  lugar?: string | null;
  /** Nombre del salón; «Todo el colegio» si es general; el curso para las entregas. */
  ambito: string;
  /** Solo eventos: el usuario puede borrarlos. */
  eliminable: boolean;
  /** Adjuntos de la tarea (solo entregas) y solo si el usuario puede descargarlos: misma regla que `/archivos/<id>`. */
  adjuntos: AdjuntoVista[];
  /** Ruta dentro del colegio con más detalle (reuniones: `/reuniones/<id>`). */
  href?: string;
  /** Sin hora (evaluaciones: solo tienen fecha). */
  sinHora?: boolean;
  /** Estado de la reunión tal como viene de la BD (estados nuevos se tratan de forma genérica). */
  estado?: string;
  /** Solo clases: curso (null en bloques sin curso), salón y aula. */
  cursoId?: string | null;
  salonNombre?: string;
  aula?: string | null;
};

export type OpcionesAgenda = {
  desde: Date;
  /** Excluido. */
  hasta: Date;
  filtros?: { filtro?: FiltroAgenda; salonId?: string };
  /** Proyecta las clases del horario del profesor (rango máximo: MAX_DIAS_RANGO días). */
  incluirClases?: boolean;
};

const MS_DIA = 86_400_000;

/**
 * Lo visible para el usuario entre dos instantes (`hasta` excluido): eventos, entregas de tareas, evaluaciones, reuniones
 * y, con `incluirClases`, las clases del profesor proyectadas desde su horario semanal (specs/12 «Calendario»).
 * Acepta `(ctx, desde, hasta)` o `(ctx, { desde, hasta, filtros, incluirClases })`. Una consulta por fuente.
 */
export async function itemsDeAgenda(ctx: TenantContext, desdeUOpciones: Date | OpcionesAgenda, hastaPosicional?: Date): Promise<ItemAgenda[]> {
  requireFeature(ctx, "agenda");
  requireRol(ctx, ["direccion", "profesor", "apoderado", "administrativo", "alumno"]);
  const op: OpcionesAgenda = desdeUOpciones instanceof Date ? { desde: desdeUOpciones, hasta: hastaPosicional ?? desdeUOpciones } : desdeUOpciones;
  const { desde, hasta } = op;
  const filtro = op.filtros?.filtro ?? "todo";
  if (op.incluirClases && hasta.getTime() - desde.getTime() > (MAX_DIAS_RANGO + 1) * MS_DIA) {
    throw new Error(`El calendario con clases muestra a lo más ${MAX_DIAS_RANGO} días.`);
  }
  const visibles = await salonIdsVisibles(ctx);
  // Curso/sección: solo un salón visible; si no lo es, no hay nada que mostrar.
  const salonFiltro = op.filtros?.salonId;
  if (salonFiltro && !visibles.includes(salonFiltro)) return [];
  const salonIds = salonFiltro ? [salonFiltro] : visibles;
  const rango = { gte: desde, lt: hasta };
  const quiere = (c: FiltroAgenda) => filtro === "todo" || filtro === c;
  const esPersonalAdmin = ctx.rol === "direccion" || ctx.rol === "administrativo";

  // Reuniones (specs/32): dirección ve todas en «Todo»; el resto, las que convocó o donde la invitan. «Personal»: todas
  // las del colegio, solo dirección y administrativo.
  const verReuniones = tieneFeature(ctx, "reuniones") && ["direccion", "profesor", "apoderado", "administrativo"].includes(ctx.rol);
  const alcanceReuniones: "mias" | "todas" | null = !verReuniones ? null
    : filtro === "personal" ? (esPersonalAdmin ? "todas" : null)
      : filtro === "mis-reuniones" ? "mias"
        : filtro === "todo" ? (ctx.rol === "direccion" ? "todas" : "mias") : null;
  const verEvaluaciones = tieneFeature(ctx, "notas") && quiere("academico");
  const verEntregas = quiere("academico");
  const verClases = !!op.incluirClases && filtro === "todo" && ctx.rol === "profesor" && tieneFeature(ctx, "horario");
  const verEventos = filtro === "todo" || filtro === "institucional" || verClases;
  const zona = ctx.tenant.zonaHoraria;
  const fechaDesde = momentoEnZona(desde, zona).isoFecha;
  const fechaHasta = momentoEnZona(new Date(hasta.getTime() - 1), zona).isoFecha;

  const [eventos, tareas, reuniones, evaluaciones, clases] = await Promise.all([
    verEventos
      ? ctx.db.eventoAgenda.findMany({
          where: { inicio: rango, OR: [{ salonId: null }, { salonId: { in: visibles } }] },
          include: { salon: { select: { nombre: true } } },
        })
      : Promise.resolve([]),
    verEntregas ? entregasDeTareas(ctx, rango, salonIds) : Promise.resolve([]),
    alcanceReuniones ? reunionesDeAgenda(ctx, rango, alcanceReuniones, salonFiltro) : Promise.resolve([]),
    verEvaluaciones ? evaluacionesDeAgenda(ctx, desde, hasta, salonIds) : Promise.resolve([]),
    verClases ? bloquesDelProfesor(ctx, salonFiltro) : Promise.resolve([]),
  ]);

  const items: ItemAgenda[] = [...reuniones, ...evaluaciones, ...tareas];
  for (const e of eventos) {
    const categoria: CategoriaAgenda = e.salonId ? "salon" : "institucional";
    if (filtro === "institucional" && categoria !== "institucional") continue;
    if (filtro !== "todo" && filtro !== "institucional") continue; // solo se consultaron para los feriados de las clases
    if (salonFiltro && e.salonId !== salonFiltro) continue;
    items.push({
      id: e.id, tipo: e.tipo, categoria, salonId: e.salonId, titulo: e.titulo, descripcion: e.descripcion, inicio: e.inicio, fin: e.fin,
      ambito: e.salon?.nombre ?? "Todo el colegio",
      eliminable: ctx.rol === "direccion" || ((ctx.rol === "profesor" || ctx.rol === "administrativo") && e.creadoPorId === ctx.membership.id),
      adjuntos: [],
    });
  }
  if (verClases && clases.length > 0) {
    // Sin clases en feriados nacionales, los extra de la plataforma (región o colegio) y los «Feriado» de todo el colegio.
    const fechas = fechasEntre(fechaDesde, fechaHasta);
    const feriadosColegio = eventos.filter((e) => e.tipo === "feriado" && !e.salonId).map((e) => momentoEnZona(e.inicio, zona).isoFecha);
    const noLectivos = diasNoLectivos(fechas, [...(await feriadosAplicables(ctx.tenant.id, fechaDesde, fechaHasta)), ...feriadosColegio]);
    for (const c of proyectarClases(clases, fechas, noLectivos, zona)) {
      if (c.inicio < desde || c.inicio >= hasta) continue;
      const b = c.bloque;
      items.push({
        id: c.id, tipo: "clase", categoria: "clase", salonId: b.salonId, titulo: b.titulo, descripcion: null, inicio: c.inicio, fin: c.fin,
        ambito: b.salonNombre, lugar: b.aula, eliminable: false, adjuntos: [], cursoId: b.cursoId, salonNombre: b.salonNombre, aula: b.aula,
      });
    }
  }
  return items.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

/** Clases del profesor (bloques de su horario semanal), opcionalmente de un salón. */
async function bloquesDelProfesor(ctx: TenantContext, salonId?: string) {
  const where = wherePorProfesor(ctx.membership.id);
  return buscarBloques(ctx, salonId ? { AND: [where, { salonId }] } : where);
}

/**
 * Reuniones de la agenda (specs/32), en un solo lugar para integrar `reunionesParaCalendario` más adelante. «mias»: las
 * que el usuario convocó o donde está invitado; «todas»: las del colegio (dirección y administrativo). Las canceladas no
 * se muestran. De las ajenas de alcance individual, el administrativo ve solo que hay una reunión (sin título ni detalle).
 */
async function reunionesDeAgenda(ctx: TenantContext, rango: { gte: Date; lt: Date }, alcance: "mias" | "todas", salonId?: string): Promise<ItemAgenda[]> {
  const yo = ctx.membership.id;
  const propias = ctx.rol === "apoderado" ? [{ invitados: { some: { membershipId: yo } } }] : [{ convocadaPorId: yo }, { invitados: { some: { membershipId: yo } } }];
  const filas = await ctx.db.reunion.findMany({
    where: {
      inicio: rango,
      estado: { not: "cancelada" },
      ...(salonId ? { salonId } : {}),
      ...(alcance === "mias" ? { OR: propias } : {}),
    },
    include: { salon: { select: { nombre: true } }, invitados: { where: { membershipId: yo }, select: { id: true } } },
  });
  return filas.map((r) => {
    const mia = r.convocadaPorId === yo || r.invitados.length > 0;
    const reservada = !mia && ctx.rol !== "direccion" && r.alcance === "individual";
    // Enlace al detalle solo si `/reuniones/<id>` se lo va a mostrar: dirección, quien convocó y la familia invitada.
    const conDetalle = ctx.rol === "direccion" || r.convocadaPorId === yo || (ctx.rol === "apoderado" && mia);
    return {
      id: r.id, tipo: "reunion" as const, categoria: mia ? ("mi-reunion" as const) : ("personal" as const), salonId: r.salonId,
      titulo: reservada ? "Reunión individual" : r.titulo, descripcion: reservada ? null : r.descripcion,
      inicio: r.inicio, fin: r.fin, lugar: r.lugar, estado: String(r.estado),
      ambito: r.alcance === "colegio" ? "Todo el colegio" : r.alcance === "individual" ? "Reunión individual" : (r.salon?.nombre ?? "Reunión"),
      eliminable: false, adjuntos: [], href: conDetalle ? `/reuniones/${r.id}` : undefined,
    };
  });
}

/** Evaluaciones de Notas (specs/11): una por evaluación aunque tenga varias columnas (competencias). Solo tienen fecha. */
async function evaluacionesDeAgenda(ctx: TenantContext, desde: Date, hasta: Date, salonIds: string[]): Promise<ItemAgenda[]> {
  const diaDesde = new Date(`${fechaLima(desde)}T00:00:00.000Z`);
  const diaHasta = new Date(`${fechaLima(new Date(hasta.getTime() - 1))}T00:00:00.000Z`);
  const filas = await ctx.db.evaluacion.findMany({
    where: { fecha: { gte: diaDesde, lte: diaHasta }, curso: { salonId: { in: salonIds } } },
    distinct: ["grupoId"],
    select: { grupoId: true, titulo: true, descripcion: true, fecha: true, curso: { select: { nombre: true, salonId: true, salon: { select: { nombre: true } } } } },
  });
  return filas
    .map((e) => ({
      id: e.grupoId, tipo: "examen" as const, categoria: "academico" as const, salonId: e.curso.salonId, titulo: `Evaluación: ${e.titulo}`, descripcion: e.descripcion,
      inicio: instanteLima(e.fecha.toISOString().slice(0, 10), "00:00"), fin: null,
      ambito: `${e.curso.nombre} · ${e.curso.salon.nombre}`, eliminable: false, adjuntos: [], href: "/notas", sinHora: true,
    }))
    .filter((e) => e.inicio >= desde && e.inicio < hasta);
}

/**
 * Entregas de tareas de la agenda, en un solo lugar para integrar `tareasVisiblesParaAgenda` más adelante. Solo las que
 * tienen fecha de entrega.
 */
async function entregasDeTareas(ctx: TenantContext, rango: { gte: Date; lt: Date }, salonIds: string[]): Promise<ItemAgenda[]> {
  // Tareas (specs/39): la visibilidad vive en el módulo de tareas (asignaciones vigentes; sin fecha → no aparece).
  const permitidos = new Set(salonIds);
  const tareas = await tareasVisiblesParaAgenda(ctx, rango.gte, rango.lt);
  const familia = ctx.rol === "apoderado" || ctx.rol === "alumno";
  return tareas
    .filter((t) => familia || permitidos.has(t.salonId))
    .map((t) => ({
      id: t.id, tipo: "entrega" as const, categoria: "academico" as const, salonId: t.salonId, titulo: `Entrega: ${t.titulo}`, descripcion: t.descripcion,
      inicio: t.inicio, fin: null,
      ambito: `${t.curso} · ${t.salon}`, eliminable: false, adjuntos: t.adjuntos,
      href: familia ? `/tareas/${t.id.split(":")[0]}` : "/tareas",
    }));
}

/** Salones del filtro «Curso/sección» del calendario: los visibles para el usuario y no archivados. */
export async function salonesParaFiltro(ctx: TenantContext) {
  requireFeature(ctx, "agenda");
  const ids = await salonIdsVisibles(ctx);
  if (ids.length === 0) return [];
  return ctx.db.salon.findMany({ where: { id: { in: ids }, ...whereSalonActivo }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });
}

/** Salones donde el usuario puede crear eventos (dirección: todos; profesor: los suyos). */
export async function salonesParaEventos(ctx: TenantContext) {
  requireFeature(ctx, "agenda");
  requireRol(ctx, ["direccion", "profesor", "administrativo"]);
  if (ctx.rol === "administrativo") return []; // solo eventos de todo el colegio
  const ids = await salonIdsVisibles(ctx);
  return ctx.db.salon.findMany({ where: { id: { in: ids }, ...whereSalonActivo }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });
}

const esquemaEvento = z.object({
  titulo: z.string().trim().min(3, "Escribe el título del evento.").max(150),
  descripcion: z.string().trim().max(1000).optional(),
  tipo: z.enum(["evento", "reunion", "examen", "feriado", "actividad"]),
  fecha: z.iso.date("Elige la fecha."),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Elige una hora válida.").optional().or(z.literal("").transform(() => undefined)),
  salonId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
});

/** Dirección crea eventos del colegio o de cualquier salón; el profesor, solo de sus salones. */
export async function crearEvento(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "agenda");
  requireRol(ctx, ["direccion", "profesor", "administrativo"]);
  const d = esquemaEvento.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const { salonId } = d.data;
  if (ctx.rol === "profesor") {
    if (!salonId) return fallo("Elige el salón del evento.");
    if (!(await salonIdsVisibles(ctx)).includes(salonId) || !(await salonEsActivo(ctx, salonId))) return fallo("Solo puedes crear eventos de tus salones.");
  } else if (ctx.rol === "administrativo") {
    if (salonId) return fallo("El personal administrativo crea eventos de todo el colegio.");
  } else if (salonId && !(await salonEsActivo(ctx, salonId))) {
    return fallo("No encontramos ese salón.");
  }
  const e = await ctx.db.eventoAgenda.create({
    data: {
      tenantId: ctx.tenant.id, salonId: salonId ?? null, titulo: d.data.titulo, descripcion: d.data.descripcion || null,
      tipo: d.data.tipo, inicio: instanteLima(d.data.fecha, d.data.hora ?? "08:00"), creadoPorId: ctx.membership.id,
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "evento_agenda", entidadId: e.id });
  return ok("Evento creado.");
}

export async function eliminarEvento(ctx: TenantContext, eventoId: string): Promise<Resultado> {
  requireFeature(ctx, "agenda");
  requireRol(ctx, ["direccion", "profesor", "administrativo"]);
  const e = await ctx.db.eventoAgenda.findFirst({ where: { id: eventoId } });
  if (!e) return fallo("No encontramos ese evento.");
  if (ctx.rol !== "direccion" && e.creadoPorId !== ctx.membership.id) return fallo("Solo puedes borrar los eventos que creaste.");
  await ctx.db.eventoAgenda.deleteMany({ where: { id: eventoId } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "evento_agenda", entidadId: eventoId });
  return ok("Evento eliminado.");
}

const esquemaEdicionEvento = esquemaEvento.omit({ salonId: true });

/** Dirección edita cualquier evento; el profesor, solo los que creó en sus salones. No cambia el salón. */
export async function actualizarEvento(ctx: TenantContext, eventoId: string, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "agenda");
  requireRol(ctx, ["direccion", "profesor", "administrativo"]);
  const d = esquemaEdicionEvento.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const e = await ctx.db.eventoAgenda.findFirst({ where: { id: eventoId } });
  if (!e) return fallo("No encontramos ese evento.");
  if (ctx.rol !== "direccion" && e.creadoPorId !== ctx.membership.id) return fallo("Solo puedes editar los eventos que creaste.");
  await ctx.db.eventoAgenda.updateMany({
    where: { id: eventoId },
    data: {
      titulo: d.data.titulo, descripcion: d.data.descripcion || null, tipo: d.data.tipo,
      inicio: instanteLima(d.data.fecha, d.data.hora ?? "08:00"),
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "evento_agenda", entidadId: eventoId });
  return ok("Evento actualizado.");
}
