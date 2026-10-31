import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { esHora, minutos, ordenarPorHora, type Intervalo } from "@/lib/horario";
import { generarPeriodos, validarPlantilla } from "@/lib/plantillas-horario";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { auditar } from "./auditoria";
import { contarCruces } from "./horario";
import { requireFeature } from "./plan";
import { salonesActivos, whereSalonActivo } from "./salones-activos";
import { requireRol, type TenantContext } from "./tenant";

// Plantillas de horario (specs/34). Dirección y secretaría (administrativo) las crean: entrada, duración de la hora de
// clase, recreos, salida y hora límite de falta; Khipu calcula las horas del día. Cada salón usa una; su entrada fija la
// tardanza en portería y el control de ingreso automático (specs/05).

function entrar(ctx: TenantContext) {
  requireFeature(ctx, "horario");
  requireRol(ctx, ["direccion", "administrativo"]);
}

export type PlantillaVista = {
  id: string;
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  duracionClase: number;
  horaLimiteFalta: string;
  recreos: Intervalo[];
  /** Horas de clase. */
  clases: number;
  salones: { id: string; nombre: string }[];
};

const SELECT_PLANTILLA = {
  id: true, nombre: true, horaEntrada: true, horaSalida: true, duracionClase: true, horaLimiteFalta: true,
  periodos: { select: { horaInicio: true, horaFin: true, tipo: true } },
  salones: { where: whereSalonActivo, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } },
} satisfies Prisma.PlantillaHorarioSelect;

type FilaPlantilla = Prisma.PlantillaHorarioGetPayload<{ select: typeof SELECT_PLANTILLA }>;

function aVista(p: FilaPlantilla): PlantillaVista {
  const periodos = ordenarPorHora(p.periodos);
  return {
    id: p.id, nombre: p.nombre, horaEntrada: p.horaEntrada, horaSalida: p.horaSalida, duracionClase: p.duracionClase, horaLimiteFalta: p.horaLimiteFalta,
    recreos: periodos.filter((x) => x.tipo === "recreo").map(({ horaInicio, horaFin }) => ({ horaInicio, horaFin })),
    clases: periodos.filter((x) => x.tipo === "clase").length,
    salones: p.salones,
  };
}

export async function listarPlantillas(ctx: TenantContext): Promise<PlantillaVista[]> {
  entrar(ctx);
  const consulta: Prisma.PlantillaHorarioFindManyArgs = { select: SELECT_PLANTILLA, orderBy: { nombre: "asc" } };
  const filas = (await ctx.db.plantillaHorario.findMany(consulta)) as unknown as FilaPlantilla[];
  return filas.map(aVista);
}

export async function detallePlantilla(ctx: TenantContext, id: string): Promise<PlantillaVista | null> {
  entrar(ctx);
  if (!z.uuid().safeParse(id).success) return null;
  const consulta: Prisma.PlantillaHorarioFindFirstArgs = { where: { id }, select: SELECT_PLANTILLA };
  const fila = (await ctx.db.plantillaHorario.findFirst(consulta)) as unknown as FilaPlantilla | null;
  return fila ? aVista(fila) : null;
}

/** Salones activos para asignar, con la plantilla que usan ahora. */
export async function salonesParaPlantillas(ctx: TenantContext) {
  entrar(ctx);
  const salones = await salonesActivos(ctx, { id: true, nombre: true, nivel: true, plantillaId: true });
  return salones as { id: string; nombre: string; nivel: string; plantillaId: string | null }[];
}

const hora = (mensaje: string) => z.string().trim().refine(esHora, mensaje);

const esquema = z.object({
  nombre: z.string().trim().min(1, "Ponle un nombre a la plantilla (por ejemplo «Primaria mañana»).").max(60, "El nombre puede tener hasta 60 letras."),
  horaEntrada: hora("Escribe la hora de entrada."),
  horaSalida: hora("Escribe la hora de salida."),
  duracionClase: z.coerce.number().int("La duración va en minutos enteros."),
  horaLimiteFalta: hora("Escribe la hora límite de falta."),
  recreos: z.array(z.object({ horaInicio: z.string().trim(), horaFin: z.string().trim() })).max(6, "Puedes poner hasta 6 recreos."),
  salonIds: z.array(z.uuid()).default([]),
});

