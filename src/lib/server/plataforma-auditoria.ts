import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { inicioDiaLima, sumarDias } from "@/lib/fechas";
import { db } from "./db";
import type { AdminContext } from "./plataforma";

// Bitácora de la plataforma (specs/21-operacion-de-plataforma.md §Auditoría).
// Solo lectura sobre `auditoria_plataforma`. El detalle se muestra sin datos sensibles.

/** Acción de plataforma → texto legible. Las acciones que no estén aquí se muestran tal cual. */
export const TEXTO_ACCION: Record<string, string> = {
  crear_colegio: "Creó un colegio",
  cambiar_plan: "Cambió el plan de un colegio",
  cambiar_estado: "Cambió el estado de un colegio",
  editar_colegio: "Editó los datos de un colegio",
  cambiar_insignia: "Cambió la insignia de un colegio",
  reenviar_bienvenida: "Reenvió una bienvenida",
  agregar_administrador: "Agregó un administrador a un colegio",
  exportar_colegio: "Exportó los datos de un colegio",
  soporte_inicio: "Entró como soporte a un colegio",
  soporte_fin: "Terminó un acceso de soporte",
  usuario_restablecer_password: "Restableció la contraseña de una persona",
  usuario_enviar_recuperacion: "Envió un enlace de recuperación",
  usuario_membresia_estado: "Cambió el estado de una membresía",
  usuario_forzar_cambio_password: "Obligó a cambiar la contraseña",
  avisos_reintentar: "Reintentó los avisos con error de un colegio",
  cola_procesar: "Procesó la cola de avisos",
  mesa_responder: "Respondió en la mesa de ayuda",
  mesa_nota_interna: "Agregó una nota interna en la mesa de ayuda",
  mesa_asignar: "Asignó una conversación de la mesa de ayuda",
  mesa_estado: "Cambió el estado de una conversación de la mesa de ayuda",
  mesa_prioridad: "Cambió la prioridad de una conversación de la mesa de ayuda",
};

export function textoAccion(accion: string): string {
  return TEXTO_ACCION[accion] ?? accion.replaceAll("_", " ");
}

/** Registra una acción de operación (acepta cualquier nombre de acción, sin tocar el tipo de `plataforma.ts`). */
export async function registrarAuditoriaPlataforma(
  admin: AdminContext,
  accion: string,
  tenantId: string | null,
  detalle?: Prisma.InputJsonValue,
): Promise<void> {
  await db.auditoriaPlataforma.create({ data: { actorId: admin.user.id, accion, tenantId, detalle: detalle ?? Prisma.JsonNull } });
}

const CLAVE_SENSIBLE = /pass|contrase|token|secret|clave|documento|dni|hash|key/i;

/** Copia del detalle con los valores de claves sensibles ocultos (recursivo). */
export function detalleSinSensibles(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(detalleSinSensibles);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([k, v]) => [k, CLAVE_SENSIBLE.test(k) && v !== null && typeof v !== "boolean" ? "[oculto]" : detalleSinSensibles(v)]),
    );
  }
  return valor;
}

export const LIMITE_PAGINA_AUDITORIA = 25;
export const LIMITE_EXPORTACION_AUDITORIA = 5000;

const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined);

export const esquemaFiltroAuditoria = z.object({
  tenantId: z.uuid().optional().catch(undefined),
  accion: z.string().trim().max(60).optional().catch(undefined),
  actor: z.string().trim().max(80).optional().catch(undefined),
  desde: fechaIso,
  hasta: fechaIso,
  cursor: z.string().regex(/^\d{1,18}$/).optional().catch(undefined),
});
export type FiltroAuditoria = z.input<typeof esquemaFiltroAuditoria>;

export type FilaAuditoria = {
  id: string;
  fecha: Date;
  accion: string;
  texto: string;
  actor: { id: string; nombre: string; email: string } | null;
  colegio: { id: string; nombre: string } | null;
  detalle: unknown;
};

