import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { urlColegio } from "@/lib/dominio";
import { type AdjuntoVista } from "@/lib/adjuntos";
import { columnasAudiencia, etiquetaAudiencia, textoGradoComunicado, type AudienciaComunicado } from "@/lib/audiencia-comunicado";
import { ETIQUETA_NIVEL } from "@/lib/cneb/catalogo";
import type { Prisma } from "@/generated/prisma/client";
import type { Nivel } from "@/generated/prisma/enums";
import { adjuntoVista, adjuntosDe, borrarDelProveedor, contarRestantes, guardarAdjuntos, quitarAdjuntos, validarAdjuntos, type EntradaAdjunto } from "./adjuntos";
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
});

export type ComunicadoVista = {
  id: string;
  titulo: string;
  cuerpo: string;
  publicadoAt: Date;
  salon: string | null;
  /** «Todo el colegio», «Primaria», «3.° grado de primaria» o el nombre del salón. */
  audiencia: string;
  autor: string;
  editable: boolean;
  adjuntos: AdjuntoVista[];
};

export function esEditable(publicadoAt: Date, ahora = new Date()): boolean {
  return ahora.getTime() - publicadoAt.getTime() <= HORAS_EDICION * 3600_000;
}

/**
 * Comunicados que ve el usuario. Dirección y administrativo: todos. El resto: los de todo el colegio, los de sus salones
 * y los dirigidos al nivel o al grado de alguno de sus salones (el autor siempre ve los suyos).
 */
export async function whereComunicadosVisibles(ctx: TenantContext): Promise<Prisma.ComunicadoWhereInput> {
  if (esGeneral(ctx.rol)) return {};
  const ids = await salonIdsVisibles(ctx);
  const salones = ids.length ? await ctx.db.salon.findMany({ where: { id: { in: ids } }, select: { nivel: true, grado: true } }) : [];
  const niveles = [...new Set(salones.map((s) => s.nivel))];
  const grados = [...new Map(salones.filter((s) => s.grado !== null).map((s) => [`${s.nivel}:${s.grado}`, { nivel: s.nivel, grado: s.grado as number }])).values()];
  const OR: Prisma.ComunicadoWhereInput[] = [{ salonId: null, niveles: { isEmpty: true } }, { autorId: ctx.membership.id }];
  if (ids.length) OR.push({ salonId: { in: ids } });
  if (niveles.length) OR.push({ salonId: null, grado: null, niveles: { hasSome: niveles } });
  for (const g of grados) OR.push({ salonId: null, grado: g.grado, niveles: { has: g.nivel } });
  return { OR };
}

export async function listarComunicados(ctx: TenantContext): Promise<ComunicadoVista[]> {
  const filas = await ctx.db.comunicado.findMany({
    where: await whereComunicadosVisibles(ctx),
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
    audiencia: etiquetaAudiencia({ salon: c.salon?.nombre ?? null, niveles: c.niveles, grado: c.grado }),
    autor: `${c.autor.user.nombres} ${c.autor.user.apellidos}`.trim(),
    editable: c.autorId === ctx.membership.id && esEditable(c.publicadoAt),
    adjuntos: c.adjuntos.map(adjuntoVista),
  }));
}

/** Salones en los que el usuario puede publicar (dirección y administrativo: todos; profesor: donde es tutor o dicta). */
export async function salonesParaPublicar(ctx: TenantContext): Promise<{ id: string; nombre: string; nivel: Nivel; grado: number | null }[]> {
  if (!esGeneral(ctx.rol) && ctx.rol !== "profesor") return [];
  const ids = esGeneral(ctx.rol) ? undefined : await salonIdsVisibles(ctx);
  return ctx.db.salon.findMany({ where: { ...(ids ? { id: { in: ids } } : {}), ...whereSalonActivo }, select: { id: true, nombre: true, nivel: true, grado: true }, orderBy: { nombre: "asc" } });
}

/** Alumnos activos a los que llega el destino (sus familias reciben el aviso). Nivel y grado: solo salones activos. */
function whereAlumnosDeAudiencia(a: AudienciaComunicado): Prisma.AlumnoWhereInput {
  switch (a.tipo) {
    case "colegio":
      return { estado: "activo" };
    case "salon":
      return { estado: "activo", salonId: a.salonId };
    case "niveles":
      return { estado: "activo", salon: { nivel: { in: a.niveles }, ...whereSalonActivo } };
    case "grado":
      return { estado: "activo", salon: { nivel: a.nivel, grado: a.grado, ...whereSalonActivo } };
  }
}

