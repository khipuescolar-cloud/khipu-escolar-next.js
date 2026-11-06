import "server-only";
import { urlColegio } from "@/lib/dominio";
import { carpetaVisible, type CarpetaPlana } from "@/lib/documentos";
import { contextoPermisosDocumento, nivelEfectivo } from "../documentos-permisos";
import { auditar } from "../auditoria";
import type { TenantContext } from "../tenant";
import { destinatariosDeAlumno, encolarParaDestinatario, tieneCanalAviso, type Destinatario } from "./encolar";
import { conEnvio } from "./envios";

// Aviso «documento nuevo» a las familias que pueden verlo (specs/31). Solo si quien lo subió marcó «Avisar a las familias».
// Una fila por familia y canal (consentimiento y preferencias vía destinatariosDeAlumno), `referenciaId = documentoId`. Idempotente.

/** Encola el aviso de un documento recién subido. Devuelve cuántas familias lo recibirán (0 si no es visible para familias). */
export async function avisarDocumentoNuevo(ctx: TenantContext, documentoId: string): Promise<number> {
  const doc = await ctx.db.documento.findFirst({ where: { id: documentoId, eliminadoAt: null } });
  if (!doc) return 0;
  const carpetas = new Map<string, CarpetaPlana>(
    (await ctx.db.carpetaDocumento.findMany({ select: { id: true, parentId: true, nombre: true, visibleRoles: true } })).map((c) => [c.id, c]),
  );
  if (doc.ambito === "biblioteca" && !carpetaVisible(carpetas, doc.carpetaId, "apoderado")) return 0;
  const permisos = await contextoPermisosDocumento(ctx);
  if ((await ctx.db.aviso.count({ where: { plantilla: "documento_nuevo", referenciaId: doc.id } })) > 0) return 0;

  const alumnos = await ctx.db.alumno.findMany({
    where: { estado: "activo", ...(doc.salonId ? { salonId: doc.salonId } : {}) },
    select: { id: true, salonId: true },
  });
  const familias = new Map<string, Destinatario>();
  for (const a of alumnos) {
    for (const d of await destinatariosDeAlumno(ctx.db, a.id)) {
      if (tieneCanalAviso(d) && !familias.has(d.apoderadoId) && nivelEfectivo(permisos.mapa, permisos.compartidos, { ...doc, propietarioId: doc.publicadoPorId }, "documento", { membershipId: d.apoderadoId, rol: "apoderado", salones: [a.salonId] }) !== "ninguno") familias.set(d.apoderadoId, d);
    }
  }
  const carpeta = doc.carpetaId ? carpetas.get(doc.carpetaId)?.nombre : undefined;
  const payload = { colegio: ctx.tenant.nombre, titulo: doc.titulo, ...(carpeta ? { carpeta } : {}), url: urlColegio(ctx.tenant.slug, doc.carpetaId ? `/documentos?carpeta=${doc.carpetaId}` : "/documentos") };
  await conEnvio(ctx.db, { tenantId: ctx.tenant.id, tipo: "documento", titulo: `Documento: ${doc.titulo}`, creadoPorId: ctx.membership.id }, async () => {
    for (const d of familias.values()) {
      await encolarParaDestinatario(ctx.db, d, { tenantId: ctx.tenant.id, tipo: "documento", plantilla: "documento_nuevo", referenciaId: doc.id, payload });
    }
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "enviar", entidad: "documento", entidadId: doc.id, detalle: { aviso: "documento_nuevo", familias: familias.size } });
  return familias.size;
}
