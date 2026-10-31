import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { Nivel, TipoHoraHorario } from "@/generated/prisma/enums";
import { asistenciaPorCursoActiva } from "@/lib/asistencia-por-curso";
import { instanteLima, momentoEnZona, sumarDias } from "@/lib/fechas";
import {
  PERIODOS_SUGERIDOS, ahoraYDespues, buscarCruce, crucesDe, diaDeSemana, esDiaHorario, mensajeCruce, minutos, ordenarPorHora, validarPeriodos,
  type DiaHorario, type OcupacionProfesor,
} from "@/lib/horario";
import { eventoDeSemana, fechasDeLaSemana, type EventoSemana } from "@/lib/horario-calendario";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { itemsDeAgenda } from "./agenda";
import { auditar } from "./auditoria";
import { requireFeature, tieneFeature } from "./plan";
import { salonesActivos, whereSalonActivo } from "./salones-activos";
import { alumnoDeLaCuenta, requireRol, salonIdsVisibles, type TenantContext } from "./tenant";

// Horario semanal por salón (specs/34). Dirección arma el horario y las horas del día; profesor, alumno y familia
// solo lo consultan. Todo el control de acceso es de servidor.

const ROLES = ["direccion", "profesor", "apoderado", "alumno"] as const;
const NIVELES = ["inicial", "primaria", "secundaria", "academia"] as const;

function entrar(ctx: TenantContext) {
  requireFeature(ctx, "horario");
  requireRol(ctx, [...ROLES]);
}

function entrarDireccion(ctx: TenantContext) {
  requireFeature(ctx, "horario");
  requireRol(ctx, ["direccion"]);
}

export type PeriodoVista = { id: string; nombre: string; horaInicio: string; horaFin: string; tipo: TipoHoraHorario };

export type BloqueVista = {
  id: string;
  dia: DiaHorario;
  periodoId: string;
  horaInicio: string;
  horaFin: string;
  /** Curso del salón, o null en bloques sin curso («Tutoría»). */
  cursoId: string | null;
  /** Nombre del curso o título del bloque. */
  titulo: string;
  profesorId: string | null;
  profesorNombre: string | null;
  aula: string | null;
  salonId: string;
  salonNombre: string;
  nivel: Nivel;
};

const nombrePersona = (u: { nombres: string; apellidos: string }) => `${u.nombres} ${u.apellidos}`.trim();

const SELECT_BLOQUE = {
  id: true, dia: true, periodoId: true, cursoId: true, titulo: true, profesorId: true, aula: true, salonId: true,
  periodo: { select: { horaInicio: true, horaFin: true } },
  salon: { select: { nombre: true, nivel: true } },
  curso: { select: { nombre: true, profesorId: true, profesor: { select: { user: { select: { nombres: true, apellidos: true } } } } } },
  profesor: { select: { user: { select: { nombres: true, apellidos: true } } } },
} satisfies Prisma.BloqueHorarioSelect;

type FilaBloque = Prisma.BloqueHorarioGetPayload<{ select: typeof SELECT_BLOQUE }>;

function aVista(b: FilaBloque): BloqueVista {
  const profesor = b.curso ? b.curso.profesor : b.profesor;
  return {
    id: b.id,
    dia: b.dia as DiaHorario,
    periodoId: b.periodoId,
    horaInicio: b.periodo.horaInicio,
    horaFin: b.periodo.horaFin,
    cursoId: b.cursoId,
    titulo: b.curso?.nombre ?? b.titulo ?? "Bloque",
    profesorId: b.curso ? b.curso.profesorId : b.profesorId,
    profesorNombre: profesor ? nombrePersona(profesor.user) : null,
    aula: b.aula,
    salonId: b.salonId,
    salonNombre: b.salon.nombre,
    nivel: b.salon.nivel,
  };
}

// Inferir el tipo desde el cliente extendido con un select anidado hace que TypeScript se pierda (ver salones-activos.ts).
async function buscarBloques(ctx: TenantContext, where: Prisma.BloqueHorarioWhereInput): Promise<BloqueVista[]> {
  const consulta: Prisma.BloqueHorarioFindManyArgs = { where, select: SELECT_BLOQUE };
  const filas = (await ctx.db.bloqueHorario.findMany(consulta)) as unknown as FilaBloque[];
  return filas.map(aVista).sort((a, b) => a.dia - b.dia || minutos(a.horaInicio) - minutos(b.horaInicio) || a.salonNombre.localeCompare(b.salonNombre));
}

