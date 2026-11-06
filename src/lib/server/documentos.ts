import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import type { Archivo } from "@/generated/prisma/client";
import type { Rol } from "@/generated/prisma/enums";
import type { AdjuntoVista } from "@/lib/adjuntos";
import {
  cadenaDeCarpetas, esGestorDocumentos, ROLES_DESTINO, ROLES_DESTINO_PROFESOR,
  type CarpetaPlana, type OrdenDocumento,
} from "@/lib/documentos";
import { adjuntoVista, borrarArchivos, guardarAdjuntos, validarAdjuntos, type EntradaAdjunto } from "./adjuntos";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { avisarDocumentoNuevo } from "./notificaciones/avisos-documentos";
import { salonEsActivo, salonesActivos } from "./salones-activos";
import { salonIdsVisibles, type TenantContext } from "./tenant";
import { contextoPermisosDocumento, nivelCarpeta, nivelDocumento, puedeEditarNivel } from "./documentos-permisos";
import { requireFeature } from "./plan";

// Biblioteca de documentos (specs/31). Reglas de visibilidad puras en `src/lib/documentos.ts`.

const esquemaCarpeta = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre de la carpeta.").max(80, "El nombre puede tener hasta 80 caracteres."),
});
const esquemaDocumento = z.object({
  titulo: z.string().trim().min(1, "Escribe un título.").max(150, "El título puede tener hasta 150 caracteres."),
  descripcion: z.string().trim().max(600, "La descripción puede tener hasta 600 caracteres.").nullish(),
});

export type CarpetaVista = { ambito: "biblioteca" | "unidad"; parentId: string | null; id: string; nombre: string; visibleRoles: Rol[]; salonId: string | null; elementos: number; propietario: string; createdAt: Date; updatedAt: Date; gestionable: boolean; destacado: boolean };
export type CarpetaOpcion = { id: string; ruta: string; parentId: string | null; ambito: "biblioteca" | "unidad"; editable: boolean };
export type DocumentoVista = {
  ambito: "biblioteca" | "unidad";
  id: string;
  titulo: string;
  descripcion: string | null;
  createdAt: Date;
  updatedAt: Date;
  carpetaId: string | null;
  /** Ruta de carpetas (solo útil en la búsqueda). */
  carpetaRuta: string | null;
  visibleRoles: Rol[];
  salonId: string | null;
  salon: string | null;
  autor: string;
  archivo: AdjuntoVista | null;
  gestionable: boolean;
  destacado: boolean;
};

const nombreDe = (u: { nombres: string; apellidos: string }) => `${u.nombres} ${u.apellidos}`.trim();

/** Ruta legible «Reglamento / Anexos». */
function rutaDe(mapa: ReadonlyMap<string, CarpetaPlana>, carpetaId: string | null): string {
  return cadenaDeCarpetas(mapa, carpetaId).reverse().map((c) => c.nombre).join(" / ");
}

async function cargarMapa(ctx: TenantContext): Promise<Map<string, CarpetaPlana>> {
  const filas = await ctx.db.carpetaDocumento.findMany({ select: { id: true, parentId: true, nombre: true, visibleRoles: true } });
  return new Map(filas.map((f) => [f.id, f]));
}

function requireUsoBiblioteca(ctx: TenantContext): void {
  if (!(["direccion", "administrativo", "profesor", "apoderado", "alumno"] as Rol[]).includes(ctx.rol)) forbidden();
  requireFeature(ctx, "documentos");
}

/** Subir documentos: dirección, administrativo y profesor (este, solo para sus salones). Carpetas: dirección y administrativo. */
const puedeSubir = (ctx: TenantContext) => esGestorDocumentos(ctx.rol) || ctx.rol === "profesor";
export const puedeAdministrarCarpetas = (ctx: TenantContext) => esGestorDocumentos(ctx.rol) || ctx.rol === "profesor";

function requireGestorCarpetas(ctx: TenantContext): void {
  requireUsoBiblioteca(ctx);
  if (!puedeAdministrarCarpetas(ctx)) forbidden();
}

