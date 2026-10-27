import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { urlColegio } from "@/lib/dominio";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { encolarAvisoFamilia } from "./notificaciones/avisos-familia";
import { salonEsActivo, whereSalonActivo } from "./salones-activos";
import { salonIdsVisibles, type TenantContext } from "./tenant";

/** Roles que publican para todo el colegio o cualquier salón (el profesor, solo sus salones). */
const esGeneral = (rol: string) => rol === "direccion" || rol === "administrativo";

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
};

export function esEditable(publicadoAt: Date, ahora = new Date()): boolean {
  return ahora.getTime() - publicadoAt.getTime() <= HORAS_EDICION * 3600_000;
}

export async function listarComunicados(ctx: TenantContext): Promise<ComunicadoVista[]> {
  const salonIds = esGeneral(ctx.rol) ? null : await salonIdsVisibles(ctx);
  const filas = await ctx.db.comunicado.findMany({
    where: salonIds ? { OR: [{ salonId: null }, { salonId: { in: salonIds } }] } : {},
    orderBy: { publicadoAt: "desc" },
    take: 100,
    include: { salon: { select: { nombre: true } }, autor: { select: { user: { select: { nombres: true, apellidos: true } } } } },
  });
  return filas.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    cuerpo: c.cuerpo,
    publicadoAt: c.publicadoAt,
    salon: c.salon?.nombre ?? null,
    autor: `${c.autor.user.nombres} ${c.autor.user.apellidos}`.trim(),
    editable: c.autorId === ctx.membership.id && esEditable(c.publicadoAt),
  }));
}

/** Salones en los que el usuario puede publicar (dirección: todos; profesor: donde es tutor o dicta). */
export async function salonesParaPublicar(ctx: TenantContext) {
  if (!esGeneral(ctx.rol) && ctx.rol !== "profesor") return [];
  const ids = esGeneral(ctx.rol) ? undefined : await salonIdsVisibles(ctx);
  return ctx.db.salon.findMany({ where: { ...(ids ? { id: { in: ids } } : {}), ...whereSalonActivo }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });
}

function validar(entrada: { titulo: string; cuerpo: string; salonId: string | null }) {
  const datos = esquema.safeParse(entrada);
  if (!datos.success) throw new ErrorDeNegocio(datos.error.issues[0].message);
  return datos.data;
}

/** Dirección publica para todo el colegio o un salón; el profesor solo para sus salones. Encola un aviso por familia con consentimiento. */
export async function publicarComunicado(ctx: TenantContext, entrada: { titulo: string; cuerpo: string; salonId: string | null }): Promise<{ id: string; avisados: number }> {
  if (!esGeneral(ctx.rol) && ctx.rol !== "profesor") forbidden();
  const datos = validar(entrada);
  if (datos.salonId) {
    if (ctx.rol === "profesor" && !(await salonIdsVisibles(ctx)).includes(datos.salonId)) forbidden();
    if (!(await salonEsActivo(ctx, datos.salonId))) throw new ErrorDeNegocio("Ese salón está archivado o no existe.");
  } else if (ctx.rol === "profesor") {
    throw new ErrorDeNegocio("Elige uno de tus salones.");
  }

  const c = await ctx.db.comunicado.create({
    data: { tenantId: ctx.tenant.id, autorId: ctx.membership.id, salonId: datos.salonId, titulo: datos.titulo, cuerpo: datos.cuerpo },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "comunicado", entidadId: c.id });

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
      payload: { colegio: ctx.tenant.nombre, titulo: datos.titulo, url: urlColegio(ctx.tenant.slug, "/comunicados") },
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

export async function editarComunicado(ctx: TenantContext, id: string, entrada: { titulo: string; cuerpo: string }): Promise<void> {
  const c = await cargarEditable(ctx, id);
  const datos = validar({ ...entrada, salonId: c.salonId });
  await ctx.db.comunicado.update({ where: { id }, data: { titulo: datos.titulo, cuerpo: datos.cuerpo } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "comunicado", entidadId: id });
}

export async function borrarComunicado(ctx: TenantContext, id: string): Promise<void> {
  const c = await cargarEditable(ctx, id);
  await ctx.db.comunicado.delete({ where: { id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "comunicado", entidadId: id, detalle: { titulo: c.titulo } });
}
