import "server-only";
import { z } from "zod";
import type { Tenant } from "@/generated/prisma/client";
import { urlColegio } from "@/lib/dominio";
import { fechaCorta, momentoEnZona } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import { auditar } from "../auditoria";
import { db, dbTenant, type DbTenant } from "../db";
import type { TenantContext } from "../tenant";
import { conEnvio } from "./envios";
import { cuentasDeAlumnos, entregarNotificaciones, porFamilia, unirNombres, vinculosFamilias, type Entrega } from "./internas";

// Avisos de tareas (specs/39, specs/38). Bandeja + push, NUNCA correo. Destinatarios = asignaciones vigentes
// (no todo el salón): una notificación por familia (aunque tenga varios hijos asignados) y una por alumno con cuenta.
// En lote: alumnos, vínculos y cuentas en 3 consultas; createMany. Claves idempotentes distintas por tipo:
//  - `tarea:<id>` (publicada; también la programada, que envía el cron al llegar su hora)
//  - `tarea-plazo:<cambioId>` (cambio de plazo)
//  - `tarea-devuelta:<asignacionId>:<devueltaAt ms>` (devuelta para corrección; cada devolución avisa una vez)
// La calificación publicada la avisa el outbox de evaluaciones (specs/38).

const esquemaAvisar = z.object({
  avisarFamilias: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()),
});

/** true si la entrada del formulario pide avisar a las familias (`avisarFamilias`: true / "on"). */
export function pideAvisarFamilias(entrada: unknown): boolean {
  const r = esquemaAvisar.safeParse(entrada ?? {});
  return r.success && r.data.avisarFamilias;
}

type DatosAviso = {
  tdb: DbTenant;
  tenant: Pick<Tenant, "id" | "slug" | "nombre">;
  creadoPorId: string | null;
  tareaId: string;
  alumnoIds: string[];
  clave: string;
  plantilla: "tarea_nueva" | "tarea_actualizada";
  base: Record<string, unknown> & { curso: string; titulo: string };
  texto: (quien: string | null) => { titulo: string; cuerpo: string };
};

/** Entrega en lote a las familias y cuentas de los alumnos dados. Devuelve cuántas familias la reciben. */
async function avisarAlumnos(d: DatosAviso): Promise<number> {
  if (d.alumnoIds.length === 0) return 0;
  const alumnos = await d.tdb.alumno.findMany({
    where: { id: { in: d.alumnoIds }, estado: "activo" },
    select: { id: true, nombres: true },
    orderBy: { nombres: "asc" },
  });
  const ids = alumnos.map((a) => a.id);
  const nombres = new Map(alumnos.map((a) => [a.id, primerNombre(a.nombres)]));
  const [vinculos, cuentas] = await Promise.all([vinculosFamilias(d.tdb, ids), cuentasDeAlumnos(d.tdb, ids)]);
  const familias = porFamilia(vinculos, ids);
  const url = `/tareas/${d.tareaId}`;
  const base = { colegio: d.tenant.nombre, ...d.base, url: urlColegio(d.tenant.slug, url) };
  const entregas: Entrega<typeof d.plantilla>[] = [...familias.values()].map(({ vinculo, alumnoIds }) => {
    const hijos = unirNombres(alumnoIds.map((id) => nombres.get(id) ?? ""));
    return {
      membershipId: vinculo.apoderadoId, alumnoId: alumnoIds[0], ...d.texto(hijos), url,
      email: null, endpoints: vinculo.endpoints, apoderadoId: vinculo.apoderadoId, payload: { ...base, alumno: hijos } as never,
    };
  });
  for (const c of cuentas) {
    entregas.push({ membershipId: c.membershipId, alumnoId: c.alumnoId, ...d.texto(null), url, email: null, endpoints: [], apoderadoId: null, payload: base as never });
  }
  const envio = { tenantId: d.tenant.id, tipo: "tarea" as const, titulo: `Tarea: ${d.base.titulo} · ${d.base.curso}`, creadoPorId: d.creadoPorId };
  await conEnvio(d.tdb, envio, () =>
    entregarNotificaciones(d.tdb, {
      tenant: d.tenant, tipo: "tarea", clave: d.clave, tipoAviso: "tarea", plantilla: d.plantilla, referenciaId: d.tareaId, entregas,
    }),
  );
  return familias.size;
}