/** Roles de destino ya limpios; el administrativo siempre se incluye en las carpetas con roles para no perder de vista lo que crea. */
function limpiarRoles(ctx: TenantContext, entrada: readonly string[], esCarpeta: boolean): Rol[] {
  const permitidos: Rol[] = ctx.rol === "profesor" ? ROLES_DESTINO_PROFESOR : ROLES_DESTINO;
  const roles = [...new Set(entrada)].filter((r): r is Rol => (permitidos as string[]).includes(r));
  if (roles.length !== new Set(entrada).size) throw new ErrorDeNegocio("Elige solo roles válidos.");
  if (esCarpeta && roles.length > 0 && ctx.rol === "administrativo" && !roles.includes("administrativo")) roles.push("administrativo");
  return roles;
}

// ───────────── Lectura ─────────────

/** Carpetas que el usuario ve, con su ruta, para los selectores de «Dentro de». */
export async function opcionesDeCarpeta(ctx: TenantContext): Promise<CarpetaOpcion[]> {
  requireUsoBiblioteca(ctx);
  const p = await contextoPermisosDocumento(ctx);
  const mapa = p.mapa;
  return [...mapa.values()]
    .filter((c) => nivelCarpeta(p, c.id) !== "ninguno")
    .filter((c) => !c.eliminadoAt)
    .map((c) => ({ id: c.id, parentId: c.parentId, ruta: rutaDe(mapa, c.id), ambito: c.ambito, editable: puedeEditarNivel(nivelCarpeta(p, c.id)) }))
    .sort((a, b) => a.ruta.localeCompare(b.ruta, "es"));
}

export type Contenido = {
  carpeta: { id: string; nombre: string; visibleRoles: Rol[]; parentId: string | null } | null;
  ruta: { id: string; nombre: string }[];
  carpetas: CarpetaVista[];
  documentos: DocumentoVista[];
  /** Hay un texto de búsqueda activo (se busca en toda la biblioteca visible). */
  buscando: boolean;
};

