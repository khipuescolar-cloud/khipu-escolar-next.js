import type { CategoriaArchivo } from "@/generated/prisma/enums";
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MIME_PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const MIME_ODT = "application/vnd.oasis.opendocument.text";
const MIMES_BASICOS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", MIME_DOCX, MIME_XLSX]);

const GB = BigInt(1024) * BigInt(1024) * BigInt(1024);
export function limitePorDefecto(alumnosActivos: number): bigint | null {
  if (alumnosActivos <= 100) return BigInt(20) * GB;
  if (alumnosActivos <= 300) return BigInt(60) * GB;
  if (alumnosActivos <= 600) return BigInt(120) * GB;
  if (alumnosActivos <= 1000) return BigInt(250) * GB;
  return null;
}
export function umbralDe(porcentaje: number): 0 | 70 | 85 | 95 {
  return porcentaje >= 95 ? 95 : porcentaje >= 85 ? 85 : porcentaje >= 70 ? 70 : 0;
}
export function umbralRearmado(anterior: number, porcentaje: number): number {
  return porcentaje < anterior - 5 ? umbralDe(porcentaje) : anterior;
}
export const CATEGORIAS_CRITICAS: ReadonlySet<CategoriaArchivo> = new Set(["entrega"]);
export function tiposDe(categoria: CategoriaArchivo): ReadonlySet<string> {
  if (["material_clase", "material_tarea", "entrega", "solicitud", "borrador"].includes(categoria)) {
    return new Set([...MIMES_BASICOS, MIME_PPTX, MIME_ODT]);
  }
  if (categoria === "foto" || categoria === "logo") return new Set(["image/jpeg", "image/png", "image/webp"]);
  if (categoria === "exportacion") return new Set(["application/zip"]);
  return new Set([...MIMES_BASICOS, MIME_DOCX, MIME_XLSX]);
}
export function segundosUrl(categoria: CategoriaArchivo): number {
  return ["entrega", "solicitud", "justificacion", "foto", "nudito"].includes(categoria) ? 60 : 300;
}
