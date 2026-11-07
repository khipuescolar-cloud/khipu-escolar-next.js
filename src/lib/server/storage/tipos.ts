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

export type SubidaPrefirmada = { publicId: string; url: string; metodo: "PUT"; headers: Record<string, string>; expiraAt: Date };

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
  /** Opcional: sube desde un archivo en disco sin cargarlo entero en memoria (ZIP de exportación). Si falta, se usa `subir`. */
  subirDesdeRuta?(ruta: string, opciones: OpcionesSubida): Promise<ArchivoSubido>;
  /** URL que vence en `segundos` (los privados) o la URL pública. */
  urlTemporal(archivo: ReferenciaArchivo, segundos: number): Promise<string>;
  borrar(archivo: ReferenciaArchivo): Promise<void>;
  prepararSubida?(opciones: OpcionesSubida & { bytes: number; extension: string }): Promise<SubidaPrefirmada>;
  inspeccionar?(publicId: string): Promise<{ bytes: number; contentType: string | null } | null>;
  leerRango?(publicId: string, desde: number, hasta: number): Promise<Buffer>;
}
