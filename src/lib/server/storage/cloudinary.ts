import "server-only";
import { createReadStream } from "node:fs";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type { ArchivoSubido, FileStorage, OpcionesSubida, ReferenciaArchivo } from "./tipos";

// Cloudinary (piloto). La subida se firma en el servidor: el navegador nunca ve el API secret.
// Archivos de menores y adjuntos: type "authenticated" + URL firmada que vence (5 min).

function configurar() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Faltan las variables CLOUDINARY_* para STORAGE_PROVIDER=cloudinary");
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function tipoRecurso(mimeType: string): "image" | "raw" {
  return mimeType.startsWith("image/") ? "image" : "raw";
}

export class CloudinaryStorage implements FileStorage {
  readonly proveedor = "cloudinary" as const;

  constructor() {
    configurar();
  }

  async subir(buffer: Buffer, { tenantId, carpeta, privado, mimeType }: OpcionesSubida): Promise<ArchivoSubido> {
    const resultado = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `khipu/${tenantId}/${carpeta}`,
          type: privado ? "authenticated" : "upload",
          resource_type: tipoRecurso(mimeType),
        },
        (error, res) => (error || !res ? reject(error ?? new Error("Cloudinary no respondió")) : resolve(res)),
      );
      stream.end(buffer);
    });
    return { proveedor: "cloudinary", publicId: resultado.public_id, url: privado ? null : resultado.secure_url };
  }

  async subirDesdeRuta(ruta: string, { tenantId, carpeta, privado, mimeType }: OpcionesSubida): Promise<ArchivoSubido> {
    const resultado = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `khipu/${tenantId}/${carpeta}`,
          type: privado ? "authenticated" : "upload",
          resource_type: tipoRecurso(mimeType),
        },
        (error, res) => (error || !res ? reject(error ?? new Error("Cloudinary no respondió")) : resolve(res)),
      );
      const origen = createReadStream(ruta);
      origen.on("error", reject);
      origen.pipe(stream);
    });
    return { proveedor: "cloudinary", publicId: resultado.public_id, url: privado ? null : resultado.secure_url };
  }

  async urlTemporal(archivo: ReferenciaArchivo, segundos: number): Promise<string> {
    if (!archivo.privado && archivo.url) return archivo.url;
    const formato = archivo.mimeType.split("/")[1] === "jpeg" ? "jpg" : archivo.mimeType.split("/")[1];
    return cloudinary.utils.private_download_url(archivo.publicId, formato, {
      resource_type: tipoRecurso(archivo.mimeType),
      type: "authenticated",
      expires_at: Math.floor(Date.now() / 1000) + segundos,
    });
  }

  async borrar(archivo: ReferenciaArchivo): Promise<void> {
    await cloudinary.uploader.destroy(archivo.publicId, {
      resource_type: tipoRecurso(archivo.mimeType),
      type: archivo.privado ? "authenticated" : "upload",
      invalidate: true,
    });
  }
}
