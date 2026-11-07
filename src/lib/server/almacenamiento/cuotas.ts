import "server-only";
import { randomUUID } from "node:crypto";
import type { CategoriaArchivo } from "@/generated/prisma/client";
import { db } from "../db";
import { actualizarAvisoCuota } from "./alertas";
import type { TenantContext } from "../tenant";

export async function asegurarMedidor(ctx: TenantContext) {
  return ctx.db.almacenamientoColegio.upsert({ where: { tenantId: ctx.tenant.id }, create: { tenantId: ctx.tenant.id }, update: {} });
}
export async function reservar(ctx: TenantContext, bytes: number, critica = false): Promise<boolean> {
  await asegurarMedidor(ctx);
  return reservarPorTenant(ctx.tenant.id, bytes, critica);
}
export async function reservarPorTenant(tenantId: string, bytes: number, critica = false): Promise<boolean> {
  await db.almacenamientoColegio.upsert({ where: { tenantId }, create: { tenantId }, update: {} });
  const filas = await db.$queryRaw<{ tenant_id: string }[]>`
    UPDATE almacenamiento_colegio SET reservado_bytes = reservado_bytes + ${BigInt(bytes)}, actualizado_at = now()
    WHERE tenant_id = ${tenantId}::uuid AND
      (limite_bytes IS NULL OR usado_bytes + reservado_bytes + ${BigInt(bytes)} <=
        limite_bytes - CASE WHEN ${critica} THEN 0 ELSE limite_bytes * reserva_critica_pct / 100 END)
    RETURNING tenant_id`;
  return filas.length === 1;
}
export async function liberarReserva(ctx: TenantContext, bytes: bigint) {
  return liberarReservaPorTenant(ctx.tenant.id, bytes);
}
export async function liberarReservaPorTenant(tenantId: string, bytes: bigint) {
  await db.almacenamientoColegio.update({ where: { tenantId }, data: { reservadoBytes: { decrement: bytes } } });
}
export async function confirmarUso(ctx: TenantContext, categoria: CategoriaArchivo, reserva: bigint, real: bigint) {
  return confirmarUsoPorTenant(ctx.tenant.id, categoria, reserva, real);
}
export async function confirmarUsoPorTenant(tenantId: string, categoria: CategoriaArchivo, reserva: bigint, real: bigint) {
  await db.$transaction(async (tx) => {
    await tx.almacenamientoColegio.update({ where: { tenantId }, data: { reservadoBytes: { decrement: reserva }, usadoBytes: { increment: categoria === "exportacion" ? BigInt(0) : real } } });
    await tx.usoAlmacenamientoCategoria.upsert({ where: { tenantId_categoria: { tenantId, categoria } }, create: { id: randomUUID(), tenantId, categoria, bytes: real, archivos: 1 }, update: { bytes: { increment: real }, archivos: { increment: 1 } } });
  });
  await actualizarAvisoCuota(tenantId).catch((error) => console.error("[almacenamiento] no se pudo avisar el umbral", error));
}
export async function descontar(ctx: TenantContext, categoria: CategoriaArchivo, bytes: bigint) {
  return descontarPorTenant(ctx.tenant.id, categoria, bytes);
}
export async function descontarPorTenant(tenantId: string, categoria: CategoriaArchivo, bytes: bigint) {
  await db.$transaction(async (tx) => {
    if (categoria !== "exportacion") await tx.almacenamientoColegio.updateMany({ where: { tenantId }, data: { usadoBytes: { decrement: bytes } } });
    await tx.usoAlmacenamientoCategoria.updateMany({ where: { tenantId, categoria }, data: { bytes: { decrement: bytes }, archivos: { decrement: 1 } } });
  });
  await actualizarAvisoCuota(tenantId).catch((error) => console.error("[almacenamiento] no se pudo rearmar el umbral", error));
}
export async function recategorizarUso(ctx: TenantContext, anterior: CategoriaArchivo, nueva: CategoriaArchivo, bytes: bigint) {
  if (anterior === nueva) return;
  await db.$transaction(async (tx) => {
    await tx.usoAlmacenamientoCategoria.update({ where: { tenantId_categoria: { tenantId: ctx.tenant.id, categoria: anterior } }, data: { bytes: { decrement: bytes }, archivos: { decrement: 1 } } });
    await tx.usoAlmacenamientoCategoria.upsert({ where: { tenantId_categoria: { tenantId: ctx.tenant.id, categoria: nueva } }, create: { tenantId: ctx.tenant.id, categoria: nueva, bytes, archivos: 1 }, update: { bytes: { increment: bytes }, archivos: { increment: 1 } } });
    if (anterior === "exportacion" || nueva === "exportacion") await tx.almacenamientoColegio.update({ where: { tenantId: ctx.tenant.id }, data: { usadoBytes: { increment: nueva === "exportacion" ? -bytes : bytes } } });
  });
}