/** Bloques donde está el profesor: los de sus cursos y los bloques sin curso a su cargo (solo salones no archivados). */
function wherePorProfesor(profesorId: string): Prisma.BloqueHorarioWhereInput {
  return { salon: whereSalonActivo, OR: [{ curso: { profesorId } }, { cursoId: null, profesorId }] };
}

function aOcupacion(b: BloqueVista): OcupacionProfesor {
  return { id: b.id, profesorId: b.profesorId!, dia: b.dia, salonId: b.salonId, salonNombre: b.salonNombre, titulo: b.titulo, horaInicio: b.horaInicio, horaFin: b.horaFin };
}

// ───────────── Horas del día ─────────────

export async function periodosDelNivel(ctx: TenantContext, nivel: Nivel): Promise<PeriodoVista[]> {
  requireFeature(ctx, "horario");
  const filas = await ctx.db.horarioPeriodo.findMany({ where: { nivel }, select: { id: true, nombre: true, horaInicio: true, horaFin: true, tipo: true } });
  return ordenarPorHora(filas);
}

/** Crea las horas sugeridas del nivel (solo si aún no tiene ninguna). */
export async function crearPeriodosSugeridos(ctx: TenantContext, nivel: string): Promise<Resultado> {
  entrarDireccion(ctx);
  const n = z.enum(NIVELES).safeParse(nivel);
  if (!n.success) return fallo("Elige un nivel válido.");
  if ((await ctx.db.horarioPeriodo.count({ where: { nivel: n.data } })) > 0) return fallo("Este nivel ya tiene sus horas del día.");
  await ctx.db.horarioPeriodo.createMany({ data: PERIODOS_SUGERIDOS[n.data].map((p) => ({ ...p, nivel: n.data, tenantId: ctx.tenant.id })) });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "horario_periodos", detalle: { nivel: n.data, sugeridas: true } });
  return ok("Listo: usamos las horas sugeridas. Puedes ajustarlas cuando quieras.");
}

const esquemaPeriodo = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  nombre: z.string().trim().max(40, "El nombre de cada hora puede tener hasta 40 letras."),
  horaInicio: z.string().trim(),
  horaFin: z.string().trim(),
  tipo: z.enum(["clase", "recreo"]),
});

/**
 * Reemplaza las horas del día de un nivel: actualiza las que siguen, crea las nuevas y borra las quitadas
 * (con sus casilleros). Una hora que pasa a «Recreo» pierde sus casilleros. Avisa si el cambio dejó cruces de profesores.
 */
export async function guardarPeriodos(ctx: TenantContext, nivel: string, entrada: unknown): Promise<Resultado> {
  entrarDireccion(ctx);
  const n = z.enum(NIVELES).safeParse(nivel);
  if (!n.success) return fallo("Elige un nivel válido.");
  const lista = z.array(esquemaPeriodo).safeParse(entrada);
  if (!lista.success) return fallo(lista.error.issues[0].message);
  const error = validarPeriodos(lista.data);
  if (error) return fallo(error);

  const existentes = await ctx.db.horarioPeriodo.findMany({ where: { nivel: n.data }, select: { id: true } });
  const idsExistentes = new Set(existentes.map((p) => p.id));
  if (lista.data.some((p) => p.id && !idsExistentes.has(p.id))) return fallo("Una de las horas ya no existe. Recarga la página.");
  const quedan = new Set(lista.data.flatMap((p) => (p.id ? [p.id] : [])));
  const borrar = [...idsExistentes].filter((id) => !quedan.has(id));
  const aRecreo = lista.data.filter((p) => p.id && p.tipo === "recreo").map((p) => p.id!);
  const casillerosPerdidos = await ctx.db.bloqueHorario.count({ where: { periodoId: { in: [...borrar, ...aRecreo] } } });

  await ctx.db.$transaction([
    ctx.db.bloqueHorario.deleteMany({ where: { periodoId: { in: [...borrar, ...aRecreo] } } }),
    ctx.db.horarioPeriodo.deleteMany({ where: { id: { in: borrar } } }),
    ...lista.data.map((p) =>
      p.id
        ? ctx.db.horarioPeriodo.updateMany({ where: { id: p.id }, data: { nombre: p.nombre, horaInicio: p.horaInicio, horaFin: p.horaFin, tipo: p.tipo } })
        : ctx.db.horarioPeriodo.create({ data: { tenantId: ctx.tenant.id, nivel: n.data, nombre: p.nombre, horaInicio: p.horaInicio, horaFin: p.horaFin, tipo: p.tipo } }),
    ),
  ]);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "horario_periodos", detalle: { nivel: n.data, horas: lista.data.length, casillerosBorrados: casillerosPerdidos } });

  // Cambiar horas puede hacer que dos clases del mismo profesor (en niveles distintos) ahora se crucen.
  const cruces = await contarCruces(ctx);
  const partes = ["Guardamos las horas del día."];
  if (casillerosPerdidos > 0) partes.push(casillerosPerdidos === 1 ? "Se vació 1 casillero del horario." : `Se vaciaron ${casillerosPerdidos} casilleros del horario.`);
  if (cruces > 0) partes.push(`Ojo: hay ${cruces === 1 ? "1 cruce" : `${cruces} cruces`} de profesores; revísalos en «Carga de profesores».`);
  return ok(partes.join(" "));
}

