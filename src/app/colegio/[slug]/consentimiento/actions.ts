"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { aceptarConsentimiento, revocarConsentimiento } from "@/lib/server/consentimiento";
import { contextoDeAccion } from "@/lib/server/contexto-accion";

export async function aceptarConsentimientoAction() {
  const ctx = await contextoDeAccion(["apoderado"]);
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  await aceptarConsentimiento(ctx, ip);
  redirect("/inicio");
}

export async function revocarConsentimientoAction() {
  const ctx = await contextoDeAccion(["apoderado"]);
  await revocarConsentimiento(ctx);
  redirect("/perfil?ok=" + encodeURIComponent("Retiraste tu autorización. Ya no recibirás avisos por correo."));
}
