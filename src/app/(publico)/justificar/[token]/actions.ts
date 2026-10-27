"use server";

import { after } from "next/server";
import type { EstadoJustificar } from "@/components/FormJustificar";
import { justificarConToken } from "@/lib/server/justificaciones";
import { procesarCola } from "@/lib/server/notificaciones/cola";

/** Sin sesión: el token del enlace autoriza (un solo uso, 7 días). */
export async function justificarConTokenAction(token: string, _prev: EstadoJustificar, formData: FormData): Promise<EstadoJustificar> {
  const archivo = formData.get("adjunto");
  const buffer = archivo instanceof File && archivo.size > 0 ? Buffer.from(await archivo.arrayBuffer()) : null;
  const r = await justificarConToken(String(token), { motivo: formData.get("motivo"), archivo: buffer });
  if (!r.ok) return { error: r.error };
  after(async () => {
    try {
      await procesarCola({ tenantId: r.tenantId, maxAvisos: 20 });
    } catch (error) {
      console.error("[avisos] error al procesar la cola", error);
    }
  });
  return { ok: true };
}
