"use server";

import { z } from "zod";
import { contextoDeAccion, ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireNuditoPlus } from "@/lib/server/nudito-plus/acceso";
import { conversar, MAX_CARACTERES_NUDITO } from "@/lib/server/nudito-plus/conversar";
import { requireFeature } from "@/lib/server/plan";

const entradaSchema = z.object({
  alumnoId: z.uuid(),
  conversacionId: z.uuid().nullable(),
  texto: z.string().trim().min(1, "Escribe tu pregunta.").max(MAX_CARACTERES_NUDITO, `Máximo ${MAX_CARACTERES_NUDITO} caracteres.`),
});

export type ResultadoNuditoPlus =
  | { ok: true; conversacionId: string; texto: string; bloqueado: boolean; topeAlcanzado: boolean }
  | { ok: false; error: string };

/**
 * Un mensaje a Nudito+ (specs/29). El alumno (cuenta propia) o su apoderado en modo hijo; el colegio sale del host.
 * Valida plan Pro, licencia y consentimiento vigentes (403 si no), límite por minuto y tope mensual.
 */
export async function enviarMensajeNuditoPlusAction(entrada: z.input<typeof entradaSchema>): Promise<ResultadoNuditoPlus> {
  const parsed = entradaSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Mensaje no válido." };
  const { alumnoId, conversacionId, texto } = parsed.data;

  const ctx = await contextoDeAccion(["alumno", "apoderado"]);
  requireFeature(ctx, "nudito_plus");
  const acceso = await requireNuditoPlus(ctx, alumnoId);
  try {
    const r = await conversar(ctx, acceso, { conversacionId, texto });
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { ok: false, error: e.message };
    throw e;
  }
}
