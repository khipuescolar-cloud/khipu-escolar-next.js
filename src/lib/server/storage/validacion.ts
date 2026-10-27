// Validación de archivos por magic bytes (specs/14-archivos-cloudinary.md). Pura: no toca disco ni red.

export const MAX_BYTES_ARCHIVO = 5 * 1024 * 1024;

export type MimePermitido = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export const EXTENSION: Record<MimePermitido, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Detecta el tipo real por la firma del archivo; null si no es jpg, png, webp ni pdf. */
export function detectarMime(buffer: Uint8Array): MimePermitido | null {
  const empieza = (firma: number[], desde = 0) => firma.every((b, i) => buffer[desde + i] === b);
  if (buffer.length >= 3 && empieza([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (buffer.length >= 8 && empieza([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // RIFF....WEBP
  if (buffer.length >= 12 && empieza([0x52, 0x49, 0x46, 0x46]) && empieza([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (buffer.length >= 5 && empieza([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  return null;
}

export type ResultadoValidacion =
  | { ok: true; mimeType: MimePermitido }
  | { ok: false; error: "vacio" | "muy-grande" | "tipo-no-permitido" };

export function validarArchivo(buffer: Uint8Array): ResultadoValidacion {
  if (buffer.length === 0) return { ok: false, error: "vacio" };
  if (buffer.length > MAX_BYTES_ARCHIVO) return { ok: false, error: "muy-grande" };
  const mimeType = detectarMime(buffer);
  return mimeType ? { ok: true, mimeType } : { ok: false, error: "tipo-no-permitido" };
}

export const MENSAJE_VALIDACION: Record<Exclude<ResultadoValidacion, { ok: true }>["error"], string> = {
  vacio: "El archivo está vacío.",
  "muy-grande": "El archivo pesa más de 5 MB.",
  "tipo-no-permitido": "Solo se aceptan fotos (JPG, PNG, WEBP) o PDF.",
};
