import { tieneFeature } from "../plan";
import type { ResolverAcceso } from "./tipos";

export const resolverAccesoSolicitud: ResolverAcceso = async (ctx, archivo) => {
  const version = await ctx.db.solicitudVersionArchivo.findFirst({ where: { archivoId: archivo.id }, include: { version: { include: { destinatario: true } } } });
  const plantilla = archivo.documentoId ? await ctx.db.solicitudDocumental.findFirst({ where: { plantillaDocumentoId: archivo.documentoId, estado: { in: ["publicada", "cerrada"] }, destinatarios: { some: { membershipId: ctx.membership.id, retiradoAt: null } } } }) : null;
  if (!version && !plantilla) return null;
  if (ctx.soporte || !tieneFeature(ctx, "documentos")) return "denegar";
  if (version) return ctx.rol === "direccion" || (ctx.rol === "profesor" && version.version.destinatario.membershipId === ctx.membership.id && !version.version.destinatario.retiradoAt) ? "permitir" : "denegar";
  return ctx.rol === "direccion" || (ctx.rol === "profesor" && !!plantilla) ? "permitir" : "denegar";
};
