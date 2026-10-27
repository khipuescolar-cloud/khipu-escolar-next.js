import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Rol } from "@/generated/prisma/enums";
import { slugDesdeHost } from "@/lib/dominio";
import { requireTenantContext, type TenantContext } from "./tenant";

/**
 * Contexto del colegio para server actions (que no reciben `params`).
 * El colegio sale del `Host` del request (subdominio), nunca de un campo enviado por el cliente.
 */
export async function contextoDeAccion(rolesPermitidos?: Rol[]): Promise<TenantContext> {
  const slug = slugDesdeHost((await headers()).get("host"));
  if (!slug) notFound();
  return requireTenantContext(slug, rolesPermitidos);
}

/** Mensaje legible de un error de validación o de negocio para mostrarlo en la UI. */
export class ErrorDeNegocio extends Error {}
