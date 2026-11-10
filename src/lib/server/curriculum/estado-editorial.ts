import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { ErrorDeNegocio } from "../contexto-accion";
import { requireAdminPlataforma } from "../plataforma";
import type { EstadoEditorial } from "./autorizacion";

/** Contrato del modelo global que implementará modelo.ts; no da acceso a tablas de alumnos. */
export interface RepositorioEstadoEditorial {
  buscar(tx: Prisma.TransactionClient, clave: string): Promise<{ estadoEditorial: EstadoEditorial; aptoParaPublicar: boolean } | null>;
  cambiarSiEstado(
    tx: Prisma.TransactionClient,
    clave: string,
    anterior: EstadoEditorial,
    siguiente: EstadoEditorial,
    editorId: string,
    fecha: Date,
  ): Promise<boolean>;
}

/** Solo una sesión de super administrador activo puede editar el catálogo global. */
export async function requireEditorKhipu() {
  return requireAdminPlataforma();
}

/** Cambio compare-and-set y bitácora de plataforma en una sola transacción. */
export async function cambiarEstadoEditorial(
  repositorio: RepositorioEstadoEditorial,
  claveCruda: unknown,
  estadoCrudo: unknown,
): Promise<{ anterior: EstadoEditorial; actual: EstadoEditorial }> {
  const admin = await requireEditorKhipu();
  const clave = z.string().trim().min(1).max(160).parse(claveCruda);
  const siguiente = z.enum(["borrador", "revisado"]).parse(estadoCrudo);
  return db.$transaction(async (tx) => {
    const tema = await repositorio.buscar(tx, clave);
    if (!tema) notFound();
    const anterior = tema.estadoEditorial;
    if (siguiente === "revisado" && !tema.aptoParaPublicar) throw new ErrorDeNegocio("Completa la revisión legal y pedagógica antes de publicar.");
    if (anterior === siguiente) return { anterior, actual: siguiente };
    const cambiado = await repositorio.cambiarSiEstado(tx, clave, anterior, siguiente, admin.user.id, new Date());
    if (!cambiado) throw new ErrorDeNegocio("El estado del tema cambió. Vuelve a cargarlo.");
    await tx.auditoriaPlataforma.create({ data: {
      actorId: admin.user.id,
      accion: "curriculum_estado_editorial",
      tenantId: null,
      detalle: { clave, anterior, actual: siguiente },
    } });
    return { anterior, actual: siguiente };
  });
}

/** TODO(modelo A): conectar un repositorio Prisma de temas globales cuando exista su tabla. */
