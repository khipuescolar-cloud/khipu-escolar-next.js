import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

export type AccionAuditoria = "ver" | "crear" | "editar" | "borrar" | "exportar" | "enviar" | "login" | "soporte_ver";

/** Registra quién vio o cambió datos de alumnos (Ley 29733). No interrumpe el flujo si falla. */
export async function auditar(entrada: {
  tenantId: string;
  actorId: string | null;
  accion: AccionAuditoria;
  entidad: string;
  entidadId?: string | null;
  detalle?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await db.auditoria.create({ data: { ...entrada, entidadId: entrada.entidadId ?? null } });
  } catch (error) {
    console.error("[auditoria] no se pudo registrar", error);
  }
}

/** Varias entradas de auditoría en un solo INSERT (p. ej. una por alumno al guardar la lista). No interrumpe si falla. */
export async function auditarVarios(entradas: Parameters<typeof auditar>[0][]): Promise<void> {
  if (entradas.length === 0) return;
  try {
    await db.auditoria.createMany({ data: entradas.map((e) => ({ ...e, entidadId: e.entidadId ?? null })) });
  } catch (error) {
    console.error("[auditoria] no se pudo registrar", error);
  }
}
