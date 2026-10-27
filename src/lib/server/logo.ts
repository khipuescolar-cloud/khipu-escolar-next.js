import "server-only";
import type { Tenant } from "@/generated/prisma/client";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import { exigirGestion } from "./gestion";
import { guardarArchivo, storage, SEGUNDOS_URL_TEMPORAL } from "./storage";
import { leerArchivoLocal } from "./storage/local";
import { detectarMime } from "./storage/validacion";
import type { TenantContext } from "./tenant";

// Logo del colegio (specs/10, specs/14): archivo público en FileStorage, referenciado por tenants.logo_archivo_id.

export const MAX_BYTES_LOGO = 1024 * 1024;
const MIMES_LOGO = ["image/png", "image/jpeg", "image/webp"];

type TenantLogo = Pick<Tenant, "id" | "logoArchivoId">;

async function archivoDelLogo(tenant: TenantLogo) {
  if (!tenant.logoArchivoId) return null;
  return db.archivo.findFirst({ where: { id: tenant.logoArchivoId, tenantId: tenant.id } });
}

/** URL para mostrar el logo (pública o firmada y de corta vida según el proveedor); null si el colegio no tiene logo. */
export async function urlLogoColegio(tenant: TenantLogo): Promise<string | null> {
  const archivo = await archivoDelLogo(tenant);
  if (!archivo) return null;
  if (archivo.url) return archivo.url;
  return storage().urlTemporal(archivo, SEGUNDOS_URL_TEMPORAL);
}

/** Bytes del logo para incrustarlo en un PDF (solo PNG y JPG: es lo que admite el generador). */
export async function logoParaPdf(tenant: TenantLogo): Promise<{ data: Buffer; format: "png" | "jpg" } | null> {
  const archivo = await archivoDelLogo(tenant);
  if (!archivo || (archivo.mimeType !== "image/png" && archivo.mimeType !== "image/jpeg")) return null;
  const format = archivo.mimeType === "image/png" ? "png" : "jpg";
  try {
    if (archivo.proveedor === "local") return { data: await leerArchivoLocal(archivo.publicId), format };
    const respuesta = await fetch(await storage().urlTemporal(archivo, SEGUNDOS_URL_TEMPORAL));
    return respuesta.ok ? { data: Buffer.from(await respuesta.arrayBuffer()), format } : null;
  } catch {
    return null;
  }
}

async function retirarArchivoAnterior(ctx: TenantContext, archivoId: string | null): Promise<void> {
  if (!archivoId) return;
  const anterior = await ctx.db.archivo.findFirst({ where: { id: archivoId } });
  if (!anterior) return;
  await storage().borrar(anterior).catch(() => undefined);
  await ctx.db.archivo.deleteMany({ where: { id: anterior.id } });
}

/** Sube el logo (PNG, JPG o WEBP, máx. 1 MB), lo deja público y reemplaza al anterior. */
export async function subirLogoColegio(ctx: TenantContext, buffer: Buffer): Promise<void> {
  exigirGestion(ctx);
  if (buffer.length === 0) throw new ErrorDeNegocio("Elige una imagen para el logo.");
  if (buffer.length > MAX_BYTES_LOGO) throw new ErrorDeNegocio("El logo pesa más de 1 MB.");
  const mime = detectarMime(buffer);
  if (!mime || !MIMES_LOGO.includes(mime)) throw new ErrorDeNegocio("El logo debe ser una imagen PNG, JPG o WEBP.");
  const r = await guardarArchivo(ctx.db, buffer, { tenantId: ctx.tenant.id, carpeta: "logo", privado: false, subidoPorId: ctx.user.id });
  if (!r.ok) throw new ErrorDeNegocio(r.error);
  const anteriorId = ctx.tenant.logoArchivoId;
  await db.tenant.update({ where: { id: ctx.tenant.id }, data: { logoArchivoId: r.archivo.id } });
  await retirarArchivoAnterior(ctx, anteriorId);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "logo", entidadId: r.archivo.id });
}

export async function quitarLogoColegio(ctx: TenantContext): Promise<void> {
  exigirGestion(ctx);
  const anteriorId = ctx.tenant.logoArchivoId;
  if (!anteriorId) return;
  await db.tenant.update({ where: { id: ctx.tenant.id }, data: { logoArchivoId: null } });
  await retirarArchivoAnterior(ctx, anteriorId);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "logo", entidadId: anteriorId });
}
