import "server-only";
import { randomUUID } from "node:crypto";
import type { CategoriaArchivo } from "@/generated/prisma/client";
import { db } from "../db";

type Evento = "subidas" | "borrados" | "descargas" | "rechazosCuota" | "subidasFallidas";
export async function registrarMetrica(tenantId: string, categoria: CategoriaArchivo, evento: Evento, bytes: number): Promise<void> {
  const dia = new Date(new Date().toISOString().slice(0, 10));
  const campo = evento === "subidas" ? "bytesSubidos" : evento === "borrados" ? "bytesBorrados" : evento === "descargas" ? "bytesDescargaEstimados" : null;
  const create = { id: randomUUID(), tenantId, categoria, dia, [evento]: 1, ...(campo ? { [campo]: BigInt(bytes) } : {}) };
  const update = { [evento]: { increment: 1 }, ...(campo ? { [campo]: { increment: BigInt(bytes) } } : {}) };
  await db.metricaAlmacenamientoDia.upsert({ where: { tenantId_dia_categoria: { tenantId, dia, categoria } }, create, update });
}
