import "server-only";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ArchivoSubido, FileStorage, OpcionesSubida, ReferenciaArchivo } from "./tipos";

// Amazon S3 (o compatible: MinIO, R2…). Los privados se entregan con URL firmada que vence; los públicos (logo)
// con una URL pública fija: `S3_PUBLIC_BASE_URL` (CDN o dominio del bucket) o, si falta, la URL estándar del bucket.
// El bucket debe permitir lectura pública solo bajo el prefijo de los archivos públicos que uses (se decide en la política del bucket).

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/zip": "zip",
};

export type ConfiguracionS3 = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  publicBaseUrl?: string;
};

export function configuracionS3DesdeEntorno(env: NodeJS.ProcessEnv = process.env): ConfiguracionS3 {
  const { S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_PUBLIC_BASE_URL } = env;
  if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("Faltan las variables S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID o S3_SECRET_ACCESS_KEY para STORAGE_PROVIDER=s3");
  }
  return {
    bucket: S3_BUCKET,
    region: S3_REGION,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    endpoint: S3_ENDPOINT || undefined,
    publicBaseUrl: S3_PUBLIC_BASE_URL || undefined,
  };
}

export class S3Storage implements FileStorage {
  readonly proveedor = "s3" as const;
  private readonly config: ConfiguracionS3;
  private readonly cliente: S3Client;

  /** `cliente` y `config` se inyectan solo en los tests. */
  constructor(cliente?: Pick<S3Client, "send">, config: ConfiguracionS3 = configuracionS3DesdeEntorno()) {
    this.config = config;
    this.cliente =
      (cliente as S3Client | undefined) ??
      new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: !!config.endpoint, // MinIO y similares usan bucket en la ruta
        credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      });
  }

  async subir(buffer: Buffer, { tenantId, carpeta, privado, mimeType }: OpcionesSubida): Promise<ArchivoSubido> {
    const clave = `khipu/${tenantId}/${carpeta}/${randomUUID()}.${EXTENSION[mimeType] ?? "bin"}`;
    await this.cliente.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: clave, Body: buffer, ContentType: mimeType }));
    return { proveedor: "s3", publicId: clave, url: privado ? null : this.urlPublica(clave) };
  }

  async subirDesdeRuta(ruta: string, { tenantId, carpeta, privado, mimeType }: OpcionesSubida): Promise<ArchivoSubido> {
    const clave = `khipu/${tenantId}/${carpeta}/${randomUUID()}.${EXTENSION[mimeType] ?? "bin"}`;
    const { size } = await stat(ruta);
    const flujo = createReadStream(ruta);
    try {
      await this.cliente.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: clave, Body: flujo, ContentLength: size, ContentType: mimeType }));
    } finally {
      flujo.destroy();
    }
    return { proveedor: "s3", publicId: clave, url: privado ? null : this.urlPublica(clave) };
  }

  async urlTemporal(archivo: ReferenciaArchivo, segundos: number): Promise<string> {
    if (!archivo.privado) return archivo.url ?? this.urlPublica(archivo.publicId);
    return getSignedUrl(this.cliente, new GetObjectCommand({ Bucket: this.config.bucket, Key: archivo.publicId }), { expiresIn: segundos });
  }

  async borrar(archivo: ReferenciaArchivo): Promise<void> {
    await this.cliente.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: archivo.publicId }));
  }

  private urlPublica(clave: string): string {
    const { publicBaseUrl, endpoint, bucket, region } = this.config;
    const ruta = clave.split("/").map(encodeURIComponent).join("/");
    if (publicBaseUrl) return `${publicBaseUrl.replace(/\/+$/, "")}/${ruta}`;
    if (endpoint) return `${endpoint.replace(/\/+$/, "")}/${bucket}/${ruta}`;
    return `https://${bucket}.s3.${region}.amazonaws.com/${ruta}`;
  }
}