/** Contenido de una carpeta (o de la raíz) visible para el usuario; con `q` busca por título en toda la biblioteca visible. */
export async function listarContenido(
  ctx: TenantContext,
  { carpetaId = null, q = "", orden = "recientes", vista = "biblioteca" }: { carpetaId?: string | null; q?: string; orden?: OrdenDocumento; vista?: "biblioteca" | "unidad" | "compartido" | "recientes" | "destacados" | "papelera" } = {},
): Promise<Contenido> {
  requireUsoBiblioteca(ctx);
  const p = await contextoPermisosDocumento(ctx);
  const mapa = p.mapa;
  if (carpetaId && nivelCarpeta(p, carpetaId) === "ninguno") notFound();
  const [destacados, accesos] = await Promise.all([
    ctx.db.destacadoDocumento.findMany({ where: { membershipId: ctx.membership.id } }),
    vista === "recientes" ? ctx.db.accesoDocumento.findMany({ where: { membershipId: ctx.membership.id }, orderBy: { ultimoAt: "desc" }, take: 100 }) : Promise.resolve([]),
  ]);
  const destacadosCarpetas = new Set(destacados.map((d) => d.carpetaId));
  const destacadosDocumentos = new Set(destacados.map((d) => d.documentoId));
  const recientesCarpetas = new Set(accesos.map((a) => a.carpetaId));
  const recientesDocumentos = new Set(accesos.map((a) => a.documentoId));
  const busqueda = q.trim();

  const filas = await ctx.db.documento.findMany({
    where: { ...(busqueda ? { titulo: { contains: busqueda, mode: "insensitive" as const } } : vista === "destacados" || vista === "recientes" || vista === "compartido" || vista === "papelera" ? {} : { carpetaId }), ...(vista === "papelera" ? { eliminadoAt: { not: null } } : { eliminadoAt: null }) },
    include: {
      archivos: { orderBy: { createdAt: "desc" }, take: 1 },
      salon: { select: { nombre: true } },
      publicadoPor: { select: { user: { select: { nombres: true, apellidos: true } } } },
    },
    orderBy: orden === "titulo" ? { titulo: "asc" } : { createdAt: orden === "antiguos" ? "asc" : "desc" },
  });
  const documentos: DocumentoVista[] = filas
    .filter((d) => vista === "papelera" ? (ctx.rol === "direccion" || d.eliminadoPorId === ctx.membership.id) : nivelDocumento(p, d) !== "ninguno")
    .filter((d) => carpetaId && !busqueda ? true : vista === "unidad" ? d.ambito === "unidad" && d.publicadoPorId === ctx.membership.id && (!!busqueda || !d.carpetaId) : vista === "biblioteca" ? d.ambito === "biblioteca" && (!!busqueda || !d.carpetaId) : vista === "compartido" ? d.publicadoPorId !== ctx.membership.id && d.ambito === "unidad" : vista === "destacados" ? destacadosDocumentos.has(d.id) : vista === "recientes" ? recientesDocumentos.has(d.id) : true)
    .map((d) => ({
      ambito: d.ambito, id: d.id, titulo: d.titulo, descripcion: d.descripcion, createdAt: d.createdAt, updatedAt: d.updatedAt,
      carpetaId: d.carpetaId, carpetaRuta: d.carpetaId ? rutaDe(mapa, d.carpetaId) : null,
      visibleRoles: d.visibleRoles, salonId: d.salonId, salon: d.salon?.nombre ?? null,
      autor: nombreDe(d.publicadoPor.user), archivo: d.archivos[0] ? adjuntoVista(d.archivos[0]) : null,
      gestionable: puedeEditarNivel(nivelDocumento(p, d)) || (d.ambito === "biblioteca" && esGestorDocumentos(ctx.rol)),
      destacado: destacadosDocumentos.has(d.id),
    }));

  const hijas = [...mapa.values()].filter((c) => {
    if (busqueda && !c.nombre.toLocaleLowerCase("es").includes(busqueda.toLocaleLowerCase("es"))) return false;
    if (vista === "papelera") return !!c.eliminadoAt && (ctx.rol === "direccion" || c.creadoPorId === ctx.membership.id);
    if (nivelCarpeta(p, c.id) === "ninguno") return false;
    if (carpetaId && !busqueda) return c.parentId === carpetaId;
    if (vista === "biblioteca") return c.ambito === "biblioteca" && (busqueda || !c.parentId);
    if (vista === "unidad") return c.ambito === "unidad" && c.creadoPorId === ctx.membership.id && (busqueda || !c.parentId);
    if (vista === "compartido") return c.ambito === "unidad" && c.creadoPorId !== ctx.membership.id;
    if (vista === "destacados") return destacadosCarpetas.has(c.id);
    return recientesCarpetas.has(c.id);
  });
  const conteoDocs = hijas.length
    ? await ctx.db.documento.findMany({ where: { carpetaId: { in: hijas.map((h) => h.id) }, eliminadoAt: null }, select: { id: true, carpetaId: true, visibleRoles: true, salonId: true, publicadoPorId: true, ambito: true, eliminadoAt: true } })
    : [];
  const carpetas = hijas
    .map((h) => ({
      ambito: h.ambito, parentId: h.parentId, id: h.id, nombre: h.nombre, visibleRoles: h.visibleRoles, salonId: h.salonId, propietario: h.creadoPorId === ctx.membership.id ? "Tú" : nombreDe(h.creadoPor.user), createdAt: h.createdAt, updatedAt: h.updatedAt, gestionable: puedeEditarNivel(nivelCarpeta(p, h.id)), destacado: destacadosCarpetas.has(h.id),
      elementos:
        conteoDocs.filter((d) => d.carpetaId === h.id && nivelDocumento(p, d) !== "ninguno").length +
        [...mapa.values()].filter((c) => c.parentId === h.id && nivelCarpeta(p, c.id) !== "ninguno").length,
    }))
    .sort((a, b) => orden === "titulo" ? a.nombre.localeCompare(b.nombre, "es") : orden === "antiguos" ? a.updatedAt.getTime() - b.updatedAt.getTime() : b.updatedAt.getTime() - a.updatedAt.getTime());

  const actual = carpetaId ? mapa.get(carpetaId)! : null;
  return {
    carpeta: actual,
    ruta: cadenaDeCarpetas(mapa, carpetaId).reverse().map((c) => ({ id: c.id, nombre: c.nombre })),
    carpetas,
    documentos,
    buscando: busqueda.length > 0,
  };
}

