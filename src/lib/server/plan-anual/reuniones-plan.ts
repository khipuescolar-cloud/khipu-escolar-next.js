import "server-only";
import { z } from "zod";
import { consultarDisponibilidad } from "@/lib/server/disponibilidad";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { convocarReunion } from "@/lib/server/reuniones";
import type { TenantContext } from "@/lib/server/tenant";
import { requireAccesoPlan } from "./acceso";
import { registrarEvento } from "./planes";

const esquema = z.object({
  titulo: z.string().trim().min(3).max(150),
  descripcion: z.string().trim().max(1000).optional(),
  fecha: z.iso.date(), hora: z.string(), horaFin: z.string().optional(),
  duracion: z.number().int().min(15).max(240).optional(),
  modalidad: z.enum(["presencial", "virtual", "mixta"]).default("presencial"),
  lugar: z.string().trim().max(200).optional(), enlace: z.string().trim().optional(),
  fueraDeHorario: z.boolean().optional(), forzarClase: z.boolean().optional(),
  confirmarChoque: z.boolean().optional(), motivoForzar: z.string().optional(),
});
export async function participantesReunionPlan(ctx: TenantContext, planId: string) {
  await requireAccesoPlan(ctx, planId);
  return ctx.db.planAnualParticipante.findMany({ where: { planId, activo: true }, select: { membershipId: true } });
}
export async function sugerirHorariosPlan(ctx: TenantContext, planId: string, entrada: { fecha: string; hora: string; duracion?: number }) {
  await requireAccesoPlan(ctx, planId, { coordinador: true });
  const participantes = await participantesReunionPlan(ctx, planId);
  return consultarDisponibilidad(ctx, { fecha: entrada.fecha, hora: entrada.hora, duracion: entrada.duracion ?? 60, requeridos: participantes.map(p => p.membershipId).filter(id => id !== ctx.membership.id), opcionales: [], dias: 7, alternativas: true });
}
export async function convocarReunionPlan(ctx: TenantContext, planId: string, entrada: unknown) {
  await requireAccesoPlan(ctx, planId, { coordinador: true });
  const r = esquema.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos de la reunión.");
  const participantes = await participantesReunionPlan(ctx, planId);
  const resultado = await convocarReunion(ctx, { ...r.data, tipo: "coordinacion", alcance: "ninguno", planAnualId: planId, requeridos: participantes.map(p => p.membershipId).filter(id => id !== ctx.membership.id), opcionales: [] });
  if (!resultado.ok) throw new ErrorDeNegocio(resultado.error);
  await registrarEvento(ctx, planId, "convocar_reunion", { reunionId: resultado.id ?? "" });
  return resultado;
}
export async function reunionesDelPlan(ctx: TenantContext, planId: string) {
  await requireAccesoPlan(ctx, planId);
  return ctx.db.reunion.findMany({ where: { planAnualId: planId }, include: { acuerdos: true }, orderBy: { inicio: "desc" } });
}
