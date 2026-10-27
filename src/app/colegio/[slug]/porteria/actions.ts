"use server";

import { after } from "next/server";
import {
  buscarAlumnosPorteria, registrarLlegadaManual, registrarLlegadaPorQr, type ResultadoPorteria,
} from "@/lib/server/porteria";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { requireTenantContext } from "@/lib/server/tenant";

const ROLES = ["porteria", "direccion"] as const;

function procesarDespues(tenantId: string) {
  after(async () => {
    try {
      await procesarCola({ tenantId });
    } catch (error) {
      console.error("[avisos] error al procesar la cola", error);
    }
  });
}

/** `leidoAt`: hora real de la lectura si se guardó sin conexión; el servidor la respeta solo si es razonable. */
export async function registrarPorQrAction(slug: string, textoLeido: string, leidoAt?: string): Promise<ResultadoPorteria> {
  const ctx = await requireTenantContext(slug, [...ROLES]);
  const r = await registrarLlegadaPorQr(ctx, String(textoLeido), new Date(), typeof leidoAt === "string" ? leidoAt : null);
  if (r.ok && r.tipo === "registrado") procesarDespues(ctx.tenant.id);
  return r;
}

export async function registrarManualAction(slug: string, alumnoId: string): Promise<ResultadoPorteria> {
  const ctx = await requireTenantContext(slug, [...ROLES]);
  const r = await registrarLlegadaManual(ctx, String(alumnoId));
  if (r.ok && r.tipo === "registrado") procesarDespues(ctx.tenant.id);
  return r;
}

export async function buscarAlumnosAction(slug: string, texto: string) {
  const ctx = await requireTenantContext(slug, [...ROLES]);
  return buscarAlumnosPorteria(ctx, String(texto));
}
