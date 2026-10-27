import type { ProveedorArchivo } from "@/generated/prisma/enums";

export type OpcionesSubida = {
  tenantId: string;
  /** Subcarpeta lógica: "justificaciones", "fotos", "logo"… */
  carpeta: string;
  privado: boolean;
  mimeType: string;
};

export type ArchivoSubido = {
  proveedor: ProveedorArchivo;
  publicId: string;
  /** Solo para archivos públicos. */
  url: string | null;
};

/** Lo mínimo de la fila `archivos` que necesita un proveedor. */
export type ReferenciaArchivo = {
  id: string;
  tenantId: string;
  publicId: string;
  mimeType: string;
  privado: boolean;
  url: string | null;
};

/** Interfaz común de almacenamiento (local hoy, Cloudinary en el piloto, S3 después). */
export interface FileStorage {
  readonly proveedor: ProveedorArchivo;
  subir(buffer: Buffer, opciones: OpcionesSubida): Promise<ArchivoSubido>;
  /** URL que vence en `segundos` (los privados) o la URL pública. */
  urlTemporal(archivo: ReferenciaArchivo, segundos: number): Promise<string>;
  borrar(archivo: ReferenciaArchivo): Promise<void>;
}
