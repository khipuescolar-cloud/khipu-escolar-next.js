import "server-only";
import { urlColegio } from "@/lib/dominio";
import { fechaLima, formatoHora } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import type { TenantContext } from "../tenant";
import { encolarParaDestinatario, tieneCanalAviso, type Destinatario } from "./encolar";

// Avisos de reuniones (specs/32): convocatoria, recordatorio, cancelación y acta publicada.
// Una fila por familia y canal, aunque la familia tenga varias filas de invitado (una por hijo).
// Solo familias con consentimiento vigente y según sus preferencias (igual que el resto de avisos a familias).

export type PlantillaReunion = "reunion_convocada" | "reunion_recordatorio" | "reunion_cancelada" | "reunion_acta";

type ReunionParaAviso = { id: string; titulo: string; inicio: Date; lugar: string | null; enlace: string | null };

function unirNombres(nombres: string[]): string {
  return nombres.length <= 1 ? (nombres[0] ?? "") : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/**
 * Encola el aviso `plantilla` para las familias de los invitados indicados. `filas` = invitados (puede haber
 * varios por apoderado). Devuelve cuántas familias recibirán aviso.
 */
export async function avisarReunion(
  ctx: TenantContext,
  plantilla: PlantillaReunion,
  reunion: ReunionParaAviso,
  filas: { membershipId: string; alumnoId: string | null }[],
): Promise<number> {
  if (filas.length === 0) return 0;
  const membershipIds = [...new Set(filas.map((f) => f.membershipId))];
  const alumnoIds = [...new Set(filas.flatMap((f) => (f.alumnoId ? [f.alumnoId] : [])))];
  const [apoderados, alumnos] = await Promise.all([
    ctx.db.membership.findMany({
      where: { id: { in: membershipIds }, rol: "apoderado", estado: "activa", consentimientos: { some: { revocadoAt: null } } },
      select: {
        id: true,
        preferenciaAviso: { select: { correo: true, push: true } },
        user: { select: { email: true, pushSuscripciones: { select: { endpoint: true } } } },
      },
    }),
    ctx.db.alumno.findMany({ where: { id: { in: alumnoIds } }, select: { id: true, nombres: true } }),
  ]);
  const nombreAlumno = new Map(alumnos.map((a) => [a.id, primerNombre(a.nombres)]));
  const base = {
    colegio: ctx.tenant.nombre,
    titulo: reunion.titulo,
    fecha: fechaLima(reunion.inicio),
    hora: formatoHora(reunion.inicio),
    ...(reunion.lugar ? { lugar: reunion.lugar } : {}),
    ...(reunion.enlace ? { enlace: reunion.enlace } : {}),
    url: urlColegio(ctx.tenant.slug, `/reuniones/${reunion.id}`),
  };
  let familias = 0;
  for (const a of apoderados) {
    const pref = a.preferenciaAviso ?? { correo: true, push: true };
    const destinatario: Destinatario = {
      apoderadoId: a.id,
      email: a.user.email,
      correo: pref.correo,
      pushEndpoints: pref.push ? a.user.pushSuscripciones.map((s) => s.endpoint) : [],
    };
    if (!tieneCanalAviso(destinatario)) continue;
    const hijos = filas
      .filter((f) => f.membershipId === a.id && f.alumnoId)
      .map((f) => nombreAlumno.get(f.alumnoId!))
      .filter((n): n is string => !!n);
    const nombres = unirNombres([...new Set(hijos)]);
    await encolarParaDestinatario(ctx.db, destinatario, {
      tenantId: ctx.tenant.id,
      tipo: "reunion",
      plantilla,
      referenciaId: reunion.id,
      payload: { ...base, ...(nombres ? { alumno: nombres } : {}) },
    });
    familias++;
  }
  return familias;
}