async function dondeDe(filtroCrudo: FiltroAuditoria): Promise<Prisma.AuditoriaPlataformaWhereInput> {
  const f = esquemaFiltroAuditoria.parse(filtroCrudo);
  const donde: Prisma.AuditoriaPlataformaWhereInput = {};
  if (f.tenantId) donde.tenantId = f.tenantId;
  if (f.accion) donde.accion = f.accion;
  if (f.actor) {
    const perfiles = await db.profile.findMany({
      where: {
        adminPlataforma: { isNot: null },
        OR: [
          { email: { contains: f.actor, mode: "insensitive" } },
          { nombres: { contains: f.actor, mode: "insensitive" } },
          { apellidos: { contains: f.actor, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    donde.actorId = { in: perfiles.map((p) => p.id) };
  }
  const rango: Prisma.DateTimeFilter = {};
  if (f.desde) rango.gte = inicioDiaLima(f.desde);
  if (f.hasta) rango.lt = inicioDiaLima(sumarDias(f.hasta, 1));
  if (rango.gte || rango.lt) donde.createdAt = rango;
  if (f.cursor) donde.id = { lt: BigInt(f.cursor) };
  return donde;
}

async function enriquecer(filas: Awaited<ReturnType<typeof db.auditoriaPlataforma.findMany>>): Promise<FilaAuditoria[]> {
  const actorIds = [...new Set(filas.map((f) => f.actorId))];
  const tenantIds = [...new Set(filas.flatMap((f) => (f.tenantId ? [f.tenantId] : [])))];
  const [perfiles, colegios] = await Promise.all([
    db.profile.findMany({ where: { id: { in: actorIds } }, select: { id: true, nombres: true, apellidos: true, email: true } }),
    db.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, nombre: true } }),
  ]);
  return filas.map((f) => {
    const p = perfiles.find((x) => x.id === f.actorId);
    const c = colegios.find((x) => x.id === f.tenantId);
    return {
      id: f.id.toString(),
      fecha: f.createdAt,
      accion: f.accion,
      texto: textoAccion(f.accion),
      actor: p ? { id: p.id, nombre: `${p.nombres} ${p.apellidos}`.trim(), email: p.email } : null,
      colegio: c ? { id: c.id, nombre: c.nombre } : null,
      detalle: f.detalle === null ? null : detalleSinSensibles(f.detalle),
    };
  });
}

/** Una página de la bitácora (más reciente primero) con paginación por cursor. */
export async function listarAuditoria(_admin: AdminContext, filtro: FiltroAuditoria = {}, limite = LIMITE_PAGINA_AUDITORIA) {
  const filas = await db.auditoriaPlataforma.findMany({ where: await dondeDe(filtro), orderBy: { id: "desc" }, take: limite + 1 });
  const hayMas = filas.length > limite;
  const pagina = filas.slice(0, limite);
  return { filas: await enriquecer(pagina), siguienteCursor: hayMas ? pagina[pagina.length - 1].id.toString() : null };
}

/** Todas las filas que coinciden (hasta el tope), para el CSV. El cursor del filtro se ignora. */
export async function exportarAuditoria(_admin: AdminContext, filtro: FiltroAuditoria = {}): Promise<FilaAuditoria[]> {
  const filas = await db.auditoriaPlataforma.findMany({
    where: await dondeDe({ ...filtro, cursor: undefined }),
    orderBy: { id: "desc" },
    take: LIMITE_EXPORTACION_AUDITORIA,
  });
  return enriquecer(filas);
}

/** Opciones de los filtros: colegios con registros y acciones usadas (más las conocidas). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function opcionesFiltroAuditoria(_admin: AdminContext) {
  const [colegios, acciones] = await Promise.all([
    db.tenant.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    db.auditoriaPlataforma.groupBy({ by: ["accion"] }),
  ]);
  const todas = [...new Set([...Object.keys(TEXTO_ACCION), ...acciones.map((a) => a.accion)])];
  return {
    colegios,
    acciones: todas.map((a) => ({ valor: a, texto: textoAccion(a) })).sort((a, b) => a.texto.localeCompare(b.texto, "es")),
  };
}
