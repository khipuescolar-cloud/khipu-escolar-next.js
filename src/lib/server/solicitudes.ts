import "server-only";
import { createHmac } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import type { Plan, SolicitudDemo } from "@/generated/prisma/client";
import { env } from "@/lib/env";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import { plantillaSolicitudDemo } from "./email/plantillas/solicitud-demo";
import { correoEquipoSoporte } from "./notificaciones/avisos-soporte";
import { EmailChannel } from "./notificaciones/email";

// Pedidos de demo desde la landing pública (specs/25). La tabla es global: todavía no hay colegio.
// Protección: campo trampa (bots), máximo de envíos por IP y por hora (la IP se guarda solo como HMAC).

export const MAX_SOLICITUDES_POR_HORA = 3;

export const esquemaSolicitudDemo = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre.").max(120),
  cargo: z.string().trim().max(80).optional().transform((v) => v || undefined),
  colegio: z.string().trim().min(2, "Escribe el nombre del colegio.").max(160),
  ciudad: z.string().trim().max(80).optional().transform((v) => v || undefined),
  correo: z.email("Escribe un correo válido.").transform((v) => v.trim().toLowerCase()),
  telefono: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || /^[+\d\s()-]{6,20}$/.test(v), "Escribe un teléfono válido."),
  alumnos: z.coerce.number().int().min(1).max(20000).optional().catch(undefined),
  mensaje: z.string().trim().max(1500).optional().transform((v) => v || undefined),
  planInteres: z.enum(["basico", "fase2", "promax"]).optional().catch(undefined),
  /** Campo trampa: invisible para personas; si viene lleno, es un bot. */
  sitio: z.string().optional(),
});

export type EntradaSolicitudDemo = z.input<typeof esquemaSolicitudDemo>;

function hashIp(ip: string): string {
  return createHmac("sha256", env.appSecret).update(`solicitud-demo:${ip}`, "utf8").digest("base64url");
}

/**
 * Guarda un pedido de demo. Devuelve `null` si es un bot (campo trampa lleno): la UI responde igual que si
 * se hubiera guardado, para no darle pistas. Lanza `ErrorDeNegocio` con un mensaje para la persona.
 */
export async function crearSolicitudDemo(entrada: EntradaSolicitudDemo, ip: string, ahora = new Date()): Promise<SolicitudDemo | null> {
  const r = esquemaSolicitudDemo.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos del formulario.");
  const { sitio, ...datos } = r.data;
  if (sitio && sitio.trim()) return null;

  const ipHash = hashIp(ip || "desconocida");
  const recientes = await db.solicitudDemo.count({ where: { ipHash, createdAt: { gte: new Date(ahora.getTime() - 3_600_000) } } });
  if (recientes >= MAX_SOLICITUDES_POR_HORA) {
    throw new ErrorDeNegocio("Ya recibimos tus datos. Te escribiremos pronto; si es urgente, inténtalo de nuevo en una hora.");
  }
  const solicitud = await db.solicitudDemo.create({ data: { ...datos, planInteres: datos.planInteres as Plan | undefined, ipHash } });
  await programarAviso(solicitud);
  return solicitud;
}

/**
 * Avisa al buzón del equipo Khipu (`soporte:correo`, o el remitente del sistema). La cola de avisos exige colegio, así que
 * se envía directo con el transporte de correo. Nunca lanza: un fallo se registra y el pedido ya quedó guardado.
 * Devuelve `true` si el correo salió.
 */
export async function avisarSolicitudNueva(solicitud: SolicitudDemo, canal: Pick<EmailChannel, "enviar"> = new EmailChannel()): Promise<boolean> {
  try {
    const destinatario = await correoEquipoSoporte();
    if (!destinatario) {
      console.error("[solicitudes] sin buzón del equipo configurado: no se avisó de la solicitud", solicitud.id);
      return false;
    }
    await canal.enviar({
      avisoId: `solicitud-${solicitud.id}`,
      destinatario,
      remitente: "Khipu Escolar",
      mensaje: plantillaSolicitudDemo(solicitud),
      plantilla: "solicitud_demo",
    });
    return true;
  } catch (error) {
    console.error("[solicitudes] no se pudo avisar de la solicitud", solicitud.id, error);
    return false;
  }
}

/** Dentro de un request, el aviso sale tras responder (`after`); fuera de uno (scripts, pruebas) se envía de forma directa. */
async function programarAviso(solicitud: SolicitudDemo): Promise<void> {
  try {
    after(async () => {
      await avisarSolicitudNueva(solicitud);
    });
  } catch {
    await avisarSolicitudNueva(solicitud);
  }
}
