import "server-only";
import { createVerify } from "node:crypto";
import type { EstadoAviso } from "@/generated/prisma/enums";
import { auditar } from "../auditoria";
import { db } from "../db";
import { alertarCorreoDesactivado } from "./alertas-direccion";

// Eventos de Amazon SES vía SNS → /api/webhooks/ses (specs/06).
// La firma SNS se verifica con node:crypto. El certificado solo se descarga de sns.<región>.amazonaws.com.

export type MensajeSns = {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation" | string;
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  Subject?: string;
  Token?: string;
  SubscribeURL?: string;
};

/** Solo https://sns.<región>.amazonaws.com(.cn)/…pem */
export function urlDeAwsValida(url: string | undefined, sufijoRuta = ".pem"): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/.test(u.hostname) &&
      (sufijoRuta === "" || u.pathname.endsWith(sufijoRuta))
    );
  } catch {
    return false;
  }
}

/** Texto canónico que firma SNS (orden y campos según el tipo de mensaje). */
export function textoAFirmar(m: MensajeSns): string {
  const campos =
    m.Type === "Notification"
      ? ["Message", "MessageId", ...(m.Subject !== undefined ? ["Subject"] : []), "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  return campos.map((c) => `${c}\n${(m as Record<string, string | undefined>)[c] ?? ""}\n`).join("");
}

const certificados = new Map<string, string>();

async function descargarCertificado(url: string): Promise<string> {
  const enCache = certificados.get(url);
  if (enCache) return enCache;
  const res = await fetch(url, { redirect: "error" });
  if (!res.ok) throw new Error(`No se pudo descargar el certificado SNS (${res.status})`);
  const pem = await res.text();
  if (!pem.includes("BEGIN CERTIFICATE")) throw new Error("Certificado SNS no válido");
  certificados.set(url, pem);
  return pem;
}

/** Verifica la firma de un mensaje SNS. `obtenerCertificado` se puede reemplazar en pruebas. */
export async function verificarFirmaSns(
  m: MensajeSns,
  obtenerCertificado: (url: string) => Promise<string> = descargarCertificado,
): Promise<boolean> {
  if (!m?.Signature || !urlDeAwsValida(m.SigningCertURL)) return false;
  const algoritmo = m.SignatureVersion === "1" ? "RSA-SHA1" : m.SignatureVersion === "2" ? "RSA-SHA256" : null;
  if (!algoritmo) return false;
  const temaEsperado = process.env.SES_SNS_TOPIC_ARN;
  if (temaEsperado && m.TopicArn !== temaEsperado) return false;
  try {
    const pem = await obtenerCertificado(m.SigningCertURL);
    return createVerify(algoritmo).update(textoAFirmar(m), "utf8").verify(pem, m.Signature, "base64");
  } catch {
    return false;
  }
}

/** Confirma la suscripción del tema SNS (solo URLs de AWS). */
export async function confirmarSuscripcion(m: MensajeSns): Promise<boolean> {
  if (!urlDeAwsValida(m.SubscribeURL, "")) return false;
  const res = await fetch(m.SubscribeURL!, { redirect: "error" });
  return res.ok;
}

type EventoSes = {
  eventType?: string;
  notificationType?: string;
  mail?: {
    messageId?: string;
    headers?: { name: string; value: string }[];
    commonHeaders?: { messageId?: string };
  };
  bounce?: { bounceType?: string };
};

/** Orden de los estados de entrega: nunca se baja de «abierto» a «entregado». */
const RANGO: Partial<Record<EstadoAviso, number>> = { enviado: 1, entregado: 2, abierto: 3, rebotado: 4, queja: 5 };

function limpiarId(id: string | undefined): string | null {
  return id ? id.trim().replace(/^<|>$/g, "") : null;
}

/** Aplica un evento de SES a la fila de `avisos`. Devuelve el nuevo estado o null si no aplica. */
export async function procesarEventoSes(
  evento: EventoSes,
  opciones: { /** Se llama cuando se encoló una alerta a dirección, para enviarla sin esperar al cron. */ alEncolarAlerta?: (tenantId: string) => void } = {},
): Promise<EstadoAviso | null> {
  const tipo = evento.eventType ?? evento.notificationType;
  const nuevo: EstadoAviso | null =
    tipo === "Delivery" ? "entregado" : tipo === "Open" ? "abierto" : tipo === "Bounce" ? "rebotado" : tipo === "Complaint" ? "queja" : null;
  if (!nuevo) return null;

  const cabeceras = evento.mail?.headers ?? [];
  const avisoIdCabecera = cabeceras.find((h) => h.name.toLowerCase() === "x-khipu-aviso")?.value;
  const candidatos = [
    limpiarId(evento.mail?.commonHeaders?.messageId),
    limpiarId(cabeceras.find((h) => h.name.toLowerCase() === "message-id")?.value),
    limpiarId(evento.mail?.messageId),
  ].filter((x): x is string => !!x);
  const variantes = candidatos.flatMap((c) => [c, `<${c}>`]);

  const aviso = await db.aviso.findFirst({
    where: {
      OR: [
        ...(avisoIdCabecera && /^[0-9a-f-]{36}$/i.test(avisoIdCabecera) ? [{ id: avisoIdCabecera }] : []),
        ...(variantes.length ? [{ providerMessageId: { in: variantes } }] : []),
      ],
    },
  });
  if (!aviso) return null;
  if ((RANGO[aviso.estado] ?? 0) >= (RANGO[nuevo] ?? 0)) return aviso.estado;

  const ahora = new Date();
  await db.aviso.update({
    where: { id: aviso.id },
    data: {
      estado: nuevo,
      ...(nuevo === "entregado" ? { entregadoAt: ahora } : {}),
      ...(nuevo === "abierto" ? { abiertoAt: ahora, entregadoAt: aviso.entregadoAt ?? ahora } : {}),
    },
  });

  // Rebote permanente o queja: ese correo deja de recibir avisos.
  const permanente = nuevo === "queja" || (nuevo === "rebotado" && evento.bounce?.bounceType === "Permanent");
  if (permanente && aviso.apoderadoId) {
    await db.apoderadoAlumno.updateMany({
      where: { tenantId: aviso.tenantId, apoderadoId: aviso.apoderadoId },
      data: { recibeAvisos: false },
    });
    await auditar({
      tenantId: aviso.tenantId,
      actorId: null,
      accion: "editar",
      entidad: "apoderado_alumno",
      entidadId: aviso.apoderadoId,
      detalle: { motivo: nuevo === "queja" ? "queja de correo" : "rebote permanente", avisoId: aviso.id },
    });
    try {
      const encoladas = await alertarCorreoDesactivado(aviso.tenantId, aviso.apoderadoId, nuevo === "queja" ? "queja" : "rebote");
      if (encoladas > 0) opciones.alEncolarAlerta?.(aviso.tenantId);
    } catch (error) {
      console.error("[avisos] no se pudo encolar la alerta a dirección", error);
    }
  }
  return nuevo;
}
