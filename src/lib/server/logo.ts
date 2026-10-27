import "server-only";
import type { Tenant } from "@/generated/prisma/client";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { db, dbTenant, type DbTenant } from "./db";
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

/** Bytes del logo para incrustarlo en un PDF: PNG y JPG tal cual; WEBP o SVG se convierten a PNG con sharp (el generador no los admite). */
export async function logoParaPdf(tenant: TenantLogo): Promise<{ data: Buffer; format: "png" | "jpg" } | null> {
  const archivo = await archivoDelLogo(tenant);
  if (!archivo || !archivo.mimeType.startsWith("image/")) return null;
  try {
    let data: Buffer;
    if (archivo.proveedor === "local") data = await leerArchivoLocal(archivo.publicId);
    else {
      const respuesta = await fetch(await storage().urlTemporal(archivo, SEGUNDOS_URL_TEMPORAL));
      if (!respuesta.ok) return null;
      data = Buffer.from(await respuesta.arrayBuffer());
    }
    if (archivo.mimeType === "image/png") return { data, format: "png" };
    if (archivo.mimeType === "image/jpeg") return { data, format: "jpg" };
    const { default: sharp } = await import("sharp");
    return { data: await sharp(data).png().toBuffer(), format: "png" };
  } catch {
    return null;
  }
}

async function retirarArchivoAnterior(tdb: DbTenant, archivoId: string | null): Promise<void> {
  if (!archivoId) return;
  const anterior = await tdb.archivo.findFirst({ where: { id: archivoId } });
  if (!anterior) return;
  await storage().borrar(anterior).catch(() => undefined);
  await tdb.archivo.deleteMany({ where: { id: anterior.id } });
}

/** Valida el logo (PNG, JPG o WEBP, máx. 1 MB). Lanza ErrorDeNegocio con un mensaje legible. */
export function validarLogo(buffer: Buffer): void {
  if (buffer.length === 0) throw new ErrorDeNegocio("Elige una imagen para el logo.");
  if (buffer.length > MAX_BYTES_LOGO) throw new ErrorDeNegocio("El logo pesa más de 1 MB.");
  const mime = detectarMime(buffer);
  if (!mime || !MIMES_LOGO.includes(mime)) throw new ErrorDeNegocio("El logo debe ser una imagen PNG, JPG o WEBP.");
}

/**
 * Guarda el logo como archivo público y reemplaza al anterior. Sin control de permisos ni auditoría:
 * lo llaman `subirLogoColegio` (dirección) y el panel de plataforma (specs/16), que validan antes.
 * Devuelve el id del archivo nuevo.
 */
export async function reemplazarLogo(tenant: TenantLogo, buffer: Buffer, subidoPorId: string | null): Promise<string> {
  validarLogo(buffer);
  const tdb = dbTenant(tenant.id);
  const r = await guardarArchivo(tdb, buffer, { tenantId: tenant.id, carpeta: "logo", privado: false, subidoPorId });
  if (!r.ok) throw new ErrorDeNegocio(r.error);
  await db.tenant.update({ where: { id: tenant.id }, data: { logoArchivoId: r.archivo.id } });
  await retirarArchivoAnterior(tdb, tenant.logoArchivoId);
  return r.archivo.id;
}

/** Quita el logo (archivo y fila). Sin control de permisos: ver `reemplazarLogo`. */
export async function retirarLogo(tenant: TenantLogo): Promise<void> {
  if (!tenant.logoArchivoId) return;
  await db.tenant.update({ where: { id: tenant.id }, data: { logoArchivoId: null } });
  await retirarArchivoAnterior(dbTenant(tenant.id), tenant.logoArchivoId);
}

/** Sube el logo (PNG, JPG o WEBP, máx. 1 MB), lo deja público y reemplaza al anterior. */
export async function subirLogoColegio(ctx: TenantContext, buffer: Buffer): Promise<void> {
  exigirGestion(ctx);
  const archivoId = await reemplazarLogo(ctx.tenant, buffer, ctx.user.id);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "logo", entidadId: archivoId });
}

export async function quitarLogoColegio(ctx: TenantContext): Promise<void> {
  exigirGestion(ctx);
  const anteriorId = ctx.tenant.logoArchivoId;
  if (!anteriorId) return;
  await retirarLogo(ctx.tenant);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "logo", entidadId: anteriorId });
}
