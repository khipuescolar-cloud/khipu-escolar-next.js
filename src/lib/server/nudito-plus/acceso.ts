import "server-only";
import { forbidden } from "next/navigation";
import type { ModoNudito } from "@/generated/prisma/enums";
import { tieneFeature } from "../plan";
import { alumnoDeLaCuenta, type TenantContext } from "../tenant";
import type { AreaNudito } from "@/lib/nudito/contratos";
import { configNudito, habilitadoEnConfig } from "../nudito/config-colegio";
import { consentimientoVigente } from "./licencias";

// Quién puede usar Nudito, el tutor de Khipu Pro (specs/41, specs/44). El plan se valida con la clave `nudito_plus` de
// FEATURES (plan `pro`, módulo FIJO por plan) y con `ctx.tenant.plan === "pro"`. Ya NO se exige licencia familiar
// (specs/28, inerte): manda la configuración del colegio (`nudito_config_colegio`).

export type AlumnoNuditoPlus = { id: string; nombres: string; apellidos: string; salonId: string };

export type MotivoSinAcceso =
  /** Colegio sin Khipu Pro (o modo soporte). */
  | "plan"
  /** Rol que no conversa con Nudito+ (profesor, dirección…) o alumno ajeno. */
  | "rol"
  /** El hijo ya tiene cuenta propia: entra con ella (no modo hijo). */
  | "cuenta_propia"
  /** Histórico (licencias familiares, specs/28): ya no se devuelve. */
  | "licencia"
  /** El colegio no activó Nudito, o el equipo Khipu lo bloqueó. */
  | "colegio"
  /** El colegio no habilitó Nudito para ese nivel, grado o área. */
  | "grado"
  /** El colegio no permite el modo hijo. */
  | "modo_hijo"
  | "consentimiento";

export type AccesoNuditoPlus =
  | { ok: true; alumno: AlumnoNuditoPlus; modo: ModoNudito }
  | { ok: false; motivo: MotivoSinAcceso; alumno?: AlumnoNuditoPlus };

const SELECT_ALUMNO = { id: true, nombres: true, apellidos: true, salonId: true, cuentaId: true, salon: { select: { nivel: true, grado: true } } } as const;

/**
 * Evalúa sin cortar el request (para mostrar una página amable):
 * 1. plan Pro (y nunca en modo soporte: el equipo Khipu no lee conversaciones);
 * 2. quien llama es ese alumno (rol alumno, `alumnoDeLaCuenta`) → modo `alumno`, o su apoderado → modo `hijo`
 *    (solo si el hijo no tiene cuenta propia activa);
 * 3. el colegio tiene Nudito activo (no bloqueado por la plataforma) y lo habilitó para el nivel, grado y área del alumno;
 *    el modo hijo, solo si el colegio lo permite;
 * 4. consentimiento de IA vigente de un apoderado (versión actual del texto, specs/44).
 * `hoy` se conserva por compatibilidad de firma (antes servía para la licencia).
 */
export async function evaluarAccesoNuditoPlus(ctx: TenantContext, alumnoId: string, hoy: Date = new Date(), opciones: { area?: AreaNudito } = {}): Promise<AccesoNuditoPlus> {
  void hoy;
  if (ctx.soporte || ctx.tenant.plan !== "pro" || !tieneFeature(ctx, "nudito_plus")) return { ok: false, motivo: "plan" };

  let modo: ModoNudito;
  let alumno: (AlumnoNuditoPlus & { cuentaId: string | null; salon: { nivel: string; grado: number | null } }) | null = null;
  if (ctx.rol === "alumno") {
    const propio = await alumnoDeLaCuenta(ctx);
    if (!propio || propio.id !== alumnoId) return { ok: false, motivo: "rol" };
    alumno = await ctx.db.alumno.findFirst({ where: { id: alumnoId, estado: "activo" }, select: SELECT_ALUMNO });
    modo = "alumno";
  } else if (ctx.rol === "apoderado") {
    alumno = await ctx.db.alumno.findFirst({
      where: { id: alumnoId, estado: "activo", apoderados: { some: { apoderadoId: ctx.membership.id } } },
      select: SELECT_ALUMNO,
    });
    modo = "hijo";
  } else {
    return { ok: false, motivo: "rol" };
  }
  if (!alumno) return { ok: false, motivo: "rol" };
  const { cuentaId, salon, ...datos } = alumno;

  if (modo === "hijo" && cuentaId) {
    const cuenta = await ctx.db.membership.findFirst({ where: { id: cuentaId, estado: "activa" }, select: { id: true } });
    if (cuenta) return { ok: false, motivo: "cuenta_propia", alumno: datos };
  }

  const estado = await configNudito(ctx);
  if (!estado.activo) return estado.motivo === "plan" || estado.motivo === "producto" ? { ok: false, motivo: "plan" } : { ok: false, motivo: "colegio", alumno: datos };
  if (!habilitadoEnConfig(estado.config, { nivel: salon.nivel, grado: salon.grado, area: opciones.area })) return { ok: false, motivo: "grado", alumno: datos };
  if (modo === "hijo" && !estado.config.permitirModoHijo) return { ok: false, motivo: "modo_hijo", alumno: datos };

  const consentimiento = await consentimientoVigente(ctx.db, ctx.tenant.id, alumnoId);
  if (!consentimiento) return { ok: false, motivo: "consentimiento", alumno: datos };
  return { ok: true, alumno: datos, modo };
}

/** Igual que `evaluarAccesoNuditoPlus`, pero corta con 403 si no hay acceso (actions y route handlers). */
export async function requireNuditoPlus(ctx: TenantContext, alumnoId: string, hoy: Date = new Date(), opciones: { area?: AreaNudito } = {}): Promise<{ alumno: AlumnoNuditoPlus; modo: ModoNudito }> {
  const acceso = await evaluarAccesoNuditoPlus(ctx, alumnoId, hoy, opciones);
  if (!acceso.ok) forbidden();
  return { alumno: acceso.alumno, modo: acceso.modo };
}
