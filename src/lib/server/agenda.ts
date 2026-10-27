import "server-only";
import { z } from "zod";
import type { AdjuntoVista } from "@/lib/adjuntos";
import { instanteLima } from "@/lib/fechas";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { adjuntoVista } from "./adjuntos";
import { puedeVerTarea } from "./archivos";
import { auditar } from "./auditoria";
import { requireFeature } from "./plan";
import { salonEsActivo, whereSalonActivo } from "./salones-activos";
import { requireRol, salonIdsVisibles, type TenantContext } from "./tenant";

export type ItemAgenda = {
  id: string;
  tipo: "evento" | "reunion" | "examen" | "feriado" | "actividad" | "entrega";
  titulo: string;
  descripcion: string | null;
  inicio: Date;
  /** Nombre del salón; «Todo el colegio» si es general; el curso para las entregas. */
  ambito: string;
  /** Solo eventos: el usuario puede borrarlos. */
  eliminable: boolean;
  /** Adjuntos de la tarea (solo entregas) y solo si el usuario puede descargarlos: misma regla que `/archivos/<id>`. */
  adjuntos: AdjuntoVista[];
};

/** Eventos y entregas de tareas visibles para el usuario entre dos instantes (`hasta` excluido). */
export async function itemsDeAgenda(ctx: TenantContext, desde: Date, hasta: Date): Promise<ItemAgenda[]> {
  requireFeature(ctx, "agenda");
  requireRol(ctx, ["direccion", "profesor", "apoderado", "administrativo", "alumno"]);
  const salonIds = await salonIdsVisibles(ctx);
  const rango = { gte: desde, lt: hasta };
  const [eventos, tareas] = await Promise.all([
    ctx.db.eventoAgenda.findMany({
      where: { inicio: rango, OR: [{ salonId: null }, { salonId: { in: salonIds } }] },
      include: { salon: { select: { nombre: true } } },
    }),
    ctx.db.tarea.findMany({
      where: { fechaEntrega: rango, curso: { salonId: { in: salonIds } } },
      include: {
        adjuntos: { orderBy: { createdAt: "asc" } },
        curso: { select: { nombre: true, salonId: true, salon: { select: { nombre: true } } } },
      },
    }),
  ]);
  const items: ItemAgenda[] = [
    ...eventos.map((e) => ({
      id: e.id, tipo: e.tipo, titulo: e.titulo, descripcion: e.descripcion, inicio: e.inicio,
      ambito: e.salon?.nombre ?? "Todo el colegio",
      eliminable: ctx.rol === "direccion" || ((ctx.rol === "profesor" || ctx.rol === "administrativo") && e.creadoPorId === ctx.membership.id),
      adjuntos: [],
    })),
    ...(await Promise.all(tareas.map(async (t) => ({
      id: t.id, tipo: "entrega" as const, titulo: `Entrega: ${t.titulo}`, descripcion: t.descripcion, inicio: t.fechaEntrega,
      ambito: `${t.curso.nombre} · ${t.curso.salon.nombre}`, eliminable: false,
      adjuntos: t.adjuntos.length > 0 && (await puedeVerTarea(ctx, t)) ? t.adjuntos.map(adjuntoVista) : [],
    })))),
  ];
  return items.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
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
