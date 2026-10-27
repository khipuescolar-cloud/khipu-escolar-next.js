import sharp from "sharp";

// El generador de PDF (@react-pdf/renderer) solo admite PNG y JPG. Convertimos WEBP, SVG y otros a PNG con sharp.

const MAX_LADO = 256;
const MAX_CACHE = 50;
const cache = new Map<string, Buffer>();

/** PNG (máx. 256 px por lado, sin ampliar) a partir de cualquier imagen que sharp lea. Con `clave` se guarda en memoria. */
export async function convertirAPng(entrada: Buffer, clave?: string): Promise<Buffer> {
  if (clave) {
    const guardado = cache.get(clave);
    if (guardado) return guardado;
  }
  const png = await sharp(entrada, { density: 192, limitInputPixels: 25_000_000 })
    .resize({ width: MAX_LADO, height: MAX_LADO, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  if (clave) {
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
    cache.set(clave, png);
  }
  return png;
}

export function vaciarCachePng(): void {
  cache.clear();
}