/** Revisa permisos y que el destino exista: el profesor solo publica para sus salones; nivel y grado necesitan salones activos. */
async function validarAudiencia(ctx: TenantContext, a: AudienciaComunicado): Promise<void> {
  if (ctx.rol === "profesor" && a.tipo !== "salon") throw new ErrorDeNegocio("Elige uno de tus salones.");
  if (a.tipo === "salon") {
    if (ctx.rol === "profesor" && !(await salonIdsVisibles(ctx)).includes(a.salonId)) forbidden();
    if (!(await salonEsActivo(ctx, a.salonId))) throw new ErrorDeNegocio("Ese salón está archivado o no existe.");
  } else if (a.tipo === "niveles") {
    const conSalones = await ctx.db.salon.findMany({ where: { nivel: { in: a.niveles }, ...whereSalonActivo }, select: { nivel: true }, distinct: ["nivel"] });
    const faltan = a.niveles.filter((n) => !conSalones.some((s) => s.nivel === n));
    if (faltan.length) throw new ErrorDeNegocio(`El colegio no tiene salones activos de ${ETIQUETA_NIVEL[faltan[0]].toLowerCase()}.`);
  } else if (a.tipo === "grado") {
    if ((await ctx.db.salon.count({ where: { nivel: a.nivel, grado: a.grado, ...whereSalonActivo } })) === 0) {
      throw new ErrorDeNegocio(`El colegio no tiene salones activos de ${textoGradoComunicado(a.nivel, a.grado).toLowerCase()}.`);
    }
  }
}

function validar(entrada: { titulo: string; cuerpo: string }) {
  const datos = esquema.safeParse(entrada);
  if (!datos.success) throw new ErrorDeNegocio(datos.error.issues[0].message);
  return datos.data;
}

/** Enlace del correo y del push: lleva al comunicado concreto (ancla estable `#comunicado-<id>` de `/comunicados`). */
export function urlComunicado(slug: string, id: string): string {
  return urlColegio(slug, `/comunicados#comunicado-${id}`);
}

/**
 * Dirección y administrativo publican para todo el colegio, uno o más niveles, un grado o un salón; el profesor solo para sus salones.
 * Encola un aviso por familia con consentimiento. `salonId` (sin `audiencia`) se mantiene por compatibilidad: null = todo el colegio.
 */
export async function publicarComunicado(
  ctx: TenantContext,
  entrada: { titulo: string; cuerpo: string; salonId?: string | null; audiencia?: AudienciaComunicado },
  adjuntos: EntradaAdjunto[] = [],
): Promise<{ id: string; avisados: number }> {
  if (!esGeneral(ctx.rol) && ctx.rol !== "profesor") forbidden();
  const datos = validar(entrada);
  const audiencia: AudienciaComunicado = entrada.audiencia ?? (entrada.salonId ? { tipo: "salon", salonId: entrada.salonId } : { tipo: "colegio" });
  if (audiencia.tipo === "salon" && !z.uuid().safeParse(audiencia.salonId).success) throw new ErrorDeNegocio("Elige un salón.");
  await validarAudiencia(ctx, audiencia);
  const columnas = columnasAudiencia(audiencia);

  const validados = validarAdjuntos(adjuntos);
  const c = await ctx.db.comunicado.create({
    data: { tenantId: ctx.tenant.id, autorId: ctx.membership.id, ...columnas, titulo: datos.titulo, cuerpo: datos.cuerpo },
  });
  try {
    await guardarAdjuntos(ctx, { comunicadoId: c.id }, validados);
  } catch (e) {
    await ctx.db.comunicado.delete({ where: { id: c.id } });
    throw e;
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "comunicado", entidadId: c.id, detalle: { adjuntos: validados.length, destino: audiencia.tipo } });

  const vinculos = await ctx.db.apoderadoAlumno.findMany({
    where: { recibeAvisos: true, alumno: whereAlumnosDeAudiencia(audiencia) },
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
  await cargarEditable(ctx, id);
  const datos = validar(entrada);
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
  const archivos = await adjuntosDe(ctx, { comunicadoId: id });
  await ctx.db.comunicado.delete({ where: { id } }); // los adjuntos se borran en cascada de la BD
  await borrarDelProveedor(archivos);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "comunicado", entidadId: id, detalle: { titulo: c.titulo } });
}
