import "server-only";
import { urlColegio } from "@/lib/dominio";
import { momentoEnZona } from "@/lib/fechas";
import { db, dbTenant } from "../db";
import { encolarAviso } from "./encolar";
import { destinoPersonal } from "./preferencias";

// Transparencia del modo soporte (specs/16): cuando el equipo Khipu entra a un colegio, cada miembro activo de
// dirección recibe la plantilla `soporte_inicio` por correo y/o push según su perfil (sin fila: ambos).
// `referenciaId = accesoId`. Las filas no llevan `apoderadoId` (no son avisos a familias).

/** Encola el aviso de inicio de soporte a la dirección del colegio. Devuelve cuántas filas creó. */
export async function avisarInicioSoporte(tenantId: string, acceso: { id: string; motivo: string; expiraAt: Date }): Promise<number> {
  const tdb = dbTenant(tenantId);
  const [colegio, direccion] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenantId }, select: { nombre: true, slug: true } }),
    tdb.membership.findMany({ where: { rol: "direccion", estado: "activa" }, select: { id: true } }),
  ]);
  if (!colegio) return 0;
  const payload = {
    colegio: colegio.nombre,
    hasta: momentoEnZona(acceso.expiraAt).hora,
    motivo: acceso.motivo,
    url: urlColegio(colegio.slug, "/configuracion/auditoria"),
  };
  const base = { tenantId, tipo: "alerta_direccion" as const, plantilla: "soporte_inicio" as const, payload, referenciaId: acceso.id };
  let encoladas = 0;
  for (const d of direccion) {
    const destino = await destinoPersonal(tdb, d.id, ["direccion"]);
    if (!destino) continue;
    if (destino.correo) {
      await encolarAviso(tdb, { ...base, canal: "correo", destinatario: destino.email });
      encoladas++;
    }
    for (const endpoint of destino.pushEndpoints) {
      await encolarAviso(tdb, { ...base, canal: "push", destinatario: endpoint });
      encoladas++;
    }
  }
  return encoladas;
}
