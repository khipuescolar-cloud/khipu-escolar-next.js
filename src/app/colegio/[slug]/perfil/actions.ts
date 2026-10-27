"use server";

import { headers } from "next/headers";
import { guardarPreferencias, guardarSuscripcionPush, quitarSuscripcionPush } from "@/lib/server/notificaciones/preferencias";
import { requireTenantContext } from "@/lib/server/tenant";

export type EstadoFormulario = { ok?: boolean; error?: string };

// Preferencias de aviso del personal (profesor, dirección, administrativo). Se guardan en `preferencias_aviso`
// con el id de la membresía (specs/06); el apoderado las ajusta en /asistencia#avisos.
const ROLES_PERSONAL = ["profesor", "direccion", "administrativo"] as const;

export async function guardarPreferenciasPersonalAction(slug: string, _prev: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const ctx = await requireTenantContext(slug, [...ROLES_PERSONAL]);
  await guardarPreferencias(ctx, { correo: formData.get("correo") === "on", push: formData.get("push") === "on" });
  return { ok: true };
}

export async function guardarSuscripcionPushPersonalAction(slug: string, suscripcion: unknown): Promise<EstadoFormulario> {
  const ctx = await requireTenantContext(slug, [...ROLES_PERSONAL]);
  try {
    await guardarSuscripcionPush(ctx, suscripcion, (await headers()).get("user-agent"));
    return { ok: true };
  } catch {
    return { error: "No se pudo activar los avisos en este dispositivo." };
  }
}

export async function quitarSuscripcionPushPersonalAction(slug: string, endpoint: string): Promise<EstadoFormulario> {
  const ctx = await requireTenantContext(slug, [...ROLES_PERSONAL]);
  await quitarSuscripcionPush(ctx, endpoint);
  return { ok: true };
}
