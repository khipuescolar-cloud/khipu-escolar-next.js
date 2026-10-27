import { beforeEach, describe, expect, it, vi } from "vitest";

const firmar = vi.hoisted(() => vi.fn(async (_c: unknown, comando: { input: unknown }, opciones: { expiresIn: number }) => `https://firmada.test/${(comando.input as { Key: string }).Key}?exp=${opciones.expiresIn}`));
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: firmar }));

import { configuracionS3DesdeEntorno, S3Storage, type ConfiguracionS3 } from "@/lib/server/storage/s3";

const config: ConfiguracionS3 = { bucket: "khipu-test", region: "sa-east-1", accessKeyId: "AK", secretAccessKey: "SK" };
const ref = (extra: object = {}) => ({ id: "1", tenantId: "t1", publicId: "khipu/t1/fotos/a.png", mimeType: "image/png", privado: true, url: null, ...extra });

describe("S3Storage", () => {
  const send = vi.fn(async (comando: unknown) => (comando ? {} : {}));
  beforeEach(() => {
    send.mockClear();
    firmar.mockClear();
  });

  it("sube un privado con clave por colegio y carpeta, sin URL pública", async () => {
    const r = await new S3Storage({ send }, config).subir(Buffer.from("x"), { tenantId: "t1", carpeta: "justificaciones", privado: true, mimeType: "image/png" });
    const entrada = (send.mock.calls[0][0] as { input: Record<string, unknown> }).input;
    expect(entrada).toMatchObject({ Bucket: "khipu-test", ContentType: "image/png" });
    expect(String(entrada.Key)).toMatch(/^khipu\/t1\/justificaciones\/[0-9a-f-]{36}\.png$/);
    expect(r).toEqual({ proveedor: "s3", publicId: entrada.Key, url: null });
  });

  it("sube un público y devuelve su URL (estándar del bucket, endpoint o base pública)", async () => {
    const op = { tenantId: "t1", carpeta: "logo", privado: false, mimeType: "image/webp" };
    expect((await new S3Storage({ send }, config).subir(Buffer.from("x"), op)).url).toMatch(/^https:\/\/khipu-test\.s3\.sa-east-1\.amazonaws\.com\/khipu\/t1\/logo\/[0-9a-f-]+\.webp$/);
    expect((await new S3Storage({ send }, { ...config, endpoint: "http://minio:9000/" }).subir(Buffer.from("x"), op)).url).toMatch(/^http:\/\/minio:9000\/khipu-test\/khipu\/t1\/logo\//);
    expect((await new S3Storage({ send }, { ...config, publicBaseUrl: "https://cdn.test/" }).subir(Buffer.from("x"), op)).url).toMatch(/^https:\/\/cdn\.test\/khipu\/t1\/logo\//);
  });

  it("entrega los privados con URL firmada que vence y los públicos con su URL", async () => {
    const s3 = new S3Storage({ send }, config);
    expect(await s3.urlTemporal(ref(), 300)).toBe("https://firmada.test/khipu/t1/fotos/a.png?exp=300");
    expect(firmar).toHaveBeenCalledTimes(1);
    expect(await s3.urlTemporal(ref({ privado: false, url: "https://cdn.test/logo.png" }), 300)).toBe("https://cdn.test/logo.png");
    expect(firmar).toHaveBeenCalledTimes(1);
  });

  it("borra el objeto del bucket", async () => {
    await new S3Storage({ send }, config).borrar(ref());
    expect((send.mock.calls[0][0] as { input: unknown }).input).toEqual({ Bucket: "khipu-test", Key: "khipu/t1/fotos/a.png" });
  });

  it("exige las variables S3_* y lee las opcionales", () => {
    expect(() => configuracionS3DesdeEntorno({} as NodeJS.ProcessEnv)).toThrow(/S3_BUCKET/);
    const c = configuracionS3DesdeEntorno({ S3_BUCKET: "b", S3_REGION: "r", S3_ACCESS_KEY_ID: "a", S3_SECRET_ACCESS_KEY: "s", S3_ENDPOINT: "", S3_PUBLIC_BASE_URL: "https://c" } as unknown as NodeJS.ProcessEnv);
    expect(c).toMatchObject({ bucket: "b", endpoint: undefined, publicBaseUrl: "https://c" });
  });
});
