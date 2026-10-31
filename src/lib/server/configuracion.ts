import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { Nivel } from "@/generated/prisma/enums";
import { NIVELES } from "@/lib/asistencia-por-curso";
import { horasControlValidas } from "@/lib/control-ingreso";
import { PLAZO_JUSTIFICACION_MAX_DIAS, PLAZO_JUSTIFICACION_MIN_DIAS } from "@/lib/plazo-justificacion";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import { exigirGestion } from "./gestion";
import type { TenantContext } from "./tenant";

// Configuración del colegio (specs/10-panel-direccion-gestion.md).
// Ya no se configuran `modoAvisos` ni `horaEnvioAvisos`: todas las llegadas se avisan al cerrar la lista
// (el resumen de llegadas se eliminó). Las columnas quedan en la BD sin uso.

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:mm (por ejemplo, 08:00).");
const dominio = z.string().regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, "Un dominio no es válido (ejemplo: micolegio.edu.pe).");

const rangoGrado = "El grado mínimo para la cuenta propia del alumno va de 1.° a 6.° de primaria.";

const rangoPlazo = `El plazo para justificar va de ${PLAZO_JUSTIFICACION_MIN_DIAS} a ${PLAZO_JUSTIFICACION_MAX_DIAS} días hábiles.`;

const esquema = z.strictObject({
  horaLimiteTardanza: hora,
  /** Control de ingreso automático (specs/05). */
  horaLimiteFalta: hora.optional(),
  controlIngresoAutomatico: z.boolean().optional(),
  plazoJustificacionDiasHabiles: z.coerce
    .number("El plazo para justificar debe ser un número de días hábiles.")
    .int("El plazo para justificar debe ser un número entero de días hábiles.")
    .min(PLAZO_JUSTIFICACION_MIN_DIAS, rangoPlazo)
    .max(PLAZO_JUSTIFICACION_MAX_DIAS, rangoPlazo)
    .optional(),
  escalaCalificacion: z.enum(["literal", "vigesimal"]),
  /** Grado de primaria desde el que un alumno puede tener cuenta propia (secundaria siempre; inicial nunca). */
  gradoMinimoCuentaAlumno: z.coerce
    .number("Elige el grado mínimo para la cuenta propia del alumno.")
    .int(rangoGrado)
    .min(1, rangoGrado)
    .max(6, rangoGrado)
    .optional(),
  emailDomains: z.string().transform((v) => [...new Set(v.split(/[\s,;]+/).map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean))]).pipe(z.array(dominio)),
});

export async function actualizarConfiguracion(ctx: TenantContext, entrada: z.input<typeof esquema>): Promise<void> {
  exigirGestion(ctx);
  if (entrada && typeof entrada === "object" && ("modoAvisos" in entrada || "horaEnvioAvisos" in entrada)) {
    throw new ErrorDeNegocio("El modo y la hora de los avisos ya no se configuran: cada llegada se avisa al cerrar la lista.");
  }
  const r = esquema.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0].message);
  const d = r.data;
  if (!horasControlValidas(d.horaLimiteTardanza, d.horaLimiteFalta ?? ctx.tenant.horaLimiteFalta)) {
    throw new ErrorDeNegocio("La hora límite de falta debe ser posterior a la hora de tardanza.");
  }
  if (d.controlIngresoAutomatico && !ctx.modulos.has("porteria")) {
    throw new ErrorDeNegocio("El control de ingreso automático necesita el módulo Portería.");
  }
  if (d.emailDomains.length > 0) {
    const ocupado = await db.tenant.findFirst({ where: { id: { not: ctx.tenant.id }, emailDomains: { hasSome: d.emailDomains } }, select: { id: true } });
    if (ocupado) throw new ErrorDeNegocio("Alguno de esos dominios ya lo usa otro colegio.");
  }
  await db.tenant.update({ where: { id: ctx.tenant.id }, data: d });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "configuracion", detalle: d as unknown as Prisma.InputJsonValue });
}

const esquemaNiveles = z.array(z.enum(NIVELES, "Ese nivel no existe.")).max(NIVELES.length);

/**
 * Niveles con asistencia por curso (specs/04). Solo dirección. Apagar un nivel no borra registros: los profesores dejan
 * de ver esas listas y `guardarLista` las rechaza; el historial y los reportes las siguen mostrando. Audita antes/después.
 */
export async function actualizarAsistenciaPorCurso(ctx: TenantContext, niveles: unknown): Promise<Nivel[]> {
  exigirGestion(ctx);
  const r = esquemaNiveles.safeParse(niveles);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0].message);
  const ahora = NIVELES.filter((n) => r.data.includes(n));
  const antes = ctx.tenant.asistenciaPorCursoNiveles;
  await db.tenant.update({ where: { id: ctx.tenant.id }, data: { asistenciaPorCursoNiveles: ahora } });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "configuracion",
    detalle: { asistenciaPorCursoNiveles: { antes, ahora } },
  });
  return ahora;
}
