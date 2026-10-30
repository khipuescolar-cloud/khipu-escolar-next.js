import "server-only";
import { forbidden } from "next/navigation";
import type { ModoNudito } from "@/generated/prisma/enums";
import { tieneFeature } from "../plan";
import { alumnoDeLaCuenta, type TenantContext } from "../tenant";
import { consentimientoVigente, licenciaVigente } from "./licencias";

// Quién puede conversar con Nudito+ (specs/29). Decisión: el plan se valida con la clave `nudito_plus` de FEATURES
// (plan `pro`), que es un módulo FIJO por plan (`MODULOS_FIJOS_POR_PLAN`: no depende del catálogo de la BD ni de
// ajustes del panel) y, por si acaso, con `ctx.tenant.plan === "pro"`.

export type AlumnoNuditoPlus = { id: string; nombres: string; apellidos: string; salonId: string };

export type MotivoSinAcceso =
  /** Colegio sin Khipu Pro (o modo soporte). */
  | "plan"
  /** Rol que no conversa con Nudito+ (profesor, dirección…) o alumno ajeno. */
  | "rol"
  /** El hijo ya tiene cuenta propia: entra con ella (no modo hijo). */
  | "cuenta_propia"
  | "licencia"
  | "consentimiento";

export type AccesoNuditoPlus =
  | { ok: true; alumno: AlumnoNuditoPlus; modo: ModoNudito }
  | { ok: false; motivo: MotivoSinAcceso; alumno?: AlumnoNuditoPlus };

const SELECT_ALUMNO = { id: true, nombres: true, apellidos: true, salonId: true, cuentaId: true } as const;

/**
 * Evalúa sin cortar el request (para mostrar una página amable):
 * 1. plan Pro (y nunca en modo soporte: el equipo Khipu no lee conversaciones);
 * 2. quien llama es ese alumno (rol alumno, `alumnoDeLaCuenta`) → modo `alumno`, o su apoderado → modo `hijo`
 *    (solo si el hijo no tiene cuenta propia activa);
 * 3. licencia vigente y consentimiento de IA vigente (specs/28).
 */
export async function evaluarAccesoNuditoPlus(ctx: TenantContext, alumnoId: string, hoy: Date = new Date()): Promise<AccesoNuditoPlus> {
  if (ctx.soporte || ctx.tenant.plan !== "pro" || !tieneFeature(ctx, "nudito_plus")) return { ok: false, motivo: "plan" };

  let modo: ModoNudito;
  let alumno: (AlumnoNuditoPlus & { cuentaId: string | null }) | null = null;
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
  const { cuentaId, ...datos } = alumno;

  if (modo === "hijo" && cuentaId) {
    const cuenta = await ctx.db.membership.findFirst({ where: { id: cuentaId, estado: "activa" }, select: { id: true } });
    if (cuenta) return { ok: false, motivo: "cuenta_propia", alumno: datos };
  }

  const [licencia, consentimiento] = await Promise.all([
    licenciaVigente(ctx.db, ctx.tenant.id, alumnoId, hoy),
    consentimientoVigente(ctx.db, ctx.tenant.id, alumnoId),
  ]);
  if (!licencia) return { ok: false, motivo: "licencia", alumno: datos };
  if (!consentimiento) return { ok: false, motivo: "consentimiento", alumno: datos };
  return { ok: true, alumno: datos, modo };
}

/** Igual que `evaluarAccesoNuditoPlus`, pero corta con 403 si no hay acceso (actions y route handlers). */
export async function requireNuditoPlus(ctx: TenantContext, alumnoId: string, hoy: Date = new Date()): Promise<{ alumno: AlumnoNuditoPlus; modo: ModoNudito }> {
  const acceso = await evaluarAccesoNuditoPlus(ctx, alumnoId, hoy);
  if (!acceso.ok) forbidden();
  return { alumno: acceso.alumno, modo: acceso.modo };
}