// ───────────── Horario de un salón ─────────────

/** Salones para elegir: dirección todos (activos); los demás roles, los que ven. */
export async function salonesParaHorario(ctx: TenantContext) {
  entrar(ctx);
  const extra: Prisma.SalonWhereInput = ctx.rol === "direccion" ? {} : { id: { in: await salonIdsVisibles(ctx) } };
  return salonesActivos(ctx, { id: true, nombre: true, nivel: true, grado: true }, extra);
}

/** Horario semanal de un salón con las horas de su nivel. Dirección ve todos; el resto, solo los salones que ve. */
export async function horarioDelSalon(ctx: TenantContext, salonId: string) {
  entrar(ctx);
  if (!z.uuid().safeParse(salonId).success) notFound();
  if (ctx.rol !== "direccion" && !(await salonIdsVisibles(ctx)).includes(salonId)) forbidden();
  const salon = await ctx.db.salon.findFirst({
    where: { id: salonId, ...whereSalonActivo },
    select: {
      id: true, nombre: true, nivel: true, grado: true, tutorId: true,
      tutor: { select: { user: { select: { nombres: true, apellidos: true } } } },
    },
  });
  if (!salon) notFound();
  const [periodos, bloques] = await Promise.all([periodosDelNivel(ctx, salon.nivel), buscarBloques(ctx, { salonId })]);
  return { salon: { id: salon.id, nombre: salon.nombre, nivel: salon.nivel, grado: salon.grado, tutorId: salon.tutorId, tutorNombre: salon.tutor ? nombrePersona(salon.tutor.user) : null }, periodos, bloques };
}

/** Opciones para llenar un casillero: cursos del salón (con su profesor), profesores del colegio y salones del mismo grado. */
export async function opcionesDeCasillero(ctx: TenantContext, salonId: string) {
  entrarDireccion(ctx);
  const salon = await ctx.db.salon.findFirst({ where: { id: salonId, ...whereSalonActivo }, select: { id: true, nivel: true, grado: true } });
  if (!salon) notFound();
  const [cursos, profesores, mismoGrado] = await Promise.all([
    ctx.db.curso.findMany({
      where: { salonId },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, profesor: { select: { user: { select: { nombres: true, apellidos: true } } } } },
    }),
    profesoresDelColegio(ctx),
    salon.grado === null ? Promise.resolve([]) : salonesActivos(ctx, { id: true, nombre: true }, { nivel: salon.nivel, grado: salon.grado, id: { not: salon.id } }),
  ]);
  return {
    cursos: cursos.map((c) => ({ id: c.id, nombre: c.nombre, profesorNombre: c.profesor ? nombrePersona(c.profesor.user) : null })),
    profesores,
    mismoGrado,
  };
}