/** Salones donde el usuario puede restringir un documento (dirección y administrativo: todos; profesor: los suyos). */
export async function salonesParaDocumentos(ctx: TenantContext): Promise<{ id: string; nombre: string }[]> {
  if (!puedeSubir(ctx)) return [];
  const ids = esGestorDocumentos(ctx.rol) ? undefined : await salonIdsVisibles(ctx);
  return salonesActivos(ctx, { id: true, nombre: true }, ids ? { id: { in: ids } } : {});
}

/** ¿Puede el usuario ver este documento (y la biblioteca está habilitada para su rol)? Lo usa la descarga. */
export async function puedeVerDocumento(ctx: TenantContext, documentoId: string): Promise<boolean> {
  if (!(["direccion", "administrativo", "profesor", "apoderado", "alumno"] as Rol[]).includes(ctx.rol)) return false;
  requireFeature(ctx, "documentos");
  const d = await ctx.db.documento.findFirst({ where: { id: documentoId, eliminadoAt: null } });
  if (!d) return false;
  return nivelDocumento(await contextoPermisosDocumento(ctx), d) !== "ninguno";
}

// ───────────── Carpetas ─────────────

async function requireCarpeta(ctx: TenantContext, id: string) {
  const c = await ctx.db.carpetaDocumento.findFirst({ where: { id, eliminadoAt: null } });
  if (!c || nivelCarpeta(await contextoPermisosDocumento(ctx), id) === "ninguno") notFound();
  return c;
}

async function requireNombreLibre(ctx: TenantContext, parentId: string | null, nombre: string, excluirId?: string, ambito: "biblioteca" | "unidad" = "biblioteca", propietarioId = ctx.membership.id) {
  const hermanas = await ctx.db.carpetaDocumento.findMany({ where: { parentId, eliminadoAt: null, ...(parentId ? {} : { ambito, ...(ambito === "unidad" ? { creadoPorId: propietarioId } : {}) }) }, select: { id: true, nombre: true } });
  if (hermanas.some((h) => h.id !== excluirId && h.nombre.toLowerCase() === nombre.toLowerCase())) {
    throw new ErrorDeNegocio("Ya existe una carpeta con ese nombre en este lugar.");
  }
}

export async function crearCarpeta(ctx: TenantContext, entrada: { nombre: string; parentId: string | null; visibleRoles?: string[]; ambito?: "biblioteca" | "unidad" }): Promise<{ id: string }> {
  requireGestorCarpetas(ctx);
  const ambito = entrada.ambito ?? "biblioteca";
  if (ctx.rol === "profesor" && ambito !== "unidad" && !entrada.parentId) forbidden();
  const { nombre } = esquemaCarpeta.parse({ nombre: entrada.nombre });
  if (entrada.parentId) {
    const padre = await requireCarpeta(ctx, entrada.parentId);
    if (!puedeEditarNivel(nivelCarpeta(await contextoPermisosDocumento(ctx), padre.id))) forbidden();
    if (padre.ambito !== ambito) throw new ErrorDeNegocio("Elige una carpeta de la misma unidad.");
  }
  await requireNombreLibre(ctx, entrada.parentId, nombre, undefined, ambito);
  const c = await ctx.db.carpetaDocumento.create({
    data: { tenantId: ctx.tenant.id, parentId: entrada.parentId, nombre, ambito, visibleRoles: limpiarRoles(ctx, entrada.visibleRoles ?? [], true), creadoPorId: ctx.membership.id },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "carpeta_documento", entidadId: c.id, detalle: { nombre } });
  return { id: c.id };
}

/** Descendientes de una carpeta (sin incluirla). */
function descendientes(mapa: ReadonlyMap<string, CarpetaPlana>, id: string): Set<string> {
  const salida = new Set<string>();
  const pendientes = [id];
  while (pendientes.length) {
    const actual = pendientes.pop()!;
    for (const c of mapa.values()) if (c.parentId === actual && !salida.has(c.id)) { salida.add(c.id); pendientes.push(c.id); }
  }
  return salida;
}

