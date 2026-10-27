import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import { exigirGestion } from "./gestion";
import type { TenantContext } from "./tenant";

// Configuración del colegio (specs/10-panel-direccion-gestion.md).

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:mm (por ejemplo, 08:00).");
const dominio = z.string().regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, "Un dominio no es válido (ejemplo: micolegio.edu.pe).");

const esquema = z.object({
  horaEnvioAvisos: hora,
  horaLimiteTardanza: hora,
  modoAvisos: z.enum(["todos", "solo_excepciones"]),
  escalaCalificacion: z.enum(["literal", "vigesimal"]),
  emailDomains: z.string().transform((v) => [...new Set(v.split(/[\s,;]+/).map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean))]).pipe(z.array(dominio)),
});

export async function actualizarConfiguracion(ctx: TenantContext, entrada: z.input<typeof esquema>): Promise<void> {
  exigirGestion(ctx);
  const r = esquema.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0].message);
  const d = r.data;
  if (d.emailDomains.length > 0) {
    const ocupado = await db.tenant.findFirst({ where: { id: { not: ctx.tenant.id }, emailDomains: { hasSome: d.emailDomains } }, select: { id: true } });
    if (ocupado) throw new ErrorDeNegocio("Alguno de esos dominios ya lo usa otro colegio.");
  }
  await db.tenant.update({ where: { id: ctx.tenant.id }, data: d });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "configuracion", detalle: d as unknown as Prisma.InputJsonValue });
}
