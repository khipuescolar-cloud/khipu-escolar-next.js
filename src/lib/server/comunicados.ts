import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { urlColegio } from "@/lib/dominio";
import { type AdjuntoVista } from "@/lib/adjuntos";
import { adjuntoVista, borrarAdjuntosDe, contarRestantes, guardarAdjuntos, quitarAdjuntos, validarAdjuntos, type EntradaAdjunto } from "./adjuntos";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { encolarAvisoFamilia } from "./notificaciones/avisos-familia";
import { salonIdsVisibles, type TenantContext } from "./tenant";

// Comunicados (specs/09-comunicados.md).

export const HORAS_EDICION = 24;

const esquema = z.object({
  titulo: z.string().trim().min(1, "Escribe un título.").max(120, "El título puede tener hasta 120 caracteres."),
  cuerpo: z.string().trim().min(1, "Escribe el comunicado.").max(5000, "El comunicado puede tener hasta 5000 caracteres."),
  salonId: z.uuid().nullable(),
});

export type ComunicadoVista = {
  id: string;
  titulo: string;
  cuerpo: string;
  publicadoAt: Date;
  salon: string | null;
  autor: string;
  editable: boolean;
  adjuntos: AdjuntoVista[];
};

export function esEditable(publicadoAt: Date, ahora = new Date()): boolean {
  return ahora.getTime() - publicadoAt.getTime() <= HORAS_EDICION * 3600_000;
}

export async function listarComunicados(ctx: TenantContext): Promise<ComunicadoVista[]> {
  const salonIds = ctx.rol === "direccion" ? null : await salonIdsVisibles(ctx);
  const filas = await ctx.db.comunicado.findMany({
    where: salonIds ? { OR: [{ salonId: null }, { salonId: { in: salonIds } }] } : {},
    orderBy: { publicadoAt: "desc" },
    take: 100,
    include: { adjuntos: { orderBy: { createdAt: "asc" } }, salon: { select: { nombre: true } }, autor: { select: { user: { select: { nombres: true, apellidos: true } } } } },
  });
  return filas.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    cuerpo: c.cuerpo,
    publicadoAt: c.publicadoAt,
    salon: c.salon?.nombre ?? null,
    autor: `${c.autor.user.nombres} ${c.autor.user.apellidos}`.trim(),
    editable: c.autorId === ctx.membership.id && esEditable(c.publicadoAt),
    adjuntos: c.adjuntos.map(adjuntoVista),
  }));
}

/** Salones en los que el usuario puede publicar (dirección: todos; profesor: donde es tutor o dicta). */
export async function salonesParaPublicar(ctx: TenantContext) {
  if (ctx.rol !== "direccion" && ctx.rol !== "profesor") return [];
  const ids = await salonIdsVisibles(ctx);
  return ctx.db.salon.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });
}

function validar(entrada: { titulo: string; cuerpo: string; salonId: string | null }) {
  const datos = esquema.safeParse(entrada);
  if (!datos.success) throw new ErrorDeNegocio(datos.error.issues[0].message);
  return datos.data;
}

/** Dirección publica para todo el colegio o un salón; el profesor solo para sus salones. Encola un aviso por familia con consentimiento. */
/** Enlace del correo y del push: lleva al comunicado concreto (ancla estable `#comunicado-<id>` de `/comunicados`). */
export function urlComunicado(slug: string, id: string): string {
  return urlColegio(slug, `/comunicados#comunicado-${id}`);
}

export async function publicarComunicado(
  ctx: TenantContext,
  entrada: { titulo: string; cuerpo: string; salonId: string | null },
  adjuntos: EntradaAdjunto[] = [],
): Promise<{ id: string; avisados: number }> {
  if (ctx.rol !== "direccion" && ctx.rol !== "profesor") forbidden();
  const datos = validar(entrada);
  if (datos.salonId) {
    if (!(await salonIdsVisibles(ctx)).includes(datos.salonId)) forbidden();
  } else if (ctx.rol !== "direccion") {
    throw new ErrorDeNegocio("Elige uno de tus salones.");
  }

  const validados = validarAdjuntos(adjuntos);
  const c = await ctx.db.comunicado.create({
    data: { tenantId: ctx.tenant.id, autorId: ctx.membership.id, salonId: datos.salonId, titulo: datos.titulo, cuerpo: datos.cuerpo },
  });
  try {
    await guardarAdjuntos(ctx, { comunicadoId: c.id }, validados);
  } catch (e) {
    await ctx.db.comunicado.delete({ where: { id: c.id } });
    throw e;
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "comunicado", entidadId: c.id, detalle: { adjuntos: validados.length } });

  const vinculos = await ctx.db.apoderadoAlumno.findMany({
    where: { recibeAvisos: true, alumno: { estado: "activo", ...(datos.salonId ? { salonId: datos.salonId } : {}) } },
    select: { apoderadoId: true },
  });
  const familias = [...new Set(vinculos.map((v) => v.apoderadoId))];
  let avisados = 0;
  for (const apoderadoId of familias) {
    const ok = await encolarAvisoFamilia(ctx, {
      plantilla: "comunicado",
      apoderadoId,
      referenciaId: c.id,
      payload: { colegio: ctx.tenant.nombre, titulo: datos.titulo, url: urlComunicado(ctx.tenant.slug, c.id), ...(validados.length ? { adjuntos: validados.length } : {}) },
    });
    if (ok) avisados++;
  }
  return { id: c.id, avisados };
}

async function cargarEditable(ctx: TenantContext, id: string) {
  const c = await ctx.db.comunicado.findFirst({ where: { id, autorId: ctx.membership.id } });
  if (!c) forbidden();
  if (!esEditable(c.publicadoAt)) throw new ErrorDeNegocio(`Solo se puede cambiar dentro de las primeras ${HORAS_EDICION} horas.`);
  return c;
}

/** Edita título y mensaje; `quitar` borra adjuntos y `nuevos` agrega otros (máx. 5 en total). No vuelve a avisar. */
export async function editarComunicado(
  ctx: TenantContext,
  id: string,
  entrada: { titulo: string; cuerpo: string },
  adjuntos: { nuevos?: EntradaAdjunto[]; quitar?: string[] } = {},
): Promise<void> {
  const c = await cargarEditable(ctx, id);
  const datos = validar({ ...entrada, salonId: c.salonId });
  const quitar = adjuntos.quitar ?? [];
  const actuales = await contarRestantes(ctx, { comunicadoId: id }, quitar);
  const validados = validarAdjuntos(adjuntos.nuevos ?? [], actuales);
  await quitarAdjuntos(ctx, { comunicadoId: id }, quitar);
  await guardarAdjuntos(ctx, { comunicadoId: id }, validados);
  await ctx.db.comunicado.update({ where: { id }, data: { titulo: datos.titulo, cuerpo: datos.cuerpo } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "comunicado", entidadId: id });
}

export async function borrarComunicado(ctx: TenantContext, id: string): Promise<void> {
  const c = await cargarEditable(ctx, id);
  await borrarAdjuntosDe(ctx, { comunicadoId: id });
  await ctx.db.comunicado.delete({ where: { id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "comunicado", entidadId: id, detalle: { titulo: c.titulo } });
}