/** Cambia nombre, destinatarios y/o ubicación de una carpeta (mover a otra o a la raíz con `parentId: null`). */
export async function editarCarpeta(ctx: TenantContext, id: string, entrada: { nombre: string; parentId: string | null; visibleRoles: string[] }): Promise<void> {
  requireGestorCarpetas(ctx);
  const actual = await requireCarpeta(ctx, id);
  if (!puedeEditarNivel(nivelCarpeta(await contextoPermisosDocumento(ctx), id))) forbidden();
  const { nombre } = esquemaCarpeta.parse({ nombre: entrada.nombre });
  const mapa = await cargarMapa(ctx);
  if (entrada.parentId) {
    if (entrada.parentId === id || descendientes(mapa, id).has(entrada.parentId)) throw new ErrorDeNegocio("No puedes mover una carpeta dentro de sí misma o de una de sus subcarpetas.");
    const destino = await requireCarpeta(ctx, entrada.parentId);
    if (destino.ambito !== actual.ambito || !puedeEditarNivel(nivelCarpeta(await contextoPermisosDocumento(ctx), destino.id))) forbidden();
  }
  await requireNombreLibre(ctx, entrada.parentId, nombre, id, actual.ambito, actual.creadoPorId);
  await ctx.db.carpetaDocumento.update({ where: { id }, data: { nombre, parentId: entrada.parentId, visibleRoles: limpiarRoles(ctx, entrada.visibleRoles, true) } });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "carpeta_documento", entidadId: id,
    detalle: { nombre, antes: actual.nombre, movida: actual.parentId !== entrada.parentId },
  });
}

/** Borra la carpeta con sus subcarpetas y documentos; los archivos del proveedor se borran después de la BD. */
export async function borrarCarpeta(ctx: TenantContext, id: string): Promise<{ documentos: number }> {
  requireGestorCarpetas(ctx);
  const c = await requireCarpeta(ctx, id);
  if (!puedeEditarNivel(nivelCarpeta(await contextoPermisosDocumento(ctx), id))) forbidden();
  const ids = [id, ...descendientes(await cargarMapa(ctx), id)];
  const documentos = await ctx.db.documento.count({ where: { carpetaId: { in: ids }, eliminadoAt: null } });
  const ahora = new Date();
  await ctx.db.carpetaDocumento.updateMany({ where: { id: { in: ids } }, data: { eliminadoAt: ahora, eliminadoPorId: ctx.membership.id } });
  await ctx.db.documento.updateMany({ where: { carpetaId: { in: ids } }, data: { eliminadoAt: ahora, eliminadoPorId: ctx.membership.id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "carpeta_documento", entidadId: id, detalle: { nombre: c.nombre, subcarpetas: ids.length - 1, documentos } });
  return { documentos };
}

// ───────────── Documentos ─────────────

export type EntradaDocumento = {
  titulo: string;
  descripcion?: string | null;
  carpetaId: string | null;
  visibleRoles: string[];
  salonId: string | null;
  avisar?: boolean;
  ambito?: "biblioteca" | "unidad";
};

/** Valida destinatarios y salón según el rol (el profesor: solo sus salones, salón obligatorio). */
async function validarDestino(ctx: TenantContext, entrada: Pick<EntradaDocumento, "visibleRoles" | "salonId" | "carpetaId" | "ambito">) {
  const visibleRoles = limpiarRoles(ctx, entrada.visibleRoles, false);
  if (entrada.salonId) {
    if (ctx.rol === "profesor" && !(await salonIdsVisibles(ctx)).includes(entrada.salonId)) forbidden();
    if (!(await salonEsActivo(ctx, entrada.salonId))) throw new ErrorDeNegocio("Ese salón está archivado o no existe.");
  } else if (ctx.rol === "profesor" && !entrada.carpetaId && entrada.ambito !== "unidad") {
    throw new ErrorDeNegocio("Elige uno de tus salones.");
  }
  if (entrada.carpetaId) {
    const carpeta = await requireCarpeta(ctx, entrada.carpetaId);
    if (!puedeEditarNivel(nivelCarpeta(await contextoPermisosDocumento(ctx), carpeta.id))) forbidden();
  }
  return visibleRoles;
}

/** Un documento con un archivo (PDF, imagen, DOCX o XLSX de hasta 10 MB). Con `avisar` encola correo y push a las familias que lo ven. */
export async function subirDocumento(ctx: TenantContext, entrada: EntradaDocumento, archivo: EntradaAdjunto | null): Promise<{ id: string; avisados: number }> {
  requireUsoBiblioteca(ctx);
  if (!puedeSubir(ctx)) forbidden();
  const datos = esquemaDocumento.parse({ titulo: entrada.titulo, descripcion: entrada.descripcion || null });
  if (!archivo) throw new ErrorDeNegocio("Elige el archivo del documento.");
  const visibleRoles = await validarDestino(ctx, entrada);
  const ambito = entrada.carpetaId ? (await requireCarpeta(ctx, entrada.carpetaId)).ambito : entrada.ambito ?? "biblioteca";
  if (ctx.rol === "profesor" && ambito === "biblioteca" && !entrada.carpetaId && !entrada.salonId) forbidden();
  const [validado] = validarAdjuntos([archivo]);

  const d = await ctx.db.documento.create({
    data: {
      tenantId: ctx.tenant.id, carpetaId: entrada.carpetaId, titulo: datos.titulo, descripcion: datos.descripcion || null,
      visibleRoles, salonId: entrada.salonId, publicadoPorId: ctx.membership.id, ambito,
    },
  });
  try {
    await guardarAdjuntos(ctx, { documentoId: d.id }, [validado]);
  } catch (e) {
    await ctx.db.documento.delete({ where: { id: d.id } });
    throw e;
  }
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "documento", entidadId: d.id,
    detalle: { titulo: datos.titulo, roles: visibleRoles, salonId: entrada.salonId, carpetaId: entrada.carpetaId },
  });
  const avisados = entrada.avisar ? await avisarDocumentoNuevo(ctx, d.id) : 0;
  return { id: d.id, avisados };
}

