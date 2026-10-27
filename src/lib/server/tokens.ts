import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// Tokens de enlaces (justificar falta) y carnets QR (specs/05 y 07).
// En la BD solo se guarda el hash SHA-256 del token, nunca el token.

/** Token aleatorio de 32 bytes en base64url. */
export function generarToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Hash SHA-256 (hex) que se guarda en la BD. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Token derivado con HMAC-SHA256(APP_SECRET, "<proposito>:<id>"): 32 bytes en base64url.
 * Sirve para volver a mostrar un token sin guardarlo (reimprimir un carnet, armar el enlace del correo
 * en el worker). La fila guarda solo hashToken(token); si APP_SECRET cambia, los tokens viejos dejan de servir.
 */
export function tokenDerivado(proposito: "carnet" | "justificar", id: string, secreto = env.appSecret): string {
  return createHmac("sha256", secreto).update(`${proposito}:${id}`, "utf8").digest("base64url");
}

/** HMAC corto para firmar URLs temporales (archivos locales). */
export function firmar(valor: string, secreto = env.appSecret): string {
  return createHmac("sha256", secreto).update(valor, "utf8").digest("base64url");
}

export function firmaValida(valor: string, firma: string, secreto = env.appSecret): boolean {
  const esperada = Buffer.from(firmar(valor, secreto));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

/** Formato de token aceptado (evita consultas con basura). */
export function formatoTokenValido(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
