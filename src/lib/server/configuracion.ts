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
import { requireRol, type TenantContext } from "./tenant";
import { interpretarValor } from "@/lib/calificaciones";

// Configuración del colegio (specs/10-panel-direccion-gestion.md).
// Ya no se configuran `modoAvisos` ni `horaEnvioAvisos`: todas las llegadas se avisan al cerrar la lista
// (el resumen de llegadas se eliminó). Las columnas quedan en la BD sin uso.

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:mm (por ejemplo, 08:00).");
const dominio = z.string().regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, "Un dominio no es válido (ejemplo: micolegio.edu.pe).");

const rangoGrado = "El grado mínimo para la cuenta propia del alumno va de 1.° a 6.° de primaria.";

const rangoPlazo = `El plazo para justificar va de ${PLAZO_JUSTIFICACION_MIN_DIAS} a ${PLAZO_JUSTIFICACION_MAX_DIAS} días calendario.`;

const esquema = z.strictObject({
  horaLimiteTardanza: hora,
  /** Control de ingreso automático (specs/05). */
  horaLimiteFalta: hora.optional(),
  controlIngresoAutomatico: z.boolean().optional(),
  plazoJustificacionDias: z.coerce
    .number("El plazo para justificar debe ser un número de días calendario.")
    .int("El plazo para justificar debe ser un número entero de días calendario.")
    .min(PLAZO_JUSTIFICACION_MIN_DIAS, rangoPlazo)
    .max(PLAZO_JUSTIFICACION_MAX_DIAS, rangoPlazo)
    .optional(),
  escalaCalificacion: z.enum(["literal", "vigesimal"]),
  /** Cómo se sugiere la calificación literal del periodo (specs/11). */
  sugerenciaPeriodo: z.enum(["ninguna", "promedio", "frecuente"], "Elige si Khipu sugiere la calificación del periodo.").optional(),
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

const esquemaReglas = z.strictObject({
  /** Valor que Khipu pone al vencer el plazo sin justificación: «AD/A/B/C» o «0–20» según la escala; vacío = sin configurar. */
  consecuenciaVencimiento: z.string().trim().max(10),
  /** Sin uso desde specs/38 (el resumen académico diario se retiró); se acepta por compatibilidad. */
  horaResumenAcademico: hora.optional(),
});

/**
 * Reglas académicas del colegio (specs/37). Solo dirección. La consecuencia por vencimiento es opcional: sin ella Khipu no
 * inventa un valor (los NSP vencidos quedan como alerta). Audita antes y después.
 */
export async function actualizarReglasAcademicas(ctx: TenantContext, entrada: unknown): Promise<void> {
  requireRol(ctx, ["direccion"]);
  const r = esquemaReglas.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0].message);
  let literal: "AD" | "A" | "B" | "C" | null = null;
  let numerica: number | null = null;
  if (r.data.consecuenciaVencimiento !== "") {
    const v = interpretarValor(ctx.tenant.escalaCalificacion, r.data.consecuenciaVencimiento);
    if (!v.ok || !v.valor) throw new ErrorDeNegocio(ctx.tenant.escalaCalificacion === "literal" ? "La consecuencia debe ser AD, A, B o C." : "La consecuencia debe ser una nota de 0 a 20.");
    literal = v.valor.valorLiteral;
    numerica = v.valor.valorNumerico;
  }
  const antes = {
    consecuenciaVencimientoLiteral: ctx.tenant.consecuenciaVencimientoLiteral,
    consecuenciaVencimientoNumerica: ctx.tenant.consecuenciaVencimientoNumerica?.toString() ?? null,
    horaResumenAcademico: ctx.tenant.horaResumenAcademico,
  };
  const ahora = {
    consecuenciaVencimientoLiteral: literal, consecuenciaVencimientoNumerica: numerica,
    ...(r.data.horaResumenAcademico ? { horaResumenAcademico: r.data.horaResumenAcademico } : {}),
  };
  await db.tenant.update({ where: { id: ctx.tenant.id }, data: ahora });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "reglas_academicas", detalle: { antes, ahora } as unknown as Prisma.InputJsonValue });
}
