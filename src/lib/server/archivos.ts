import "server-only";
import { forbidden, notFound } from "next/navigation";
import type { Archivo } from "@/generated/prisma/client";
import { resolverAccesoLegado, puedeVerComunicado, puedeVerTarea } from "./archivos-acceso/legado";
import { resolverAccesoMaterial } from "./archivos-acceso/material";
import { resolverAccesoSolicitud } from "./archivos-acceso/solicitud";
import type { TenantContext } from "./tenant";
export { puedeVerComunicado, puedeVerTarea };

export async function requireArchivoVisible(ctx: TenantContext, archivoId: string): Promise<Archivo> {
  const archivo = await ctx.db.archivo.findUnique({ where: { id: archivoId } });
  if (!archivo) notFound();
  for (const resolver of [resolverAccesoLegado, resolverAccesoMaterial, resolverAccesoSolicitud]) {
    const resultado = await resolver(ctx, archivo);
    if (resultado === "permitir") return archivo;
    if (resultado === "denegar") forbidden();
  }
  forbidden();
}
