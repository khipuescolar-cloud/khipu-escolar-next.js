import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { EstadoAviso, TipoAviso } from "@/generated/prisma/enums";
import { fechaLima, inicioDiaLima } from "@/lib/fechas";
import { auditar } from "./auditoria";
import { exigirAlumnosFamilias } from "./gestion";
import type { TenantContext } from "./tenant";

// Avisos enviados (specs/06 · /avisos): masivos (por envío) e individuales, con indicadores de hoy y apertura semanal.

export const META_APERTURA = 70;

/** Porcentaje entero de abiertos sobre enviados; null si aún no hay envíos. */
export function porcentajeApertura(enviados: number, abiertos: number): number | null {
  return enviados === 0 ? null : Math.round((abiertos / enviados) * 100);
}

/** Estados que cuentan como «con problema» (filtro `estado=fallidos`). */
export const ESTADOS_FALLIDOS: EstadoAviso[] = ["error", "rebotado", "queja"];

export type FiltroAvisos = { estado?: EstadoAviso | "fallidos"; tipo?: TipoAviso; q?: string };

export type IndicadoresHoy = {
  generados: number;
  correosEnviados: number;
  pushEnviados: number;
  abiertos: number;
  apertura: number | null;
  fallidos: number;
  omitidos: number;
  enCola: number;
  porTipo: { tipo: TipoAviso; total: number }[];
};

const ENVIADOS: EstadoAviso[] = ["enviado", "entregado", "abierto"];

/** Resume los avisos creados hoy (hora de Lima) a partir de conteos por canal, estado y tipo. */
export function resumirHoy(
  porCanalEstado: { canal: "correo" | "push"; estado: EstadoAviso; total: number }[],
  porTipo: { tipo: TipoAviso; total: number }[],
  enCola: number,
): IndicadoresHoy {
  const suma = (f: (g: (typeof porCanalEstado)[number]) => boolean) => porCanalEstado.filter(f).reduce((n, g) => n + g.total, 0);
  const correosEnviados = suma((g) => g.canal === "correo" && ENVIADOS.includes(g.estado));
  const abiertos = suma((g) => g.canal === "correo" && g.estado === "abierto");
  return {
    generados: suma(() => true),
    correosEnviados,
    pushEnviados: suma((g) => g.canal === "push" && ENVIADOS.includes(g.estado)),
    abiertos,
    apertura: porcentajeApertura(correosEnviados, abiertos),
    fallidos: suma((g) => ESTADOS_FALLIDOS.includes(g.estado)),
    omitidos: suma((g) => g.estado === "omitido"),
    enCola,
    porTipo: [...porTipo].sort((a, b) => b.total - a.total),
  };
}

/** Avisos al equipo Khipu (mesa de ayuda, specs/23): llevan el tenantId del colegio pero no son del colegio. */
const SIN_AVISOS_A_KHIPU = { NOT: { plantilla: "soporte_nuevo" } };

/** Masivos: avisos de un envío que llegó a más de una familia. Individuales: el resto (sin envío o de una sola familia). */
export type VistaAvisos = "masivos" | "individuales";

function whereVista(vista: VistaAvisos): Prisma.AvisoWhereInput {
  return vista === "masivos"
    ? { ...SIN_AVISOS_A_KHIPU, envio: { masivo: true } }
    : { ...SIN_AVISOS_A_KHIPU, OR: [{ envioId: null }, { envio: { masivo: false } }] };
}

function whereEstado(estado: FiltroAvisos["estado"]): Prisma.AvisoWhereInput {
  return estado === "fallidos" ? { estado: { in: ESTADOS_FALLIDOS } } : estado ? { estado } : {};
}

/** Indicadores de hoy y apertura de los últimos 7 días, solo de la vista elegida. */
async function indicadores(ctx: TenantContext, vista: VistaAvisos) {
  const base = whereVista(vista);
  const desde = new Date(Date.now() - 7 * 24 * 3600_000);
  const hoy = { gte: inicioDiaLima(fechaLima(new Date())) };
  const [enviados, abiertos, hoyCanalEstado, hoyTipo, enCola] = await Promise.all([
    ctx.db.aviso.count({ where: { ...base, createdAt: { gte: desde }, enviadoAt: { not: null } } }),
    ctx.db.aviso.count({ where: { ...base, createdAt: { gte: desde }, abiertoAt: { not: null } } }),
    ctx.db.aviso.groupBy({ by: ["canal", "estado"], where: { ...base, createdAt: hoy }, _count: { _all: true } }),
    ctx.db.aviso.groupBy({ by: ["tipo"], where: { ...base, createdAt: hoy }, _count: { _all: true } }),
    ctx.db.aviso.count({ where: { ...base, estado: { in: ["pendiente", "enviando"] } } }),
  ]);
  return {
    hoy: resumirHoy(
      hoyCanalEstado.map((g) => ({ canal: g.canal, estado: g.estado, total: g._count._all })),
      hoyTipo.map((g) => ({ tipo: g.tipo, total: g._count._all })),
      enCola,
    ),
    semana: { enviados, abiertos, porcentaje: porcentajeApertura(enviados, abiertos), meta: META_APERTURA },
  };
}

