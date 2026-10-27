import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { EstadoAviso } from "@/generated/prisma/enums";
import { db } from "../db";

// Webhook de estado de WhatsApp Cloud API (specs/06). Meta firma el cuerpo crudo con HMAC SHA-256 usando el
// «App Secret» y lo manda en `X-Hub-Signature-256: sha256=<hex>`.

function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  // Se compara el HMAC de ambos para que el tiempo no dependa de dónde difieren ni de sus largos.
  const clave = "khipu-comparacion";
  return timingSafeEqual(createHmac("sha256", clave).update(x).digest(), createHmac("sha256", clave).update(y).digest()) && x.length === y.length;
}

/** Verifica `X-Hub-Signature-256` contra el cuerpo crudo. Sin secreto o sin cabecera: false. */
export function firmaWhatsappValida(cuerpoCrudo: string, cabecera: string | null | undefined, secreto: string | undefined): boolean {
  if (!secreto || !cabecera) return false;
  const m = /^sha256=([0-9a-fA-F]{64})$/.exec(cabecera.trim());
  if (!m) return false;
  const esperado = createHmac("sha256", secreto).update(cuerpoCrudo, "utf8").digest("hex");
  return iguales(esperado, m[1].toLowerCase());
}

/** GET de verificación: devuelve el `hub.challenge` si el token coincide, o null. */
export function verificarSuscripcionWhatsapp(params: URLSearchParams, tokenEsperado: string | undefined): string | null {
  if (!tokenEsperado) return null;
  if (params.get("hub.mode") !== "subscribe") return null;
  const token = params.get("hub.verify_token");
  if (!token || !iguales(token, tokenEsperado)) return null;
  return params.get("hub.challenge");
}

export type EstadoWhatsapp = { messageId: string; estado: "sent" | "delivered" | "read" | "failed"; momento: Date; error?: string };

/** Extrae los estados de un POST de Meta (ignora mensajes entrantes y formas desconocidas). */
export function extraerEstadosWhatsapp(cuerpo: unknown): EstadoWhatsapp[] {
  const salida: EstadoWhatsapp[] = [];
  const entradas = (cuerpo as { entry?: unknown })?.entry;
  if (!Array.isArray(entradas)) return salida;
  for (const entrada of entradas) {
    const cambios = (entrada as { changes?: unknown })?.changes;
    if (!Array.isArray(cambios)) continue;
    for (const cambio of cambios) {
      const estados = (cambio as { value?: { statuses?: unknown } })?.value?.statuses;
      if (!Array.isArray(estados)) continue;
      for (const e of estados as Record<string, unknown>[]) {
        if (typeof e.id !== "string" || !["sent", "delivered", "read", "failed"].includes(String(e.status))) continue;
        const segundos = Number(e.timestamp);
        const errores = Array.isArray(e.errors) ? (e.errors as { code?: number; title?: string; message?: string }[]) : [];
        salida.push({
          messageId: e.id,
          estado: e.status as EstadoWhatsapp["estado"],
          momento: Number.isFinite(segundos) && segundos > 0 ? new Date(segundos * 1000) : new Date(),
          error: errores[0] ? `WhatsApp: ${errores[0].title ?? errores[0].message ?? "falló"}${errores[0].code ? ` (código ${errores[0].code})` : ""}`.slice(0, 500) : undefined,
        });
      }
    }
  }
  return salida;
}

/** Orden de avance: un estado nunca retrocede (p. ej. «leído» antes que «entregado»). */
const ANTES_DE: Record<"entregado" | "abierto" | "error", EstadoAviso[]> = {
  entregado: ["enviando", "enviado"],
  abierto: ["enviando", "enviado", "entregado"],
  error: ["enviando", "enviado", "entregado"],
};

/** Aplica los estados al aviso con ese `providerMessageId`. Devuelve cuántos avisos cambiaron. */
export async function aplicarEstadosWhatsapp(estados: EstadoWhatsapp[]): Promise<number> {
  let cambiados = 0;
  for (const e of estados) {
    if (e.estado === "sent") continue; // ya quedó «enviado» cuando respondió la API
    if (e.estado === "delivered") {
      cambiados += (await db.aviso.updateMany({ where: { providerMessageId: e.messageId, canal: "whatsapp", estado: { in: ANTES_DE.entregado } }, data: { estado: "entregado", entregadoAt: e.momento } })).count;
    } else if (e.estado === "read") {
      const r = await db.aviso.updateMany({ where: { providerMessageId: e.messageId, canal: "whatsapp", estado: { in: ANTES_DE.abierto } }, data: { estado: "abierto", abiertoAt: e.momento } });
      if (r.count > 0) await db.aviso.updateMany({ where: { providerMessageId: e.messageId, entregadoAt: null }, data: { entregadoAt: e.momento } });
      cambiados += r.count;
    } else {
      cambiados += (await db.aviso.updateMany({ where: { providerMessageId: e.messageId, canal: "whatsapp", estado: { in: ANTES_DE.error } }, data: { estado: "error", error: e.error ?? "WhatsApp no pudo entregar el mensaje" } })).count;
    }
  }
  return cambiados;
}
