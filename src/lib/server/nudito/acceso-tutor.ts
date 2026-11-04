import "server-only";
import { forbidden } from "next/navigation";
import type { AccesoNudito, NivelNudito } from "@/lib/nudito/contratos";
import { primerNombre } from "@/lib/nombres";
import { evaluarAccesoNuditoPlus, type MotivoSinAcceso } from "../nudito-plus/acceso";
import { tieneFeature } from "../plan";
import { alumnoDeLaCuenta, alumnoIdsVisibles, type TenantContext } from "../tenant";
import { configEfectiva, type ConfigEfectiva } from "./integracion";

// Acceso al tutor Nudito (specs/41, specs/44). Lo usan la página `/nudito`, sus actions y las pruebas. Las reglas viven en
// UN solo lugar, `nudito-plus/acceso.ts` (D): plan Pro, nunca modo soporte, config del colegio activa y no bloqueada,
// nivel/grado/área habilitados, alumno con cuenta → su alumno, apoderado → hijo sin cuenta propia activa (modo hijo),
// consentimiento de IA vigente (v2). Aquí solo se añade lo que necesita la UI: elegir hijo, nivel y grado del SALÓN.

export type MotivoSinAccesoTutor = "plan" | "rol" | "apagado" | "cuenta_propia" | "modo_hijo" | "consentimiento" | "grado" | "elegir_hijo";

export type AlumnoTutor = AccesoNudito["alumno"] & { nivel: NivelNudito; grado: number; primerNombre: string };

export type AccesoTutor =
  | { ok: true; acceso: AccesoNudito; alumno: AlumnoTutor; config: ConfigEfectiva["config"] }
  | { ok: false; motivo: MotivoSinAccesoTutor; hijos?: { id: string; nombre: string }[] };

const MOTIVO: Record<MotivoSinAcceso, MotivoSinAccesoTutor> = {
  plan: "plan",
  rol: "rol",
  cuenta_propia: "cuenta_propia",
  licencia: "plan",
  colegio: "apagado",
  grado: "grado",
  modo_hijo: "modo_hijo",
  consentimiento: "consentimiento",
};

export async function evaluarAccesoTutor(ctx: TenantContext, alumnoId?: string | null): Promise<AccesoTutor> {
  if (ctx.soporte || ctx.tenant.plan !== "pro" || !tieneFeature(ctx, "nudito_plus")) return { ok: false, motivo: "plan" };
  const { activo, config } = await configEfectiva(ctx);
  if (!activo) return { ok: false, motivo: "apagado" };

  let id: string;
  if (ctx.rol === "alumno") {
    const propio = await alumnoDeLaCuenta(ctx);
    if (!propio || (alumnoId && alumnoId !== propio.id)) return { ok: false, motivo: "rol" };
    id = propio.id;
  } else if (ctx.rol === "apoderado") {
    if (!config.permitirModoHijo) return { ok: false, motivo: "modo_hijo" };
    if (!alumnoId) {
      const visibles = await alumnoIdsVisibles(ctx);
      const hijos = await ctx.db.alumno.findMany({ where: { id: { in: visibles }, estado: "activo" }, select: { id: true, nombres: true }, orderBy: { nombres: "asc" } });
      return { ok: false, motivo: "elegir_hijo", hijos: hijos.map((h) => ({ id: h.id, nombre: primerNombre(h.nombres) })) };
    }
    id = alumnoId;
  } else {
    return { ok: false, motivo: "rol" };
  }

  const r = await evaluarAccesoNuditoPlus(ctx, id);
  if (!r.ok) return { ok: false, motivo: MOTIVO[r.motivo] };

  // Nivel y grado OFICIALES del salón (nunca del cliente). Nudito necesita un grado registrado para elegir temas.
  const salon = await ctx.db.salon.findFirst({ where: { id: r.alumno.salonId }, select: { nivel: true, grado: true } });
  if (!salon || (salon.nivel !== "primaria" && salon.nivel !== "secundaria") || !salon.grado) return { ok: false, motivo: "grado" };

  const acceso: AccesoNudito = { alumno: r.alumno, modo: r.modo };
  return { ok: true, acceso, alumno: { ...r.alumno, nivel: salon.nivel, grado: salon.grado, primerNombre: primerNombre(r.alumno.nombres) }, config };
}

/** Igual que `evaluarAccesoTutor`, pero corta con 403 (actions). */
export async function requireAccesoTutor(ctx: TenantContext, alumnoId?: string | null) {
  const r = await evaluarAccesoTutor(ctx, alumnoId);
  if (!r.ok) forbidden();
  return r;
}