async function datosTarea(tdb: DbTenant, tareaId: string) {
  return tdb.tarea.findFirst({
    where: { id: tareaId },
    select: {
      id: true, titulo: true, fechaEntrega: true, estado: true, publicarEn: true, avisadaAt: true, creadoPorId: true,
      curso: { select: { nombre: true } },
      asignaciones: { where: { retiradaAt: null }, select: { alumnoId: true } },
    },
  });
}

/**
 * Aviso «tarea publicada» a sus destinatarios. Reclama `avisada_at` de forma atómica (solo si estaba vacío y la tarea ya
 * es visible): dos llamadas simultáneas (acción + cron) no duplican; además la clave de la bandeja es idempotente.
 */
export async function avisarTareaPublicada(
  tdb: DbTenant, tenant: Pick<Tenant, "id" | "slug" | "nombre" | "zonaHoraria">, tareaId: string, ahora = new Date(),
): Promise<number> {
  const reclamo = await tdb.tarea.updateMany({
    where: { id: tareaId, estado: "publicada", avisadaAt: null, OR: [{ publicarEn: null }, { publicarEn: { lte: ahora } }] },
    data: { avisadaAt: ahora },
  });
  if (reclamo.count === 0) return 0;
  const t = await datosTarea(tdb, tareaId);
  if (!t) return 0;
  const fecha = t.fechaEntrega ? momentoEnZona(t.fechaEntrega, tenant.zonaHoraria).isoFecha : undefined;
  const familias = await avisarAlumnos({
    tdb, tenant, creadoPorId: t.creadoPorId, tareaId, alumnoIds: t.asignaciones.map((a) => a.alumnoId), clave: `tarea:${t.id}`, plantilla: "tarea_nueva",
    base: { curso: t.curso.nombre, titulo: t.titulo, ...(fecha ? { fechaEntrega: fecha } : {}) },
    texto: (quien) => ({
      titulo: `Nueva tarea de ${t.curso.nombre}`,
      cuerpo: `${quien ? `${quien} tiene` : "Tienes"} una tarea nueva de ${t.curso.nombre}: «${t.titulo}». ${fecha ? `Se entrega el ${fechaCorta(fecha)}.` : "No tiene fecha límite."}`,
    }),
  });
  await auditar({ tenantId: tenant.id, actorId: null, accion: "enviar", entidad: "tarea", entidadId: t.id, detalle: { aviso: "tarea_nueva", familias } });
  return familias;
}

/** Compatibilidad: avisa una tarea recién creada si el formulario lo pidió (`avisarFamilias`). */
export async function avisarTareaNueva(ctx: TenantContext, tareaId: string, entrada: unknown): Promise<number> {
  if (!pideAvisarFamilias(entrada)) return 0;
  return avisarTareaPublicada(ctx.db, ctx.tenant, tareaId);
}