/**
 * Crea o actualiza una plantilla y recalcula sus horas del día. Al actualizar, las horas se reemplazan en su lugar (la
 * 1.ª hora sigue siendo la 1.ª): los casilleros del horario se conservan; los de horas que ya no existen se vacían.
 * Los salones marcados pasan a usar esta plantilla (sus casilleros se mueven a la misma hora de clase de esta).
 */
export async function guardarPlantilla(ctx: TenantContext, id: string | null, entrada: unknown): Promise<Resultado & { id?: string }> {
  entrar(ctx);
  const d = esquema.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const datos = d.data;
  const error = validarPlantilla(datos);
  if (error) return fallo(error);
  if (minutos(datos.horaLimiteFalta) <= minutos(datos.horaEntrada)) return fallo("La hora límite de falta debe ser después de la entrada.");
  if (await ctx.db.plantillaHorario.count({ where: { nombre: { equals: datos.nombre, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) } })) {
    return fallo("Ya hay una plantilla con ese nombre.");
  }
  const campos = { nombre: datos.nombre, horaEntrada: datos.horaEntrada, horaSalida: datos.horaSalida, duracionClase: datos.duracionClase, horaLimiteFalta: datos.horaLimiteFalta };
  const nuevos = generarPeriodos(datos).periodos;
  let vaciados = 0;
  let plantillaId: string;

  if (id) {
    if (!z.uuid().safeParse(id).success) return fallo("No encontramos esa plantilla.");
    const actual = await ctx.db.plantillaHorario.findFirst({ where: { id }, select: { id: true, periodos: { select: { id: true, horaInicio: true, horaFin: true, tipo: true } } } });
    if (!actual) return fallo("No encontramos esa plantilla.");
    plantillaId = actual.id;
    // Emparejar por posición dentro de cada tipo: la 3.ª hora de clase vieja pasa a ser la 3.ª nueva (con su casillero).
    const viejos = ordenarPorHora(actual.periodos);
    const operaciones: Prisma.PrismaPromise<unknown>[] = [ctx.db.plantillaHorario.updateMany({ where: { id }, data: campos })];
    const borrar: string[] = [];
    for (const tipo of ["clase", "recreo"] as const) {
      const v = viejos.filter((x) => x.tipo === tipo);
      const n = nuevos.filter((x) => x.tipo === tipo);
      n.forEach((p, i) => {
        operaciones.push(
          v[i]
            ? ctx.db.horarioPeriodo.updateMany({ where: { id: v[i].id }, data: { nombre: p.nombre, horaInicio: p.horaInicio, horaFin: p.horaFin } })
            : ctx.db.horarioPeriodo.create({ data: { tenantId: ctx.tenant.id, plantillaId, ...p } }),
        );
      });
      borrar.push(...v.slice(n.length).map((x) => x.id));
    }
    vaciados = await ctx.db.bloqueHorario.count({ where: { periodoId: { in: borrar } } });
    operaciones.unshift(ctx.db.bloqueHorario.deleteMany({ where: { periodoId: { in: borrar } } }));
    operaciones.push(ctx.db.horarioPeriodo.deleteMany({ where: { id: { in: borrar } } }));
    await ctx.db.$transaction(operaciones);
  } else {
    const creada = await ctx.db.plantillaHorario.create({ data: { tenantId: ctx.tenant.id, ...campos }, select: { id: true } });
    plantillaId = creada.id;
    await ctx.db.horarioPeriodo.createMany({ data: nuevos.map((p) => ({ ...p, tenantId: ctx.tenant.id, plantillaId })) });
  }

  let movidos = 0;
  for (const salonId of datos.salonIds) {
    const r = await moverSalon(ctx, salonId, plantillaId);
    vaciados += r.vaciados;
    if (r.movido) movidos++;
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: id ? "editar" : "crear", entidad: "plantillas_horario", entidadId: plantillaId, detalle: { ...campos, recreos: datos.recreos.length, salones: datos.salonIds.length, casillerosVaciados: vaciados } });

  const partes = [id ? "Guardamos la plantilla." : `Creamos la plantilla «${datos.nombre}».`];
  if (movidos > 0) partes.push(movidos === 1 ? "1 salón pasó a usarla." : `${movidos} salones pasaron a usarla.`);
  if (vaciados > 0) partes.push(vaciados === 1 ? "Se vació 1 casillero del horario (su hora ya no existe)." : `Se vaciaron ${vaciados} casilleros del horario (sus horas ya no existen).`);
  const cruces = await contarCruces(ctx);
  if (cruces > 0) partes.push(`Ojo: hay ${cruces === 1 ? "1 cruce" : `${cruces} cruces`} de profesores; revísalos en «Carga de profesores».`);
  return { ...ok(partes.join(" ")), id: plantillaId };
}

