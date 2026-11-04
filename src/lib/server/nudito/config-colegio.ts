import "server-only";
import { Prisma, type NuditoConfigColegio } from "@/generated/prisma/client";
import { AREAS_NUDITO, esAreaNudito, esquemaConfigNudito, esquemaPoliticaDominio, NIVELES_NUDITO, type AreaNudito, type ConfigNudito, type NivelNudito } from "@/lib/nudito/contratos";
import { POLITICA_DOMINIO_POR_DEFECTO } from "@/lib/nudito/politica-dominio";
import { nuditoPlusDisponible } from "@/lib/planes";
import { auditar } from "../auditoria";
import { ErrorDeNegocio } from "../contexto-accion";
import { tieneFeature } from "../plan";
import { requireRol, type TenantContext } from "../tenant";

// Responsable: D (specs/44). Interruptor institucional y límites (tabla nudito_config_colegio). Sin fila = apagado.
// Manda: interruptor global del producto (src/lib/planes.ts) → plan Pro → bloqueo de plataforma → `activo` del colegio.

export type EstadoNuditoColegio = { activo: boolean; motivo?: "producto" | "plataforma" | "colegio" | "plan"; config: ConfigNudito };

/** Valores con los que arranca un colegio (Nudito apagado, fotos apagadas, 180 días de retención). */
export const CONFIG_NUDITO_POR_DEFECTO: ConfigNudito = {
  activo: false,
  areas: [...AREAS_NUDITO],
  niveles: [...NIVELES_NUDITO],
  gradoMinimoPrimaria: 1,
  permitirModoHijo: true,
  permitirFotos: false,
  minutosPorDia: null,
  sesionesPorDia: 6,
  topeCostoUsdMes: null,
  retencionDias: 180,
  horaDesde: null,
  horaHasta: null,
  politicaDominio: null,
};

/** Fila de la BD → `ConfigNudito` (ignora claves desconocidas en `areas` y `niveles`). */
export function configDeFila(fila: NuditoConfigColegio | null): ConfigNudito {
  if (!fila) return { ...CONFIG_NUDITO_POR_DEFECTO };
  const politica = esquemaPoliticaDominio.partial().safeParse(fila.politicaDominio ?? undefined);
  return {
    activo: fila.activo,
    areas: fila.areas.filter(esAreaNudito),
    niveles: fila.niveles.filter((n): n is NivelNudito => (NIVELES_NUDITO as readonly string[]).includes(n)),
    gradoMinimoPrimaria: fila.gradoMinimoPrimaria,
    permitirModoHijo: fila.permitirModoHijo,
    permitirFotos: fila.permitirFotos,
    minutosPorDia: fila.minutosPorDia,
    sesionesPorDia: fila.sesionesPorDia,
    topeCostoUsdMes: fila.topeCostoUsdMes === null ? null : Number(fila.topeCostoUsdMes.toString()),
    retencionDias: fila.retencionDias,
    horaDesde: fila.horaDesde,
    horaHasta: fila.horaHasta,
    politicaDominio: fila.politicaDominio && politica.success ? politica.data : null,
  };
}

/** Configuración vigente (con valores por defecto si no hay fila). Lectura para todos los roles del colegio. */
export async function configNudito(ctx: TenantContext): Promise<EstadoNuditoColegio> {
  const fila = await ctx.db.nuditoConfigColegio.findFirst();
  const config = configDeFila(fila);
  if (!nuditoPlusDisponible()) return { activo: false, motivo: "producto", config };
  if (ctx.tenant.plan !== "pro" || !tieneFeature(ctx, "nudito_plus")) return { activo: false, motivo: "plan", config };
  if (fila?.bloqueadoPlataforma) return { activo: false, motivo: "plataforma", config };
  if (!config.activo) return { activo: false, motivo: "colegio", config };
  return { activo: true, config };
}

/**
 * Valida los cambios de política de dominio contra la política por defecto: la combinación debe cumplir
 * `esquemaPoliticaDominio` completo. Cambios inválidos → error claro (no se ignoran en silencio).
 */
