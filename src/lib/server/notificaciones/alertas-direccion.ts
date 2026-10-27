import "server-only";
import { urlColegio } from "@/lib/dominio";
import { fechaLima, inicioDiaLima } from "@/lib/fechas";
import { nombreCompleto } from "@/lib/mensajes";
import { primerNombre } from "@/lib/nombres";
import { db, dbTenant } from "../db";
import { encolarAviso } from "./encolar";
import { destinoPersonal } from "./preferencias";

// Alerta a dirección cuando SES desactiva el correo de una familia (rebote permanente o queja), specs/06.
// Correo y push a cada miembro activo de dirección según sus preferencias de perfil (sin consentimiento: es personal).
// `referenciaId = apoderadoId`; máx. 1 alerta por apoderado por día (hora de Lima). Las filas no llevan
// `apoderadoId` (no son avisos a familia), así un rebote del correo de dirección no genera otra alerta.

export type MotivoDesactivacion = "rebote" | "queja";

const MOTIVO: Record<MotivoDesactivacion, string> = {
  rebote: "su correo rebotó (la dirección no existe o no recibe mensajes)",
  queja: "marcó nuestro correo como spam",
};

/** Devuelve cuántas alertas encoló (0 si ya hubo una hoy para ese apoderado). */
export async function alertarCorreoDesactivado(
  tenantId: string,
  apoderadoId: string,
  motivo: MotivoDesactivacion,
  ahora: Date = new Date(),
): Promise<number> {
  const tdb = dbTenant(tenantId);
  const hoy = inicioDiaLima(fechaLima(ahora));
  const yaHoy = await tdb.aviso.count({ where: { plantilla: "alerta_rebote", referenciaId: apoderadoId, createdAt: { gte: hoy } } });
  if (yaHoy > 0) return 0;

  const [colegio, apoderado, direccion] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenantId }, select: { nombre: true, slug: true } }),
    tdb.membership.findFirst({
      where: { id: apoderadoId },
      select: {
        user: { select: { nombres: true, apellidos: true } },
        hijos: { select: { alumno: { select: { nombres: true } } } },
      },
    }),
    tdb.membership.findMany({ where: { rol: "direccion", estado: "activa" }, select: { id: true } }),
  ]);
  if (!colegio || !apoderado) return 0;

  const payload = {
    colegio: colegio.nombre,
    apoderado: nombreCompleto(apoderado.user),
    alumnos: apoderado.hijos.map((v) => primerNombre(v.alumno.nombres)),
    motivo: MOTIVO[motivo],
    url: urlColegio(colegio.slug, "/avisos"),
  };
  let encoladas = 0;
  for (const d of direccion) {
    // Cada miembro de dirección elige correo y/o push en su perfil (sin fila: ambos).
    const destino = await destinoPersonal(tdb, d.id, ["direccion"]);
    if (!destino) continue;
    const base = { tenantId, tipo: "alerta_direccion" as const, plantilla: "alerta_rebote" as const, payload, referenciaId: apoderadoId };
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
