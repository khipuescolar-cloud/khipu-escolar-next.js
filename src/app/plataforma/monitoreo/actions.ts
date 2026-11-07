"use server";

import { revalidatePath } from "next/cache";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { procesarColaAhora, reintentarAvisosConError } from "@/lib/server/plataforma-monitoreo";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { db } from "@/lib/server/db";
import { actualizarAvisoCuota } from "@/lib/server/almacenamiento/alertas";
import { z } from "zod";

// Acciones de monitoreo (specs/21). Auditadas en `auditoria_plataforma`.

const esquemaCuota = z.object({ tenantId: z.uuid(), limiteGb: z.union([z.literal(""), z.coerce.number().int().min(1).max(10_000)]), reservaCriticaPct: z.coerce.number().int().min(0).max(20), maxBytesDocumento: z.coerce.number().int().min(1).max(26_214_400), maxBytesEntrega: z.coerce.number().int().min(1).max(10_485_760), maxArchivosEntrega: z.coerce.number().int().min(1).max(10), cuotaBorradorGb: z.coerce.number().int().min(1).max(100) });

export async function guardarCuotaAction(f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  const entrada = esquemaCuota.safeParse(Object.fromEntries(f));
  if (!entrada.success) return fallo("Revisa los límites de almacenamiento.");
  const e = entrada.data;
  const anterior = await db.almacenamientoColegio.findUnique({ where: { tenantId: e.tenantId } });
  if (!anterior) return fallo("Colegio no encontrado.");
  const gb = BigInt(1024) ** BigInt(3);
  const limiteBytes = e.limiteGb === "" ? null : BigInt(e.limiteGb) * gb;
  await db.almacenamientoColegio.update({ where: { tenantId: e.tenantId }, data: { limiteBytes, reservaCriticaPct: e.reservaCriticaPct, maxBytesDocumento: e.maxBytesDocumento, maxBytesEntrega: e.maxBytesEntrega, maxArchivosEntrega: e.maxArchivosEntrega, cuotaBorradorBytes: BigInt(e.cuotaBorradorGb) * gb } });
  await db.auditoriaPlataforma.create({ data: { actorId: admin.user.id, accion: "editar_colegio", tenantId: e.tenantId, detalle: { tipo: "cuota", limiteBytes: limiteBytes?.toString() ?? null } } });
  await actualizarAvisoCuota(e.tenantId, admin.user.id);
  revalidatePath("/plataforma/monitoreo");
  return ok("Límites guardados.");
}

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

export async function guardarCuotaFormulario(f: FormData): Promise<void> { await guardarCuotaAction(f); }