export function validarCambiosPolitica(cambios: unknown): ConfigNudito["politicaDominio"] {
  if (cambios === null || cambios === undefined) return null;
  const parcial = esquemaPoliticaDominio.partial().strict().safeParse(cambios);
  if (!parcial.success) throw new ErrorDeNegocio(`Política de dominio no válida: ${parcial.error.issues[0]?.path.join(".") || "valor"} ${parcial.error.issues[0]?.message ?? ""}`.trim());
  const completa = esquemaPoliticaDominio.safeParse({ ...POLITICA_DOMINIO_POR_DEFECTO, ...parcial.data });
  if (!completa.success) throw new ErrorDeNegocio(`Política de dominio no válida: ${completa.error.issues[0]?.path.join(".") ?? ""} ${completa.error.issues[0]?.message ?? ""}`.trim());
  return Object.keys(parcial.data).length === 0 ? null : parcial.data;
}

/** Solo dirección. Valida con `esquemaConfigNudito`, audita y registra `actualizadoPorId`/`activadoAt`. */
export async function guardarConfigNudito(ctx: TenantContext, entrada: unknown): Promise<EstadoNuditoColegio> {
  requireRol(ctx, ["direccion"]);
  const r = esquemaConfigNudito.safeParse(entrada);
  if (!r.success) {
    const i = r.error.issues[0];
    throw new ErrorDeNegocio(`Revisa la configuración de Nudito: ${i?.path.join(".") ?? ""} ${i?.message ?? ""}`.trim());
  }
  const d = r.data;
  // Se valida la entrada CRUDA (zod de la config quita las claves desconocidas): una clave inventada es un error.
  const politicaDominio = validarCambiosPolitica((entrada as { politicaDominio?: unknown } | null)?.politicaDominio ?? null);
  if ((d.horaDesde === null) !== (d.horaHasta === null)) throw new ErrorDeNegocio("Indica la hora de inicio y la de fin, o deja ambas vacías.");
  if (d.horaDesde && d.horaHasta && d.horaDesde >= d.horaHasta) throw new ErrorDeNegocio("La hora de inicio debe ser anterior a la de fin.");

  const antes = await ctx.db.nuditoConfigColegio.findFirst();
  const datos = {
    activo: d.activo,
    areas: [...new Set(d.areas)],
    niveles: [...new Set(d.niveles)],
    gradoMinimoPrimaria: d.gradoMinimoPrimaria,
    permitirModoHijo: d.permitirModoHijo,
    permitirFotos: d.permitirFotos,
    minutosPorDia: d.minutosPorDia,
    sesionesPorDia: d.sesionesPorDia,
    topeCostoUsdMes: d.topeCostoUsdMes,
    retencionDias: d.retencionDias,
    horaDesde: d.horaDesde,
    horaHasta: d.horaHasta,
    politicaDominio: politicaDominio ?? undefined,
    actualizadoPorId: ctx.membership.id,
    ...(d.activo && !antes?.activo ? { activadoAt: new Date() } : {}),
  };
  const fila = antes
    ? await ctx.db.nuditoConfigColegio.update({ where: { id: antes.id }, data: { ...datos, politicaDominio: politicaDominio ?? NULL_JSON } })
    : await ctx.db.nuditoConfigColegio.create({ data: { tenantId: ctx.tenant.id, ...datos } });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "nudito_config", entidadId: fila.id,
    detalle: { antes: antes ? resumen(configDeFila(antes)) : null, despues: resumen(d) },
  });
  return configNudito(ctx);
}

// Prisma: para dejar una columna Json en NULL se usa `Prisma.DbNull`.
const NULL_JSON = Prisma.DbNull;

const resumen = (c: ConfigNudito) => ({ ...c, politicaDominio: c.politicaDominio ?? null }) as unknown as Prisma.InputJsonValue;

/** El colegio permite Nudito para ese nivel, grado y área (lo usa el acceso y el selector de cursos). */
export async function nuditoHabilitadoPara(ctx: TenantContext, datos: { nivel: string; grado: number | null; area?: AreaNudito }): Promise<boolean> {
  const estado = await configNudito(ctx);
  return estado.activo && habilitadoEnConfig(estado.config, datos);
}

/** Puro: nivel, grado mínimo de primaria y área. Un salón sin grado registrado no se bloquea por grado. */
export function habilitadoEnConfig(config: ConfigNudito, datos: { nivel: string; grado: number | null; area?: AreaNudito }): boolean {
  if (!(config.niveles as readonly string[]).includes(datos.nivel)) return false;
  if (datos.nivel === "primaria" && datos.grado !== null && datos.grado < config.gradoMinimoPrimaria) return false;
  if (datos.area && !config.areas.includes(datos.area)) return false;
  return true;
}