async function requireDocumentoGestionable(ctx: TenantContext, id: string) {
  requireUsoBiblioteca(ctx);
  if (!puedeSubir(ctx)) forbidden();
  const d = await ctx.db.documento.findFirst({ where: { id, eliminadoAt: null } });
  if (!d || !(await puedeVerDocumento(ctx, id))) notFound();
  if (!puedeEditarNivel(nivelDocumento(await contextoPermisosDocumento(ctx), d)) && !(d.ambito === "biblioteca" && esGestorDocumentos(ctx.rol))) forbidden();
  return d;
}

/** Cambia título, descripción, destinatarios, salón y/o carpeta de un documento. No vuelve a avisar. */
export async function editarDocumento(ctx: TenantContext, id: string, entrada: Omit<EntradaDocumento, "avisar">): Promise<void> {
  const actual = await requireDocumentoGestionable(ctx, id);
  const datos = esquemaDocumento.parse({ titulo: entrada.titulo, descripcion: entrada.descripcion || null });
  const visibleRoles = await validarDestino(ctx, { ...entrada, ambito: actual.ambito });
  const ambito = entrada.carpetaId ? (await requireCarpeta(ctx, entrada.carpetaId)).ambito : actual.ambito;
  await ctx.db.documento.update({
    where: { id },
    data: { titulo: datos.titulo, descripcion: datos.descripcion || null, visibleRoles, salonId: entrada.salonId, carpetaId: entrada.carpetaId, ambito },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "documento", entidadId: id, detalle: { titulo: datos.titulo, roles: visibleRoles, salonId: entrada.salonId } });
}

/** Reemplazar el archivo: gana el más reciente. Se sube el nuevo y se borra el anterior (sin historial de versiones). */
export async function reemplazarArchivoDocumento(ctx: TenantContext, id: string, archivo: EntradaAdjunto): Promise<void> {
  await requireDocumentoGestionable(ctx, id);
  const [validado] = validarAdjuntos([archivo]);
  const anteriores: Archivo[] = await ctx.db.archivo.findMany({ where: { documentoId: id } });
  await guardarAdjuntos(ctx, { documentoId: id }, [validado]);
  await borrarArchivos(ctx, anteriores);
  await ctx.db.documento.update({ where: { id }, data: { updatedAt: new Date() } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "documento", entidadId: id, detalle: { archivoReemplazado: validado.nombre } });
}

export async function borrarDocumento(ctx: TenantContext, id: string): Promise<void> {
  const d = await requireDocumentoGestionable(ctx, id);
  await ctx.db.documento.update({ where: { id }, data: { eliminadoAt: new Date(), eliminadoPorId: ctx.membership.id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "documento", entidadId: id, detalle: { titulo: d.titulo } });
}
