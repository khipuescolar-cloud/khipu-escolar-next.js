// Constantes y ayudas de adjuntos que comparten servidor y cliente (specs/14).

export const MAX_BYTES_ADJUNTO = 10 * 1024 * 1024;
export const MAX_ADJUNTOS = 5;
export const TIPOS_ADJUNTO_TEXTO = "PDF, JPG, PNG, WEBP, DOCX o XLSX";
/** Para `accept` del input de archivos. */
export const ACCEPT_ADJUNTOS = ".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx";

export type AdjuntoVista = { id: string; nombre: string; mimeType: string; bytes: number };

export function formatoTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export type CategoriaAdjunto = "pdf" | "imagen" | "documento" | "hoja";

export function categoriaMime(mime: string, nombre = ""): CategoriaAdjunto {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "imagen";
  if (mime.includes("spreadsheetml") || /\.xlsx$/i.test(nombre)) return "hoja";
  return "documento";
}
