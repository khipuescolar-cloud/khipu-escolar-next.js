import "server-only";
import { urlColegio } from "@/lib/dominio";
import { carpetaVisible, type CarpetaPlana } from "@/lib/documentos";
import { auditar } from "../auditoria";
import type { TenantContext } from "../tenant";
import { destinatariosDeAlumno, encolarParaDestinatario, tieneCanalAviso, type Destinatario } from "./encolar";

// Aviso «documento nuevo» a las familias que pueden verlo (specs/31). Solo si quien lo subió marcó «Avisar a las familias».
// Una fila por familia y canal (consentimiento y preferencias vía destinatariosDeAlumno), `referenciaId = documentoId`. Idempotente.

/** Encola el aviso de un documento recién subido. Devuelve cuántas familias lo recibirán (0 si no es visible para familias). */
export async function avisarDocumentoNuevo(ctx: TenantContext, documentoId: string): Promise<number> {
  const doc = await ctx.db.documento.findFirst({ where: { id: documentoId }, select: { id: true, titulo: true, carpetaId: true, salonId: true, visibleRoles: true } });
  if (!doc || !doc.visibleRoles.includes("apoderado")) return 0;
  const carpetas = new Map<string, CarpetaPlana>(
    (await ctx.db.carpetaDocumento.findMany({ select: { id: true, parentId: true, nombre: true, visibleRoles: true } })).map((c) => [c.id, c]),
  );
  if (!carpetaVisible(carpetas, doc.carpetaId, "apoderado")) return 0;
  if ((await ctx.db.aviso.count({ where: { plantilla: "documento_nuevo", referenciaId: doc.id } })) > 0) return 0;

  const alumnos = await ctx.db.alumno.findMany({
    where: { estado: "activo", ...(doc.salonId ? { salonId: doc.salonId } : {}) },
    select: { id: true },
  });
  const familias = new Map<string, Destinatario>();
  for (const a of alumnos) {
    for (const d of await destinatariosDeAlumno(ctx.db, a.id)) {
      if (tieneCanalAviso(d) && !familias.has(d.apoderadoId)) familias.set(d.apoderadoId, d);
    }
  }
  const carpeta = doc.carpetaId ? carpetas.get(doc.carpetaId)?.nombre : undefined;
  const payload = { colegio: ctx.tenant.nombre, titulo: doc.titulo, ...(carpeta ? { carpeta } : {}), url: urlColegio(ctx.tenant.slug, doc.carpetaId ? `/documentos?carpeta=${doc.carpetaId}` : "/documentos") };
  for (const d of familias.values()) {
    await encolarParaDestinatario(ctx.db, d, { tenantId: ctx.tenant.id, tipo: "documento", plantilla: "documento_nuevo", referenciaId: doc.id, payload });
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "enviar", entidad: "documento", entidadId: doc.id, detalle: { aviso: "documento_nuevo", familias: familias.size } });
  return familias.size;
}
