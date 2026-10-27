import "server-only";
import { z } from "zod";
import { normalizarTelefonoPeru } from "@/lib/telefono";
import { auditar } from "../auditoria";
import { db } from "../db";
import { ErrorDeNegocio } from "../contexto-accion";
import { exigirGestion } from "../gestion";
import type { TenantContext } from "../tenant";
import { smsConfigurado } from "./sms";
import { whatsappConfigurado } from "./whatsapp";

// Canales de pago (WhatsApp y SMS), specs/06. Apagados por defecto: se encola solo si
//   1. el colegio activó el canal (Tenant.whatsappActivo / smsActivo),
//   2. el servidor tiene las credenciales (si no, NO se encola y se registra en el log; así no hay filas condenadas a fallar),
//   3. el destinatario lo eligió (PreferenciaAviso.whatsapp / sms) y tiene un celular peruano válido en su perfil,
//   4. la plantilla tiene versión para ese canal.

export type PreferenciasCanalesPago = { whatsapp: boolean; sms: boolean };
/** Teléfonos E.164 a los que se enviará por cada canal de pago, ya filtrados por colegio, credenciales y preferencia. */
export type DestinosCanalesPago = { whatsapp: string | null; sms: string | null };

export type EstadoCredenciales = { whatsapp: boolean; sms: boolean };

/** Solo dice si están; nunca devuelve los valores. */
export function estadoCredenciales(entorno: Record<string, string | undefined> = process.env): EstadoCredenciales {
  return { whatsapp: whatsappConfigurado(entorno), sms: smsConfigurado(entorno) };
}

export type DatosCanalesPago = { telefono: string | null | undefined; preferencias: PreferenciasCanalesPago | null | undefined };

/** Qué canales de pago se usarían para un destinatario (consulta el colegio solo si eligió alguno). */
export async function resolverCanalesPago(tenantId: string, datos: DatosCanalesPago): Promise<DestinosCanalesPago> {
  const vacio: DestinosCanalesPago = { whatsapp: null, sms: null };
  const quiere = datos.preferencias;
  if (!quiere || (!quiere.whatsapp && !quiere.sms)) return vacio;
  const telefono = normalizarTelefonoPeru(datos.telefono);
  if (!telefono) return vacio;
  const colegio = await db.tenant.findUnique({ where: { id: tenantId }, select: { whatsappActivo: true, smsActivo: true } });
  if (!colegio) return vacio;
  const credenciales = estadoCredenciales();
  const destinos = { ...vacio };
  if (quiere.whatsapp && colegio.whatsappActivo) {
    if (credenciales.whatsapp) destinos.whatsapp = telefono;
    else console.warn("[avisos] WhatsApp activo en un colegio pero el servidor no tiene credenciales: no se encola");
  }
  if (quiere.sms && colegio.smsActivo) {
    if (credenciales.sms) destinos.sms = telefono;
    else console.warn("[avisos] SMS activo en un colegio pero el servidor no tiene proveedor configurado: no se encola");
  }
  return destinos;
}

const esquemaActivacion = z.object({ whatsappActivo: z.boolean(), smsActivo: z.boolean() });

/** Interruptores del colegio (solo dirección). */
export async function actualizarCanalesPago(ctx: TenantContext, entrada: z.input<typeof esquemaActivacion>): Promise<void> {
  exigirGestion(ctx);
  const d = esquemaActivacion.parse(entrada);
  await db.tenant.update({ where: { id: ctx.tenant.id }, data: d });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "configuracion", detalle: { canalesPago: d } });
}

/** Lo que ven las pantallas de preferencias: qué canales activó el colegio, el teléfono enmascarado y lo elegido. */
export async function obtenerOpcionesCanalesPago(ctx: TenantContext) {
  const [colegio, pref, perfil] = await Promise.all([
    db.tenant.findUniqueOrThrow({ where: { id: ctx.tenant.id }, select: { whatsappActivo: true, smsActivo: true } }),
    ctx.db.preferenciaAviso.findUnique({ where: { apoderadoId: ctx.membership.id }, select: { whatsapp: true, sms: true } }),
    db.profile.findUnique({ where: { id: ctx.user.id }, select: { telefono: true } }),
  ]);
  const telefono = normalizarTelefonoPeru(perfil?.telefono);
  return {
    whatsappActivo: colegio.whatsappActivo,
    smsActivo: colegio.smsActivo,
    whatsapp: pref?.whatsapp ?? false,
    sms: pref?.sms ?? false,
    telefono,
  };
}

/** Guarda el celular del perfil en E.164 (vacío lo quita). */
export async function guardarTelefonoPerfil(ctx: TenantContext, entrada: string): Promise<string | null> {
  const limpio = entrada.trim();
  if (limpio === "") {
    await db.profile.update({ where: { id: ctx.user.id }, data: { telefono: null } });
    return null;
  }
  const telefono = normalizarTelefonoPeru(limpio);
  if (!telefono) throw new ErrorDeNegocio("Escribe un celular de Perú de 9 dígitos que empiece en 9 (por ejemplo, 987 654 321).");
  await db.profile.update({ where: { id: ctx.user.id }, data: { telefono } });
  return telefono;
}