export async function profesoresDelColegio(ctx: TenantContext): Promise<{ id: string; nombre: string }[]> {
  requireFeature(ctx, "horario");
  const filas = await ctx.db.membership.findMany({
    where: { rol: "profesor", estado: "activa" },
    select: { id: true, user: { select: { nombres: true, apellidos: true } } },
  });
  return filas.map((m) => ({ id: m.id, nombre: nombrePersona(m.user) })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

const opcional = (max: number, mensaje: string) => z.string().trim().max(max, mensaje).optional().or(z.literal("").transform(() => undefined));

const esquemaCasillero = z.object({
  salonId: z.uuid("Elige el salón."),
  dia: z.coerce.number().int().refine(esDiaHorario, "Elige un día de lunes a viernes."),
  periodoId: z.uuid("Elige la hora."),
});

const esquemaBloque = esquemaCasillero.extend({
  cursoId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  titulo: opcional(60, "El título puede tener hasta 60 letras."),
  profesorId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  aula: opcional(40, "El aula puede tener hasta 40 letras."),
});

/**
 * Llena (o reemplaza) un casillero con un curso del salón o con un bloque sin curso («Tutoría»). Rechaza la hora
 * si el profesor ya tiene clase en otro salón a una hora que se cruza (aunque sea de otro nivel con otras horas).
 */
export async function asignarBloque(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  entrarDireccion(ctx);
  const d = esquemaBloque.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const { salonId, dia, periodoId, cursoId, titulo, aula } = d.data;
  if (!cursoId && !titulo) return fallo("Elige un curso o escribe el título del bloque (por ejemplo «Tutoría»).");

  const salon = await ctx.db.salon.findFirst({ where: { id: salonId, ...whereSalonActivo }, select: { id: true, nombre: true, nivel: true } });
  if (!salon) return fallo("No encontramos ese salón.");
  const periodo = await ctx.db.horarioPeriodo.findFirst({ where: { id: periodoId }, select: { id: true, nivel: true, tipo: true, horaInicio: true, horaFin: true } });
  if (!periodo || periodo.nivel !== salon.nivel) return fallo("Esa hora no es del nivel de este salón.");
  if (periodo.tipo === "recreo") return fallo("En el recreo no se programan clases.");

  let profesorId: string | null = null;
  let titulo_: string | null = null;
  if (cursoId) {
    const curso = await ctx.db.curso.findFirst({ where: { id: cursoId, salonId }, select: { profesorId: true } });
    if (!curso) return fallo("Ese curso no es de este salón.");
    profesorId = curso.profesorId;
  } else {
    titulo_ = titulo!;
    if (d.data.profesorId) {
      const prof = await ctx.db.membership.count({ where: { id: d.data.profesorId, rol: "profesor", estado: "activa" } });
      if (!prof) return fallo("Elige un profesor del colegio.");
      profesorId = d.data.profesorId;
    }
  }

  const actual = await ctx.db.bloqueHorario.findFirst({ where: { salonId, dia, periodoId }, select: { id: true } });
  if (profesorId) {
    const ocupados = (await buscarBloques(ctx, { ...wherePorProfesor(profesorId), dia })).map(aOcupacion);
    const cruce = buscarCruce({ profesorId, dia, horaInicio: periodo.horaInicio, horaFin: periodo.horaFin }, ocupados, actual?.id);
    if (cruce) {
      const prof = await ctx.db.membership.findFirst({ where: { id: profesorId }, select: { user: { select: { nombres: true, apellidos: true } } } });
      return fallo(mensajeCruce(prof ? nombrePersona(prof.user) : "El profesor", cruce));
    }
  }

  const datos = { cursoId: cursoId ?? null, titulo: titulo_, profesorId: cursoId ? null : profesorId, aula: aula ?? null };
  if (actual) await ctx.db.bloqueHorario.updateMany({ where: { id: actual.id }, data: datos });
  else await ctx.db.bloqueHorario.create({ data: { tenantId: ctx.tenant.id, salonId, dia, periodoId, ...datos } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "horario", entidadId: salonId, detalle: { dia, periodoId, cursoId: cursoId ?? null, titulo: titulo_ } });
  return ok("Guardamos el horario.");
}

/** Vacía un casillero. */
export async function quitarBloque(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  entrarDireccion(ctx);
  const d = esquemaCasillero.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const { count } = await ctx.db.bloqueHorario.deleteMany({ where: { salonId: d.data.salonId, dia: d.data.dia, periodoId: d.data.periodoId } });
  if (count === 0) return fallo("Ese casillero ya estaba vacío.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "horario", entidadId: d.data.salonId, detalle: { dia: d.data.dia, periodoId: d.data.periodoId } });
  return ok("Vaciamos el casillero.");
}

/**
 * Copia el horario de otro salón del mismo nivel y grado (reemplaza el del destino). Los cursos se emparejan por nombre;
 * el profesor es el del curso del destino. Se saltan los casilleros sin curso equivalente o que crucen a un profesor.
 * «Tutoría» y otros bloques sin curso a cargo del tutor del origen pasan al tutor del destino.
 */
export async function copiarHorario(ctx: TenantContext, destinoId: string, origenId: string): Promise<Resultado> {
  entrarDireccion(ctx);
  if (!z.uuid().safeParse(destinoId).success || !z.uuid().safeParse(origenId).success) return fallo("Elige el salón del que copiar.");
  if (destinoId === origenId) return fallo("Elige otro salón.");
  const [destino, origen] = await Promise.all(
    [destinoId, origenId].map((id) => ctx.db.salon.findFirst({ where: { id, ...whereSalonActivo }, select: { id: true, nombre: true, nivel: true, grado: true, tutorId: true } })),
  );
  if (!destino || !origen) return fallo("No encontramos uno de los salones.");
  if (destino.nivel !== origen.nivel || destino.grado !== origen.grado) return fallo("Solo se copia entre salones del mismo grado.");

  const [bloquesOrigen, cursosDestino] = await Promise.all([
    ctx.db.bloqueHorario.findMany({
      where: { salonId: origen.id },
      select: { dia: true, periodoId: true, titulo: true, profesorId: true, aula: true, curso: { select: { nombre: true } }, periodo: { select: { horaInicio: true, horaFin: true } } },
    }),
    ctx.db.curso.findMany({ where: { salonId: destino.id }, select: { id: true, nombre: true, profesorId: true } }),
  ]);
  const cursoPorNombre = new Map(cursosDestino.map((c) => [c.nombre.trim().toLocaleLowerCase("es"), c]));

  await ctx.db.bloqueHorario.deleteMany({ where: { salonId: destino.id } });
  const profesores = new Set(cursosDestino.flatMap((c) => (c.profesorId ? [c.profesorId] : [])));
  if (destino.tutorId) profesores.add(destino.tutorId);
  const ocupados = profesores.size
    ? (await buscarBloques(ctx, { salon: whereSalonActivo, OR: [{ curso: { profesorId: { in: [...profesores] } } }, { cursoId: null, profesorId: { in: [...profesores] } }] })).map(aOcupacion)
    : [];

  const nuevos: Prisma.BloqueHorarioCreateManyInput[] = [];
  let saltados = 0;
  for (const b of bloquesOrigen) {
    let cursoId: string | null = null;
    let profesorId: string | null = null;
    if (b.curso) {
      const c = cursoPorNombre.get(b.curso.nombre.trim().toLocaleLowerCase("es"));
      if (!c) { saltados++; continue; }
      cursoId = c.id;
      profesorId = c.profesorId;
    } else if (b.profesorId && b.profesorId === origen.tutorId) {
      profesorId = destino.tutorId;
    }
    if (profesorId) {
      const intervalo = { profesorId, dia: b.dia, horaInicio: b.periodo.horaInicio, horaFin: b.periodo.horaFin };
      if (buscarCruce(intervalo, ocupados)) { saltados++; continue; }
      ocupados.push({ ...intervalo, salonId: destino.id, salonNombre: destino.nombre, titulo: b.curso?.nombre ?? b.titulo ?? "" });
    }
    nuevos.push({ tenantId: ctx.tenant.id, salonId: destino.id, dia: b.dia, periodoId: b.periodoId, cursoId, titulo: cursoId ? null : b.titulo, profesorId: cursoId ? null : profesorId, aula: b.aula });
  }
  if (nuevos.length) await ctx.db.bloqueHorario.createMany({ data: nuevos });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "horario", entidadId: destino.id, detalle: { copiadoDe: origen.id, bloques: nuevos.length, saltados } });
  const base = `Copiamos ${nuevos.length === 1 ? "1 casillero" : `${nuevos.length} casilleros`} de ${origen.nombre}.`;
  return ok(saltados ? `${base} ${saltados === 1 ? "1 quedó vacío" : `${saltados} quedaron vacíos`} (curso sin equivalente o profesor ocupado).` : base);
}

// ───────────── Profesores ─────────────

/** Semana de un profesor en todos sus salones, con los cruces. El profesor ve la suya; dirección, la de cualquiera. */
export async function horarioDelProfesor(ctx: TenantContext, profesorId?: string) {
  entrar(ctx);
  let id: string;
  if (ctx.rol === "profesor") id = ctx.membership.id;
  else if (ctx.rol === "direccion" && profesorId && z.uuid().safeParse(profesorId).success) id = profesorId;
  else forbidden();
  const prof = await ctx.db.membership.findFirst({ where: { id, rol: "profesor" }, select: { id: true, user: { select: { nombres: true, apellidos: true } } } });
  if (!prof) notFound();
  const bloques = await buscarBloques(ctx, wherePorProfesor(id));
  const cruces = crucesDe(bloques.map(aOcupacion));
  return { profesor: { id: prof.id, nombre: nombrePersona(prof.user) }, bloques, cruces };
}

async function contarCruces(ctx: TenantContext): Promise<number> {
  const bloques = await buscarBloques(ctx, { salon: whereSalonActivo, OR: [{ curso: { profesorId: { not: null } } }, { cursoId: null, profesorId: { not: null } }] });
  return crucesDe(bloques.filter((b) => b.profesorId).map(aOcupacion)).length;
}

/** Carga de cada profesor: horas por semana, salones y cruces (dirección). */
export async function cargaDocente(ctx: TenantContext) {
  entrarDireccion(ctx);
  const [profesores, bloques] = await Promise.all([
    profesoresDelColegio(ctx),
    buscarBloques(ctx, { salon: whereSalonActivo, OR: [{ curso: { profesorId: { not: null } } }, { cursoId: null, profesorId: { not: null } }] }),
  ]);
  return profesores.map((p) => {
    const suyos = bloques.filter((b) => b.profesorId === p.id);
    const minutosSemana = suyos.reduce((t, b) => t + minutos(b.horaFin) - minutos(b.horaInicio), 0);
    return { ...p, bloques: suyos.length, minutosSemana, salones: new Set(suyos.map((b) => b.salonId)).size, cruces: crucesDe(suyos.map(aOcupacion)).length };
  });
}

// ───────────── Familia y alumno ─────────────

/** Alumnos cuyo horario se puede ver: el apoderado, sus hijos activos; el alumno, él mismo. */
export async function alumnosParaHorario(ctx: TenantContext) {
  entrar(ctx);
  if (ctx.rol === "alumno") {
    const propio = await alumnoDeLaCuenta(ctx);
    if (!propio) return [];
    const a = await ctx.db.alumno.findFirst({ where: { id: propio.id }, select: { id: true, nombres: true, salonId: true, salon: { select: { nombre: true } } } });
    return a ? [{ id: a.id, nombres: a.nombres, salonId: a.salonId, salonNombre: a.salon.nombre }] : [];
  }
  if (ctx.rol !== "apoderado") return [];
  const hijos = await ctx.db.alumno.findMany({
    where: { estado: "activo", apoderados: { some: { apoderadoId: ctx.membership.id } }, salon: whereSalonActivo },
    orderBy: { nombres: "asc" },
    select: { id: true, nombres: true, salonId: true, salon: { select: { nombre: true } } },
  });
  return hijos.map((h) => ({ id: h.id, nombres: h.nombres, salonId: h.salonId, salonNombre: h.salon.nombre }));
}

// ───────────── Hoy ─────────────

/** Día (1–7) y hora «HH:mm» del colegio. */
export function ahoraDelColegio(ctx: Pick<TenantContext, "tenant">, ahora = new Date()) {
  const m = momentoEnZona(ahora, ctx.tenant.zonaHoraria);
  return { isoFecha: m.isoFecha, hora: m.hora, dia: diaDeSemana(m.isoFecha) };
}

/**
 * Reuniones y eventos de la agenda de la semana que muestra «Mi horario» (specs/34), con la misma visibilidad que la
 * agenda (specs/32): el profesor ve las reuniones que convocó y los eventos de sus salones y del colegio. Las entregas de
 * tareas no se muestran (son plazos, no citas). Vacío si el colegio no tiene la agenda.
 */
export async function agendaDeLaSemana(ctx: TenantContext, hoyIso: string): Promise<EventoSemana[]> {
  if (!tieneFeature(ctx, "agenda")) return [];
  const fechas = fechasDeLaSemana(hoyIso);
  const items = await itemsDeAgenda(ctx, instanteLima(fechas[1], "00:00"), instanteLima(sumarDias(fechas[5], 1), "00:00"));
  return items.flatMap((i) => {
    if (i.tipo === "entrega") return [];
    const e = eventoDeSemana({ ...i, tipo: i.tipo }, ctx.tenant.zonaHoraria);
    return e ? [e] : [];
  });
}

export type GrupoHoy = { clave: string; etiqueta: string | null; bloques: BloqueVista[]; ahora: BloqueVista | null; despues: BloqueVista | null };

/**
 * Bloques de hoy para la tarjeta «Hoy» del inicio: el profesor, los suyos; el alumno, los de su salón; la familia,
 * los del salón de cada hijo. null si el módulo no está activo, el rol no aplica o es fin de semana.
 */
export async function horarioDeHoy(ctx: TenantContext, ahora = new Date()): Promise<{ hora: string; grupos: GrupoHoy[] } | null> {
  if (!tieneFeature(ctx, "horario") || !["profesor", "alumno", "apoderado"].includes(ctx.rol)) return null;
  const { hora, dia } = ahoraDelColegio(ctx, ahora);
  if (!esDiaHorario(dia)) return null;
  const grupo = (clave: string, etiqueta: string | null, bloques: BloqueVista[]): GrupoHoy => ({ clave, etiqueta, bloques, ...ahoraYDespues(bloques, hora) });
  if (ctx.rol === "profesor") {
    return { hora, grupos: [grupo("profesor", null, await buscarBloques(ctx, { ...wherePorProfesor(ctx.membership.id), dia }))] };
  }
  const alumnos = await alumnosParaHorario(ctx);
  const salones = [...new Set(alumnos.map((a) => a.salonId))];
  const bloques = salones.length ? await buscarBloques(ctx, { salonId: { in: salones }, dia }) : [];
  return {
    hora,
    grupos: alumnos.map((a) => grupo(a.id, ctx.rol === "alumno" ? null : `${a.nombres} · ${a.salonNombre}`, bloques.filter((b) => b.salonId === a.salonId))),
  };
}

/**
 * Para ordenar las listas de curso del profesor (specs/04): hora de inicio de cada curso que tiene hoy y si está en clase
 * ahora. Vacío si el módulo no está activo.
 */
export async function cursosDeHoy(ctx: TenantContext, ahora = new Date()): Promise<Map<string, { horaInicio: string; horaFin: string; ahora: boolean }>> {
  const mapa = new Map<string, { horaInicio: string; horaFin: string; ahora: boolean }>();
  if (!tieneFeature(ctx, "horario") || ctx.rol !== "profesor") return mapa;
  const { hora, dia } = ahoraDelColegio(ctx, ahora);
  if (!esDiaHorario(dia)) return mapa;
  const m = minutos(hora);
  const bloques = await buscarBloques(ctx, { dia, curso: { profesorId: ctx.membership.id }, salon: whereSalonActivo });
  for (const b of bloques) {
    if (!b.cursoId) continue;
    const enCurso = minutos(b.horaInicio) <= m && m < minutos(b.horaFin);
    const previo = mapa.get(b.cursoId);
    // Curso con dos horas hoy: gana la que está en curso; si no, la primera que aún no termina, y si no, la primera.
    if (!previo || enCurso || (!previo.ahora && minutos(previo.horaFin) <= m && minutos(b.horaFin) > m)) {
      mapa.set(b.cursoId, { horaInicio: b.horaInicio, horaFin: b.horaFin, ahora: enCurso });
    }
  }
  return mapa;
}

/** El profesor puede pasar lista de un curso desde el horario: asistencia activa y asistencia por curso en ese nivel. */
export function puedePasarListaDeCurso(ctx: TenantContext, nivel: Nivel): boolean {
  return tieneFeature(ctx, "asistencia") && asistenciaPorCursoActiva(ctx.tenant.asistenciaPorCursoNiveles, nivel);
}
