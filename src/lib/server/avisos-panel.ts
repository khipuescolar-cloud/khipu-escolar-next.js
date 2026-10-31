import "server-only";
import type { EstadoAviso, TipoAviso } from "@/generated/prisma/enums";
import { fechaLima, inicioDiaLima } from "@/lib/fechas";
import { auditar } from "./auditoria";
import { exigirAlumnosFamilias } from "./gestion";
import type { TenantContext } from "./tenant";

// Tabla de avisos y tasa de apertura semanal para dirección (specs/10 · /avisos).

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

export async function panelAvisos(ctx: TenantContext, filtro: FiltroAvisos) {
  exigirAlumnosFamilias(ctx); // solo lectura; el administrativo también
  const desde = new Date(Date.now() - 7 * 24 * 3600_000);
  const hoy = { gte: inicioDiaLima(fechaLima(new Date())) };
  const [avisos, enviados, abiertos, hoyCanalEstado, hoyTipo, enCola] = await Promise.all([
    ctx.db.aviso.findMany({
      where: {
        ...SIN_AVISOS_A_KHIPU,
        ...(filtro.estado === "fallidos" ? { estado: { in: ESTADOS_FALLIDOS } } : filtro.estado ? { estado: filtro.estado } : {}),
        ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
        ...(filtro.q ? { destinatario: { contains: filtro.q, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, tipo: true, canal: true, destinatario: true, asunto: true, estado: true, createdAt: true, enviadoAt: true, abiertoAt: true, error: true },
    }),
    ctx.db.aviso.count({ where: { ...SIN_AVISOS_A_KHIPU, createdAt: { gte: desde }, enviadoAt: { not: null } } }),
    ctx.db.aviso.count({ where: { ...SIN_AVISOS_A_KHIPU, createdAt: { gte: desde }, abiertoAt: { not: null } } }),
    ctx.db.aviso.groupBy({ by: ["canal", "estado"], where: { ...SIN_AVISOS_A_KHIPU, createdAt: hoy }, _count: { _all: true } }),
    ctx.db.aviso.groupBy({ by: ["tipo"], where: { ...SIN_AVISOS_A_KHIPU, createdAt: hoy }, _count: { _all: true } }),
    ctx.db.aviso.count({ where: { ...SIN_AVISOS_A_KHIPU, estado: { in: ["pendiente", "enviando"] } } }),
  ]);
  const indicadoresHoy = resumirHoy(
    hoyCanalEstado.map((g) => ({ canal: g.canal, estado: g.estado, total: g._count._all })),
    hoyTipo.map((g) => ({ tipo: g.tipo, total: g._count._all })),
    enCola,
  );
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "avisos" });
  return { avisos, hoy: indicadoresHoy, semana: { enviados, abiertos, porcentaje: porcentajeApertura(enviados, abiertos), meta: META_APERTURA } };
}
