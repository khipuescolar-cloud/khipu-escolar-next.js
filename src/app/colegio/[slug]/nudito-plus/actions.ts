"use server";

import { headers } from "next/headers";
import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { redirect } from "next/navigation";
import { contextoDeAccion, ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { aceptarConsentimientoIa, marcarAlertaVista, reportarPago, revocarConsentimientoIa } from "@/lib/server/nudito-plus/familia";

// Nudito+ para la familia (specs/28). El colegio sale del subdominio; el alumno se valida contra los hijos del apoderado.

export async function reportarPagoAction(f: FormData): Promise<never> {
  const ctx = await contextoDeAccion(["apoderado"]);
  const alumnoId = encodeURIComponent(texto(f, "alumnoId"));
  try {
    await reportarPago(ctx, texto(f, "alumnoId"), { referencia: texto(f, "referencia"), monto: texto(f, "monto"), fechaPago: texto(f, "fechaPago"), meses: texto(f, "meses") });
  } catch (e) {
    // El error vuelve al formulario de pago; el éxito, al panel del hijo.
    if (e instanceof ErrorDeNegocio) redirect(`/nudito-plus/${alumnoId}/activar?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/nudito-plus/${alumnoId}?ok=${encodeURIComponent("Recibimos tu pago. Lo revisaremos y te avisaremos cuando Nudito+ esté activo.")}`);
}

export async function aceptarConsentimientoIaAction(f: FormData): Promise<never> {
  const ctx = await contextoDeAccion(["apoderado"]);
  const alumnoId = texto(f, "alumnoId");
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return ejecutarYVolver(`/nudito-plus/${encodeURIComponent(alumnoId)}`, async () => {
    await aceptarConsentimientoIa(ctx, alumnoId, ip);
    return "Gracias. Guardamos tu autorización.";
  });
}

export async function revocarConsentimientoIaAction(f: FormData): Promise<never> {
  const ctx = await contextoDeAccion(["apoderado"]);
  const alumnoId = texto(f, "alumnoId");
  return ejecutarYVolver(`/nudito-plus/${encodeURIComponent(alumnoId)}`, async () => {
    await revocarConsentimientoIa(ctx, alumnoId);
    return "Retiraste la autorización. Nudito+ queda en pausa hasta que vuelvas a aceptarla.";
  });
}

export async function marcarAlertaVistaAction(f: FormData): Promise<never> {
  const ctx = await contextoDeAccion(["apoderado"]);
  const alumnoId = texto(f, "alumnoId");
  return ejecutarYVolver(`/nudito-plus/${encodeURIComponent(alumnoId)}`, async () => {
    await marcarAlertaVista(ctx, texto(f, "alertaId"));
    return "Alerta marcada como vista.";
  });
}