/**
 * Pasa un salón a otra plantilla: cada casillero va a la misma hora de clase (por posición) de la nueva; los que no
 * tienen equivalente se vacían.
 */
async function moverSalon(ctx: TenantContext, salonId: string, plantillaId: string): Promise<{ movido: boolean; vaciados: number }> {
  const salon = await ctx.db.salon.findFirst({ where: { id: salonId, ...whereSalonActivo }, select: { id: true, plantillaId: true } });
  if (!salon || salon.plantillaId === plantillaId) return { movido: false, vaciados: 0 };
  const [viejos, nuevos, bloques] = await Promise.all([
    salon.plantillaId ? ctx.db.horarioPeriodo.findMany({ where: { plantillaId: salon.plantillaId, tipo: "clase" }, select: { id: true, horaInicio: true, horaFin: true } }) : Promise.resolve([]),
    ctx.db.horarioPeriodo.findMany({ where: { plantillaId, tipo: "clase" }, select: { id: true, horaInicio: true, horaFin: true } }),
    ctx.db.bloqueHorario.findMany({ where: { salonId }, select: { id: true, periodoId: true } }),
  ]);
  const posicion = new Map(ordenarPorHora(viejos).map((p, i) => [p.id, i]));
  const destino = ordenarPorHora(nuevos);
  const vaciar: string[] = [];
  const mover: Prisma.PrismaPromise<unknown>[] = [];
  for (const b of bloques) {
    const i = posicion.get(b.periodoId);
    const nuevo = i === undefined ? undefined : destino[i];
    if (nuevo) mover.push(ctx.db.bloqueHorario.updateMany({ where: { id: b.id }, data: { periodoId: nuevo.id } }));
    else vaciar.push(b.id);
  }
  await ctx.db.$transaction([
    ctx.db.bloqueHorario.deleteMany({ where: { id: { in: vaciar } } }),
    ...mover,
    ctx.db.salon.updateMany({ where: { id: salonId }, data: { plantillaId } }),
  ]);
  return { movido: true, vaciados: vaciar.length };
}

/** Cambia la plantilla de un salón (desde la pantalla del horario del salón). */
export async function asignarPlantilla(ctx: TenantContext, salonId: string, plantillaId: string): Promise<Resultado> {
  entrar(ctx);
  if (!z.uuid().safeParse(salonId).success || !z.uuid().safeParse(plantillaId).success) return fallo("Elige la plantilla.");
  const plantilla = await ctx.db.plantillaHorario.findFirst({ where: { id: plantillaId }, select: { nombre: true } });
  if (!plantilla) return fallo("No encontramos esa plantilla.");
  const r = await moverSalon(ctx, salonId, plantillaId);
  if (!r.movido) return fallo("El salón ya usa esa plantilla.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "salones", entidadId: salonId, detalle: { plantillaId, casillerosVaciados: r.vaciados } });
  const partes = [`El salón ahora usa la plantilla «${plantilla.nombre}».`];
  if (r.vaciados > 0) partes.push(r.vaciados === 1 ? "Se vació 1 casillero (esa hora no existe en la nueva plantilla)." : `Se vaciaron ${r.vaciados} casilleros (esas horas no existen en la nueva plantilla).`);
  const cruces = await contarCruces(ctx);
  if (cruces > 0) partes.push(`Ojo: hay ${cruces === 1 ? "1 cruce" : `${cruces} cruces`} de profesores; revísalos en «Carga de profesores».`);
  return ok(partes.join(" "));
}

/** Elimina una plantilla que ningún salón usa. */
export async function eliminarPlantilla(ctx: TenantContext, id: string): Promise<Resultado> {
  entrar(ctx);
  if (!z.uuid().safeParse(id).success) return fallo("No encontramos esa plantilla.");
  const p = await ctx.db.plantillaHorario.findFirst({ where: { id }, select: { nombre: true, _count: { select: { salones: true } } } });
  if (!p) return fallo("No encontramos esa plantilla.");
  if (p._count.salones > 0) return fallo("Esta plantilla la usan salones. Primero pásalos a otra plantilla.");
  await ctx.db.plantillaHorario.deleteMany({ where: { id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "plantillas_horario", entidadId: id, detalle: { nombre: p.nombre } });
  return ok(`Eliminamos la plantilla «${p.nombre}».`);
}