const SELECT_AVISO = { id: true, tipo: true, canal: true, destinatario: true, asunto: true, estado: true, createdAt: true, enviadoAt: true, abiertoAt: true, error: true } as const;

/** Totales de un envío a partir de sus avisos por canal y estado. */
export function totalesEnvio(filas: { canal: "correo" | "push"; estado: EstadoAviso; total: number }[]) {
  const r = resumirHoy(filas, [], 0);
  const enCola = filas.filter((f) => f.estado === "pendiente" || f.estado === "enviando").reduce((n, f) => n + f.total, 0);
  return { avisos: r.generados, correosEnviados: r.correosEnviados, pushEnviados: r.pushEnviados, abiertos: r.abiertos, apertura: r.apertura, fallidos: r.fallidos, omitidos: r.omitidos, enCola };
}

async function totalesPorEnvio(ctx: TenantContext, ids: string[]) {
  const grupos = ids.length === 0 ? [] : await ctx.db.aviso.groupBy({ by: ["envioId", "canal", "estado"], where: { envioId: { in: ids } }, _count: { _all: true } });
  return new Map(ids.map((id) => [id, totalesEnvio(grupos.filter((g) => g.envioId === id).map((g) => ({ canal: g.canal, estado: g.estado, total: g._count._all })))]));
}

export async function panelAvisos(ctx: TenantContext, filtro: FiltroAvisos & { vista?: VistaAvisos }) {
  exigirAlumnosFamilias(ctx); // solo lectura; el administrativo también
  const vista = filtro.vista ?? "individuales";
  const [ind, avisos, envios] = await Promise.all([
    indicadores(ctx, vista),
    vista === "individuales"
      ? ctx.db.aviso.findMany({
          where: {
            ...whereVista("individuales"),
            ...whereEstado(filtro.estado),
            ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
            ...(filtro.q ? { destinatario: { contains: filtro.q, mode: "insensitive" } } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: SELECT_AVISO,
        })
      : Promise.resolve([]),
    vista === "masivos"
      ? ctx.db.envioAviso.findMany({
          where: {
            masivo: true,
            ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
            ...(filtro.q ? { titulo: { contains: filtro.q, mode: "insensitive" } } : {}),
            ...(filtro.estado ? { avisos: { some: whereEstado(filtro.estado) } } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { id: true, tipo: true, titulo: true, familias: true, createdAt: true, creadoPor: { select: { user: { select: { nombres: true, apellidos: true } } } } },
        })
      : Promise.resolve([]),
  ]);
  const totales = await totalesPorEnvio(ctx, envios.map((e) => e.id));
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "avisos", detalle: { vista } });
  return {
    vista,
    avisos,
    envios: envios.map((e) => ({
      id: e.id, tipo: e.tipo, titulo: e.titulo, familias: e.familias, createdAt: e.createdAt,
      autor: e.creadoPor ? `${e.creadoPor.user.nombres} ${e.creadoPor.user.apellidos}` : "Khipu (automático)",
      ...totales.get(e.id)!,
    })),
    ...ind,
  };
}

/** Un envío con todos sus avisos (detalle desde la vista de masivos). */
export async function detalleEnvio(ctx: TenantContext, id: string, filtro: Pick<FiltroAvisos, "estado"> = {}) {
  exigirAlumnosFamilias(ctx);
  const ok = z.uuid().safeParse(id);
  if (!ok.success) notFound();
  const envio = await ctx.db.envioAviso.findUnique({
    where: { id: ok.data },
    select: { id: true, tipo: true, titulo: true, familias: true, masivo: true, createdAt: true, creadoPor: { select: { user: { select: { nombres: true, apellidos: true } } } } },
  });
  if (!envio) notFound();
  const [avisos, totales] = await Promise.all([
    // Por el orden del enum en desc: no enviados y con problema primero, luego abiertos, entregados, enviados y en cola.
    ctx.db.aviso.findMany({ where: { envioId: envio.id, ...whereEstado(filtro.estado) }, orderBy: [{ estado: "desc" }, { destinatario: "asc" }], take: 2000, select: SELECT_AVISO }),
    totalesPorEnvio(ctx, [envio.id]),
  ]);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "envio_aviso", entidadId: envio.id });
  return {
    envio: { ...envio, autor: envio.creadoPor ? `${envio.creadoPor.user.nombres} ${envio.creadoPor.user.apellidos}` : "Khipu (automático)" },
    totales: totales.get(envio.id)!,
    avisos,
  };
}
