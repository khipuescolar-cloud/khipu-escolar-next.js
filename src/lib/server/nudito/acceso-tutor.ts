import "server-only";
import { forbidden } from "next/navigation";
import type { AccesoNudito, NivelNudito } from "@/lib/nudito/contratos";
import { primerNombre } from "@/lib/nombres";
import { consentimientoVigente } from "../nudito-plus/licencias";
import { tieneFeature } from "../plan";
import { alumnoDeLaCuenta, alumnoIdsVisibles, type TenantContext } from "../tenant";
import { configEfectiva, type ConfigEfectiva } from "./integracion";

// Acceso al tutor Nudito (specs/41). Lo usa la página `/nudito`, sus actions y `sesiones.ts`.
// INTEGRAR: D adapta `nudito-plus/acceso.ts` (sin licencias); cuando exista, esta función puede delegar en él. Mientras
// tanto aplica aquí las mismas reglas: plan Pro (`nudito_plus`, clave interna), nunca en modo soporte, config del colegio
// activa, rol alumno con cuenta → su alumno; apoderado → hijo sin cuenta propia activa (modo hijo); consentimiento vigente;
// nivel y grado del SALÓN (nunca del cliente).

export type MotivoSinAccesoTutor = "plan" | "rol" | "apagado" | "cuenta_propia" | "modo_hijo" | "consentimiento" | "grado" | "elegir_hijo";

export type AlumnoTutor = AccesoNudito["alumno"] & { nivel: NivelNudito; grado: number; primerNombre: string };

export type AccesoTutor =
  | { ok: true; acceso: AccesoNudito; alumno: AlumnoTutor; config: ConfigEfectiva["config"] }
  | { ok: false; motivo: MotivoSinAccesoTutor; hijos?: { id: string; nombre: string }[] };

const SELECT = { id: true, nombres: true, apellidos: true, salonId: true, cuentaId: true, salon: { select: { nivel: true, grado: true } } } as const;

export async function evaluarAccesoTutor(ctx: TenantContext, alumnoId?: string | null): Promise<AccesoTutor> {
  if (ctx.soporte || ctx.tenant.plan !== "pro" || !tieneFeature(ctx, "nudito_plus")) return { ok: false, motivo: "plan" };
  const { activo, config } = await configEfectiva(ctx);
  if (!activo) return { ok: false, motivo: "apagado" };

  let modo: AccesoNudito["modo"];
  let id: string | null = null;
  if (ctx.rol === "alumno") {
    const propio = await alumnoDeLaCuenta(ctx);
    if (!propio || (alumnoId && alumnoId !== propio.id)) return { ok: false, motivo: "rol" };
    id = propio.id;
    modo = "alumno";
  } else if (ctx.rol === "apoderado") {
    if (!config.permitirModoHijo) return { ok: false, motivo: "modo_hijo" };
    const visibles = await alumnoIdsVisibles(ctx);
    if (!alumnoId) {
      const hijos = await ctx.db.alumno.findMany({ where: { id: { in: visibles }, estado: "activo" }, select: { id: true, nombres: true }, orderBy: { nombres: "asc" } });
      return { ok: false, motivo: "elegir_hijo", hijos: hijos.map((h) => ({ id: h.id, nombre: primerNombre(h.nombres) })) };
    }
    if (!visibles.includes(alumnoId)) return { ok: false, motivo: "rol" };
    id = alumnoId;
    modo = "hijo";
  } else {
    return { ok: false, motivo: "rol" };
  }

  const a = await ctx.db.alumno.findFirst({ where: { id, estado: "activo" }, select: SELECT });
  if (!a) return { ok: false, motivo: "rol" };
  if (modo === "hijo" && a.cuentaId) {
    const cuenta = await ctx.db.membership.findFirst({ where: { id: a.cuentaId, estado: "activa" }, select: { id: true } });
    if (cuenta) return { ok: false, motivo: "cuenta_propia" };
  }
  const nivel = a.salon.nivel;
  const grado = a.salon.grado;
  if ((nivel !== "primaria" && nivel !== "secundaria") || !grado || !config.niveles.includes(nivel)) return { ok: false, motivo: "grado" };
  if (nivel === "primaria" && grado < config.gradoMinimoPrimaria) return { ok: false, motivo: "grado" };
  if (!(await consentimientoVigente(ctx.db, ctx.tenant.id, a.id))) return { ok: false, motivo: "consentimiento" };

  const alumno = { id: a.id, nombres: a.nombres, apellidos: a.apellidos, salonId: a.salonId };
  return { ok: true, acceso: { alumno, modo }, alumno: { ...alumno, nivel, grado, primerNombre: primerNombre(a.nombres) }, config };
}

/** Igual que `evaluarAccesoTutor`, pero corta con 403 (actions). */
export async function requireAccesoTutor(ctx: TenantContext, alumnoId?: string | null) {
  const r = await evaluarAccesoTutor(ctx, alumnoId);
  if (!r.ok) forbidden();
  return r;
}
