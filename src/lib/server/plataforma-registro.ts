import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

/** Auditoría de plataforma para los módulos de equipo, anuncios y configuración (specs/22). `accion` es texto libre en la tabla. */
export async function registrarPlataforma(actorId: string, accion: string, tenantId: string | null, detalle?: Prisma.InputJsonValue): Promise<void> {
  await db.auditoriaPlataforma.create({ data: { actorId, accion, tenantId, detalle: detalle ?? Prisma.JsonNull } });
}
