"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { ZodError } from "zod";
import { guardarLista, type ResultadoGuardarLista } from "@/lib/server/asistencia";
import { justificarConSesion, type ResultadoJustificar } from "@/lib/server/justificaciones";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { guardarPreferencias, guardarSuscripcionPush, quitarSuscripcionPush } from "@/lib/server/notificaciones/preferencias";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

export type EstadoGuardarLista = ({ ok: true } & ResultadoGuardarLista) | { ok: false; error: string };

/** Envía la cola del colegio después de responder (no bloquea al profesor). */
function procesarDespues(tenantId: string) {
  after(async () => {
    try {
      await procesarCola({ tenantId });
    } catch (error) {
      console.error("[avisos] error al procesar la cola", error);
    }
  });
}

export async function guardarListaAction(slug: string, entrada: unknown): Promise<EstadoGuardarLista> {
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  requireFeature(ctx, "asistencia");
  try {
    const resultado = await guardarLista(ctx, entrada);
    if (resultado.familiasAvisadas > 0) procesarDespues(ctx.tenant.id);
    return { ok: true, ...resultado };
  } catch (error) {
    if (error instanceof ZodError) return { ok: false, error: "Revisa la lista: hay datos que no son válidos." };
    throw error;
  }
}

export type EstadoFormulario = { ok?: boolean; error?: string };

async function archivoDe(formData: FormData): Promise<Buffer | null> {
  const archivo = formData.get("adjunto");
  if (!(archivo instanceof File) || archivo.size === 0) return null;
  return Buffer.from(await archivo.arrayBuffer());
}

export async function justificarConSesionAction(
  slug: string,
  asistenciaId: string,
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  requireFeature(ctx, "justificaciones");
  const r: ResultadoJustificar = await justificarConSesion(ctx, asistenciaId, {
    motivo: formData.get("motivo"),
    archivo: await archivoDe(formData),
  });
  if (r.ok) procesarDespues(ctx.tenant.id);
  return r.ok ? { ok: true } : { error: r.error };
}

export async function guardarPreferenciasAction(slug: string, _prev: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  requireFeature(ctx, "avisos");
  await guardarPreferencias(ctx, {
    correo: formData.get("correo") === "on",
    push: formData.get("push") === "on",
    // Solo si el colegio activó el canal (si no, la casilla no existe y se conserva lo guardado).
    ...(ctx.tenant.whatsappActivo ? { whatsapp: formData.get("whatsapp") === "on" } : {}),
    ...(ctx.tenant.smsActivo ? { sms: formData.get("sms") === "on" } : {}),
  });
  return { ok: true };
}

export async function guardarSuscripcionPushAction(slug: string, suscripcion: unknown): Promise<EstadoFormulario> {
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  requireFeature(ctx, "avisos");
  try {
    await guardarSuscripcionPush(ctx, suscripcion, (await headers()).get("user-agent"));
    return { ok: true };
  } catch {
    return { error: "No se pudo activar los avisos en este dispositivo." };
  }
}

export async function quitarSuscripcionPushAction(slug: string, endpoint: string): Promise<EstadoFormulario> {
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  await quitarSuscripcionPush(ctx, String(endpoint).slice(0, 1000));
  return { ok: true };
}
