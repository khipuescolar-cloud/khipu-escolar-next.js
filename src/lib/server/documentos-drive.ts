import "server-only";
import { forbidden, notFound } from "next/navigation";
import type { NivelCompartidoDocumento, Rol } from "@/generated/prisma/enums";
import { borrarDelProveedor } from "./adjuntos";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { ETIQUETA_DESTINO, cadenaDeCarpetas } from "@/lib/documentos";
import { contextoPermisosDocumento, nivelCarpeta, nivelDocumento, puedeEditarNivel } from "./documentos-permisos";
import { requireFeature } from "./plan";
import { salonIdsVisibles, type TenantContext } from "./tenant";

export type RecursoDocumento = { tipo: "carpeta" | "documento"; id: string };
const rolesPermitidos: Rol[] = ["apoderado", "alumno", "profesor", "administrativo"];
function habilitar(ctx: TenantContext) {
  if (ctx.rol === "porteria") forbidden();
  requireFeature(ctx, "documentos");
}
async function recurso(ctx: TenantContext, r: RecursoDocumento) {
  habilitar(ctx);
  const p = await contextoPermisosDocumento(ctx);
  const fila = r.tipo === "carpeta" ? await ctx.db.carpetaDocumento.findFirst({ where: { id: r.id } }) : await ctx.db.documento.findFirst({ where: { id: r.id } });
  if (!fila) notFound();
  const nivel = r.tipo === "carpeta" ? nivelCarpeta(p, r.id) : nivelDocumento(p, fila as Parameters<typeof nivelDocumento>[1]);
  return { fila, nivel, p };
}

