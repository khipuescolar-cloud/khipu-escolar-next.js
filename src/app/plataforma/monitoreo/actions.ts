"use server";

import { revalidatePath } from "next/cache";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { procesarColaAhora, reintentarAvisosConError } from "@/lib/server/plataforma-monitoreo";
import { fallo, ok, type Resultado } from "@/lib/resultado";

// Acciones de monitoreo (specs/21). Auditadas en `auditoria_plataforma`.

export async function reintentarAvisosAction(f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  try {
    const n = await reintentarAvisosConError(admin, String(f.get("tenantId") ?? ""));
    revalidatePath("/plataforma/monitoreo");
    return ok(n === 0 ? "No había avisos con error." : `Volvimos a poner ${n} ${n === 1 ? "aviso" : "avisos"} en la cola.`);
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}

export async function procesarColaAction(): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  try {
    const r = await procesarColaAhora(admin);
    revalidatePath("/plataforma/monitoreo");
    return ok(`Cola procesada: ${r.enviados} enviados, ${r.errores} con error, ${r.diferidos} para más tarde.`);
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    console.error("[monitoreo] error al procesar la cola", e);
    return fallo("No se pudo procesar la cola. Revisa el servidor e inténtalo de nuevo.");
  }
}