/** Cambio de plazo: a los destinatarios vigentes de la sección (o de toda la tarea) que aún no entregaron. */
export async function avisarCambioPlazo(ctx: TenantContext, d: { tareaId: string; cambioId: string; tareaCursoId?: string | null; nuevo: Date | null; conHora: boolean }): Promise<number> {
  const t = await ctx.db.tarea.findFirst({ where: { id: d.tareaId, estado: "publicada", avisadaAt: { not: null } }, select: { id: true, titulo: true, curso: { select: { nombre: true } } } });
  if (!t) return 0; // borrador o programada sin publicar: nadie la vio todavía
  const asignaciones = await ctx.db.tareaAsignacion.findMany({
    where: { tareaId: t.id, retiradaAt: null, estado: { in: ["asignada", "en_proceso", "devuelta"] }, ...(d.tareaCursoId ? { tareaCursoId: d.tareaCursoId } : {}) },
    select: { alumnoId: true },
  });
  const m = d.nuevo ? momentoEnZona(d.nuevo, ctx.tenant.zonaHoraria) : null;
  const plazo = m ? `ahora se entrega el ${fechaCorta(m.isoFecha)}${d.conHora ? ` a las ${m.hora}` : ""}` : "ya no tiene fecha límite";
  return avisarAlumnos({
    tdb: ctx.db, tenant: ctx.tenant, creadoPorId: ctx.membership.id, tareaId: t.id, alumnoIds: asignaciones.map((a) => a.alumnoId), clave: `tarea-plazo:${d.cambioId}`,
    plantilla: "tarea_actualizada",
    base: { curso: t.curso.nombre, titulo: t.titulo, mensaje: `Cambió el plazo de «${t.titulo}»: ${plazo}.` },
    texto: () => ({ titulo: `Cambió el plazo de una tarea de ${t.curso.nombre}`, cuerpo: `«${t.titulo}» ${plazo}.` }),
  });
}

/** Entrega devuelta para corrección: al alumno con cuenta y a su familia. */
export async function avisarDevuelta(ctx: TenantContext, asignacionId: string): Promise<number> {
  const a = await ctx.db.tareaAsignacion.findFirst({
    where: { id: asignacionId, estado: "devuelta" },
    select: { alumnoId: true, devueltaAt: true, tarea: { select: { id: true, titulo: true, curso: { select: { nombre: true } } } } },
  });
  if (!a?.devueltaAt) return 0;
  return avisarAlumnos({
    tdb: ctx.db, tenant: ctx.tenant, creadoPorId: ctx.membership.id, tareaId: a.tarea.id, alumnoIds: [a.alumnoId],
    clave: `tarea-devuelta:${asignacionId}:${a.devueltaAt.getTime()}`, plantilla: "tarea_actualizada",
    base: { curso: a.tarea.curso.nombre, titulo: a.tarea.titulo, mensaje: `El profesor devolvió «${a.tarea.titulo}» para corregir. Revisa sus comentarios y vuelve a entregarla.` },
    texto: (quien) => ({
      titulo: `Tarea devuelta para corregir: ${a.tarea.curso.nombre}`,
      cuerpo: `${quien ? `La tarea de ${quien}` : "Tu tarea"} «${a.tarea.titulo}» volvió para corregir. Revisa los comentarios y vuelve a entregarla.`,
    }),
  });
}

/**
 * Cron (`/api/cron/avisos`): tareas programadas cuya hora llegó y aún no se avisaron. Consulta acotada por el índice
 * parcial `tareas_pendientes_aviso_idx` (publicada, sin aviso, `publicar_en <= now()`); nunca recorre alumnos.
 */
export async function procesarTareasProgramadas(ahora = new Date(), lote = 50): Promise<{ avisadas: number }> {
  const pendientes = await db.tarea.findMany({
    where: { estado: "publicada", avisadaAt: null, publicarEn: { lte: ahora } },
    select: { id: true, tenantId: true },
    orderBy: { publicarEn: "asc" },
    take: lote,
  });
  let avisadas = 0;
  for (const p of pendientes) {
    const tenant = await db.tenant.findUnique({ where: { id: p.tenantId }, select: { id: true, slug: true, nombre: true, zonaHoraria: true, estado: true } });
    if (!tenant || tenant.estado !== "activo") continue;
    try {
      await avisarTareaPublicada(dbTenant(tenant.id), tenant, p.id, ahora);
      avisadas++;
    } catch (error) {
      console.error("[tareas] no se pudo avisar la tarea programada", p.id, error);
    }
  }
  return { avisadas };
}