export async function personasParaCompartir(ctx: TenantContext) {
  habilitar(ctx);
  const idsSalones = ctx.rol === "profesor" ? await salonIdsVisibles(ctx) : undefined;
  const [personas, salones, propios] = await Promise.all([
    ctx.db.membership.findMany({ where: { estado: "activa", rol: { in: ["direccion", ...rolesPermitidos] } }, select: { id: true, rol: true, user: { select: { nombres: true, apellidos: true, email: true } } }, orderBy: { user: { apellidos: "asc" } } }),
    ctx.db.salon.findMany({ where: { id: { in: idsSalones } }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    idsSalones
      ? Promise.all([
        ctx.db.alumno.findMany({ where: { salonId: { in: idsSalones }, cuentaId: { not: null } }, select: { cuentaId: true } }),
        ctx.db.apoderadoAlumno.findMany({ where: { alumno: { salonId: { in: idsSalones } } }, select: { apoderadoId: true } }),
      ])
      : null,
  ]);
  // Un profesor solo ve a las familias y alumnos de sus salones (el servidor lo vuelve a exigir al compartir).
  const permitidos = propios ? new Set([...propios[0].map((a) => a.cuentaId), ...propios[1].map((a) => a.apoderadoId)]) : null;
  const visibles = personas.filter((m) => !permitidos || (m.rol !== "apoderado" && m.rol !== "alumno") || permitidos.has(m.id));
  return { personas: visibles.map((m) => ({ id: m.id, rol: m.rol, nombre: `${m.user.nombres} ${m.user.apellidos}`, email: m.user.email })), salones };
}

export async function accesosDeRecurso(ctx: TenantContext, r: RecursoDocumento) {
  const { nivel } = await recurso(ctx, r);
  if (nivel === "ninguno") notFound();
  const shares = await ctx.db.compartidoDocumento.findMany({ where: r.tipo === "carpeta" ? { carpetaId: r.id } : { documentoId: r.id }, include: { membership: { select: { rol: true, user: { select: { nombres: true, apellidos: true, email: true } } } }, salon: { select: { nombre: true } } }, orderBy: { createdAt: "asc" } });
  return shares.map((s) => ({ id: s.id, nivel: s.nivel, membershipId: s.membershipId, rol: s.rol, salonId: s.salonId, rolDestino: (s.membership?.rol ?? s.rol) as Rol | null, nombre: s.membership ? `${s.membership.user.nombres} ${s.membership.user.apellidos}` : `${ETIQUETA_DESTINO[s.rol ?? ""] ?? s.rol}${s.salon ? ` de ${s.salon.nombre}` : " · todo el colegio"}`, email: s.membership?.user.email ?? null, salon: s.salon?.nombre ?? null }));
}

/** Todo lo que necesita el diálogo Compartir y el panel de detalles: propietario, accesos propios, accesos heredados de carpetas padre y acceso general. */
export async function detalleAccesos(ctx: TenantContext, r: RecursoDocumento) {
  const { fila, nivel, p } = await recurso(ctx, r);
  if (nivel === "ninguno") notFound();
  const propias = await accesosDeRecurso(ctx, r);
  const propietarioId = r.tipo === "carpeta" ? (fila as { creadoPorId: string }).creadoPorId : (fila as { publicadoPorId: string }).publicadoPorId;
  const propietario = await ctx.db.membership.findFirst({ where: { id: propietarioId }, select: { rol: true, user: { select: { nombres: true, apellidos: true, email: true } } } });
  const cadena = cadenaDeCarpetas(p.mapa, r.tipo === "carpeta" ? (fila as { parentId: string | null }).parentId : (fila as { carpetaId: string | null }).carpetaId);
  const heredadas = cadena.length
    ? await ctx.db.compartidoDocumento.findMany({ where: { carpetaId: { in: cadena.map((c) => c.id) } }, include: { membership: { select: { rol: true, user: { select: { nombres: true, apellidos: true, email: true } } } }, salon: { select: { nombre: true } } }, orderBy: { createdAt: "asc" } })
    : [];
  const nombreCarpeta = new Map(cadena.map((c) => [c.id, c.nombre]));
  return {
    puedeCompartir: puedeEditarNivel(nivel),
    propietario: propietario ? { nombre: `${propietario.user.nombres} ${propietario.user.apellidos}`, rol: propietario.rol as Rol, email: propietario.user.email, esTu: propietarioId === ctx.membership.id } : null,
    general: { roles: (fila as { visibleRoles: Rol[] }).visibleRoles, salonId: (fila as { salonId: string | null }).salonId, ambito: (fila as { ambito: "biblioteca" | "unidad" }).ambito },
    entradas: propias,
    heredadas: heredadas.map((s) => ({ id: s.id, nivel: s.nivel, rolDestino: (s.membership?.rol ?? s.rol) as Rol | null, nombre: s.membership ? `${s.membership.user.nombres} ${s.membership.user.apellidos}` : `${ETIQUETA_DESTINO[s.rol ?? ""] ?? s.rol}${s.salon ? ` de ${s.salon.nombre}` : " · todo el colegio"}`, email: s.membership?.user.email ?? null, desde: nombreCarpeta.get(s.carpetaId ?? "") ?? "carpeta" })),
  };
}

/** Cambia el nombre de una carpeta o el título de un documento (solo con permiso de edición). */
export async function renombrarRecurso(ctx: TenantContext, r: RecursoDocumento, nombreNuevo: string) {
  const actual = await recurso(ctx, r);
  if (!puedeEditarNivel(actual.nivel)) forbidden();
  const nombre = nombreNuevo.trim();
  if (!nombre) throw new ErrorDeNegocio("Escribe un nombre.");
  if (nombre.length > (r.tipo === "carpeta" ? 80 : 150)) throw new ErrorDeNegocio(`El nombre puede tener hasta ${r.tipo === "carpeta" ? 80 : 150} caracteres.`);
  if (r.tipo === "carpeta") {
    const c = actual.fila as { id: string; parentId: string | null; ambito: "biblioteca" | "unidad"; creadoPorId: string };
    const hermanas = await ctx.db.carpetaDocumento.findMany({ where: { parentId: c.parentId, eliminadoAt: null, ...(c.parentId ? {} : { ambito: c.ambito, ...(c.ambito === "unidad" ? { creadoPorId: c.creadoPorId } : {}) }) }, select: { id: true, nombre: true } });
    if (hermanas.some((h) => h.id !== c.id && h.nombre.toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es"))) throw new ErrorDeNegocio("Ya existe una carpeta con ese nombre en este lugar.");
    await ctx.db.carpetaDocumento.update({ where: { id: r.id }, data: { nombre } });
  } else await ctx.db.documento.update({ where: { id: r.id }, data: { titulo: nombre } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: r.tipo === "carpeta" ? "carpeta_documento" : "documento", entidadId: r.id, detalle: { renombrar: nombre } });
}

export async function compartirRecurso(ctx: TenantContext, r: RecursoDocumento, destinatario: { membershipId?: string; rol?: Rol; salonId?: string | null }, nivel: NivelCompartidoDocumento) {
  const actual = await recurso(ctx, r);
  if (!puedeEditarNivel(actual.nivel)) forbidden();
  if (Boolean(destinatario.membershipId) === Boolean(destinatario.rol)) throw new ErrorDeNegocio("Elige una persona o un grupo.");
  if (destinatario.rol && !rolesPermitidos.includes(destinatario.rol)) forbidden();
  if (ctx.rol === "profesor" && destinatario.rol && !destinatario.salonId) forbidden();
  if (destinatario.salonId) {
    const salon = await ctx.db.salon.findFirst({ where: { id: destinatario.salonId } });
    if (!salon) notFound();
    if (ctx.rol === "profesor" && !(await salonIdsVisibles(ctx)).includes(salon.id)) forbidden();
  }
  if (destinatario.membershipId) {
    const miembro = await ctx.db.membership.findFirst({ where: { id: destinatario.membershipId, estado: "activa" } });
    if (!miembro || miembro.rol === "porteria") notFound();
    if (nivel === "editor" && ["apoderado", "alumno"].includes(miembro.rol)) forbidden();
    if (ctx.rol === "profesor" && ["apoderado", "alumno"].includes(miembro.rol)) {
      const salones = await salonIdsVisibles(ctx);
      // El grupo de familias/alumnos se limita al salón del profesor; para personas se comprueba su pertenencia.
      const visibles = miembro.rol === "alumno"
        ? await ctx.db.alumno.count({ where: { cuentaId: miembro.id, salonId: { in: salones } } })
        : await ctx.db.apoderadoAlumno.count({ where: { apoderadoId: miembro.id, alumno: { salonId: { in: salones } } } });
      if (!visibles) forbidden();
    }
  }
  if (nivel === "editor" && ["apoderado", "alumno"].includes(destinatario.rol ?? "")) forbidden();
  const where = { ...(r.tipo === "carpeta" ? { carpetaId: r.id } : { documentoId: r.id }), membershipId: destinatario.membershipId ?? null, rol: destinatario.rol ?? null, salonId: destinatario.salonId ?? null };
  const existente = await ctx.db.compartidoDocumento.findFirst({ where });
  if (existente) await ctx.db.compartidoDocumento.update({ where: { id: existente.id }, data: { nivel } });
  else await ctx.db.compartidoDocumento.create({ data: { ...where, creadoPorId: ctx.membership.id, nivel, tenantId: ctx.tenant.id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: r.tipo, entidadId: r.id, detalle: { compartir: true, nivel } });
}

export async function quitarAccesoRecurso(ctx: TenantContext, r: RecursoDocumento, compartidoId: string) {
  const actual = await recurso(ctx, r);
  if (!puedeEditarNivel(actual.nivel)) forbidden();
  const share = await ctx.db.compartidoDocumento.findFirst({ where: { id: compartidoId, ...(r.tipo === "carpeta" ? { carpetaId: r.id } : { documentoId: r.id }) } });
  if (!share) notFound();
  await ctx.db.compartidoDocumento.delete({ where: { id: share.id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: r.tipo, entidadId: r.id, detalle: { accesoQuitado: true } });
}

export async function cambiarAccesoGeneral(ctx: TenantContext, r: RecursoDocumento, roles: Rol[], salonId: string | null) {
  const actual = await recurso(ctx, r);
  if (!puedeEditarNivel(actual.nivel)) forbidden();
  if (roles.some((rol) => !rolesPermitidos.includes(rol) || (ctx.rol === "profesor" && rol === "administrativo"))) forbidden();
  if (salonId) {
    if (!(await ctx.db.salon.count({ where: { id: salonId } }))) notFound();
    if (ctx.rol === "profesor" && !(await salonIdsVisibles(ctx)).includes(salonId)) forbidden();
  } else if (ctx.rol === "profesor" && roles.length > 0) forbidden();
  if (r.tipo === "carpeta") await ctx.db.carpetaDocumento.update({ where: { id: r.id }, data: { visibleRoles: roles, salonId } });
  else await ctx.db.documento.update({ where: { id: r.id }, data: { visibleRoles: roles, salonId } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: r.tipo, entidadId: r.id, detalle: { accesoGeneral: true, roles, salonId } });
}

export async function destacarRecurso(ctx: TenantContext, r: RecursoDocumento, destacar: boolean) {
  const actual = await recurso(ctx, r);
  if (actual.nivel === "ninguno") notFound();
  const where = { membershipId: ctx.membership.id, ...(r.tipo === "carpeta" ? { carpetaId: r.id } : { documentoId: r.id }) };
  const previo = await ctx.db.destacadoDocumento.findFirst({ where });
  if (destacar && !previo) await ctx.db.destacadoDocumento.create({ data: { ...where, tenantId: ctx.tenant.id } });
  if (!destacar && previo) await ctx.db.destacadoDocumento.delete({ where: { id: previo.id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: r.tipo, entidadId: r.id, detalle: { destacado: destacar } });
}

export async function moverRecurso(ctx: TenantContext, r: RecursoDocumento, destinoId: string | null) {
  const actual = await recurso(ctx, r);
  if (!puedeEditarNivel(actual.nivel)) forbidden();
  const destino = destinoId ? await recurso(ctx, { tipo: "carpeta", id: destinoId }) : null;
  if (destino && (!puedeEditarNivel(destino.nivel) || destino.fila.eliminadoAt)) forbidden();
  if (r.tipo === "carpeta") {
    const carpeta = actual.fila as Awaited<ReturnType<TenantContext["db"]["carpetaDocumento"]["findFirst"]>>;
    if (!carpeta) notFound();
    if (destinoId === r.id) throw new ErrorDeNegocio("No puedes mover una carpeta dentro de sí misma.");
    if (destino) {
      const padre = destino.fila as typeof carpeta;
      if (padre?.ambito !== carpeta.ambito) forbidden();
      let id: string | null = padre.id;
      while (id) {
        if (id === r.id) throw new ErrorDeNegocio("No puedes mover una carpeta dentro de una subcarpeta suya.");
        id = (await ctx.db.carpetaDocumento.findFirst({ where: { id }, select: { parentId: true } }))?.parentId ?? null;
      }
    }
    const hermanos = await ctx.db.carpetaDocumento.findMany({ where: { parentId: destinoId, eliminadoAt: null, ambito: carpeta.ambito }, select: { id: true, nombre: true } });
    if (hermanos.some((h) => h.id !== carpeta.id && h.nombre.toLocaleLowerCase("es") === carpeta.nombre.toLocaleLowerCase("es"))) throw new ErrorDeNegocio("Ya existe una carpeta con ese nombre en el destino.");
    await ctx.db.carpetaDocumento.update({ where: { id: r.id }, data: { parentId: destinoId } });
  } else {
    const doc = actual.fila as Awaited<ReturnType<TenantContext["db"]["documento"]["findFirst"]>>;
    if (!doc) notFound();
    await ctx.db.documento.update({ where: { id: r.id }, data: { carpetaId: destinoId, ambito: destino ? (destino.fila as { ambito: "biblioteca" | "unidad" }).ambito : doc.ambito } });
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: r.tipo, entidadId: r.id, detalle: { mover: true, destinoId } });
}

export async function registrarAccesoDocumento(ctx: TenantContext, r: RecursoDocumento) {
  const actual = await recurso(ctx, r);
  if (actual.nivel === "ninguno") notFound();
  const where = { membershipId: ctx.membership.id, ...(r.tipo === "carpeta" ? { carpetaId: r.id } : { documentoId: r.id }) };
  const previo = await ctx.db.accesoDocumento.findFirst({ where });
  if (previo) await ctx.db.accesoDocumento.update({ where: { id: previo.id }, data: { ultimoAt: new Date() } });
  else await ctx.db.accesoDocumento.create({ data: { ...where, tenantId: ctx.tenant.id } });
}

export async function restaurarRecurso(ctx: TenantContext, r: RecursoDocumento) {
  habilitar(ctx);
  const where = { id: r.id, ...(ctx.rol === "direccion" ? {} : { eliminadoPorId: ctx.membership.id }) };
  if (r.tipo === "carpeta") {
    const c = await ctx.db.carpetaDocumento.findFirst({ where: { ...where, eliminadoAt: { not: null } } });
    if (!c) notFound();
    const hermanas = await ctx.db.carpetaDocumento.findMany({ where: { parentId: c.parentId, eliminadoAt: null, ambito: c.ambito }, select: { nombre: true } });
    if (hermanas.some((h) => h.nombre.toLocaleLowerCase("es") === c.nombre.toLocaleLowerCase("es"))) throw new ErrorDeNegocio("Ya existe una carpeta con ese nombre. Renombra la carpeta nueva antes de restaurar.");
    let padreId = c.parentId;
    while (padreId) {
      const padre = await ctx.db.carpetaDocumento.findFirst({ where: { id: padreId }, select: { id: true, parentId: true, eliminadoAt: true } });
      if (!padre) break;
      if (padre.eliminadoAt) await ctx.db.carpetaDocumento.update({ where: { id: padre.id }, data: { eliminadoAt: null, eliminadoPorId: null } });
      padreId = padre.parentId;
    }
    const ids = await idsSubarbol(ctx, c.id);
    if (await ctx.db.documento.count({ where: { carpetaId: { in: ids }, oficial: true } })) throw new ErrorDeNegocio("La carpeta contiene documentos oficiales. Archívalos.");
    await ctx.db.carpetaDocumento.updateMany({ where: { id: { in: ids } }, data: { eliminadoAt: null, eliminadoPorId: null } });
    await ctx.db.documento.updateMany({ where: { carpetaId: { in: ids } }, data: { eliminadoAt: null, eliminadoPorId: null } });
  } else {
    const d = await ctx.db.documento.findFirst({ where: { ...where, eliminadoAt: { not: null } } });
    if (!d) notFound();
    let padreId = d.carpetaId;
    while (padreId) {
      const padre = await ctx.db.carpetaDocumento.findFirst({ where: { id: padreId }, select: { id: true, parentId: true, eliminadoAt: true } });
      if (!padre) break;
      if (padre.eliminadoAt) await ctx.db.carpetaDocumento.update({ where: { id: padre.id }, data: { eliminadoAt: null, eliminadoPorId: null } });
      padreId = padre.parentId;
    }
    await ctx.db.documento.update({ where: { id: d.id }, data: { eliminadoAt: null, eliminadoPorId: null } });
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: r.tipo, entidadId: r.id, detalle: { restaurar: true } });
}

async function idsSubarbol(ctx: TenantContext, id: string) {
  const todas = await ctx.db.carpetaDocumento.findMany({ select: { id: true, parentId: true } });
  const ids = [id];
  for (let i = 0; i < ids.length; i++) for (const c of todas) if (c.parentId === ids[i] && !ids.includes(c.id)) ids.push(c.id);
  return ids;
}

export async function eliminarDefinitivoRecurso(ctx: TenantContext, r: RecursoDocumento) {
  habilitar(ctx);
  const where = { id: r.id, eliminadoAt: { not: null }, ...(ctx.rol === "direccion" ? {} : { eliminadoPorId: ctx.membership.id }) };
  if (r.tipo === "carpeta") {
    const c = await ctx.db.carpetaDocumento.findFirst({ where });
    if (!c) notFound();
    const ids = await idsSubarbol(ctx, c.id);
    const archivos = await ctx.db.archivo.findMany({ where: { documento: { carpetaId: { in: ids } } } });
    await ctx.db.carpetaDocumento.delete({ where: { id: c.id } });
    await borrarDelProveedor(archivos);
  } else {
    const d = await ctx.db.documento.findFirst({ where });
    if (!d) notFound();
    if (d.oficial) throw new ErrorDeNegocio("Un documento oficial no se puede eliminar para siempre.");
    const archivos = await ctx.db.archivo.findMany({ where: { documentoId: d.id } });
    await ctx.db.documento.delete({ where: { id: d.id } });
    await borrarDelProveedor(archivos);
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: r.tipo, entidadId: r.id, detalle: { definitivo: true } });
}

export function vencimientoPapelera(eliminadoAt: Date, ahora = new Date()) { return ahora.getTime() - eliminadoAt.getTime() >= 30 * 86_400_000; }

export async function vaciarPapeleraVencida(ctx: TenantContext, ahora = new Date()) {
  habilitar(ctx);
  if (ctx.rol !== "direccion") forbidden();
  const limite = new Date(ahora.getTime() - 30 * 86_400_000);
  const carpetas = await ctx.db.carpetaDocumento.findMany({ where: { eliminadoAt: { lte: limite }, documentos: { none: { oficial: true } } }, select: { id: true } });
  const documentos = await ctx.db.documento.findMany({ where: { eliminadoAt: { lte: limite }, oficial: false }, select: { id: true } });
  for (const c of carpetas) if (await ctx.db.carpetaDocumento.count({ where: { id: c.id } })) await eliminarDefinitivoRecurso(ctx, { tipo: "carpeta", id: c.id });
  for (const d of documentos) if (await ctx.db.documento.count({ where: { id: d.id } })) await eliminarDefinitivoRecurso(ctx, { tipo: "documento", id: d.id });
}
