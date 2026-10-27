import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { convertirAPng, vaciarCachePng } from "@/lib/imagen-png";

const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const esPng = (b: Buffer) => b.subarray(0, 8).equals(FIRMA_PNG);

describe("conversión del logo a PNG para el PDF", () => {
  beforeEach(() => vaciarCachePng());

  it("convierte WEBP a PNG", async () => {
    const webp = await sharp({ create: { width: 64, height: 32, channels: 3, background: "#2255aa" } }).webp().toBuffer();
    const png = await convertirAPng(webp);
    expect(esPng(png)).toBe(true);
    expect((await sharp(png).metadata()).width).toBe(64);
  });

  it("convierte SVG a PNG y limita el tamaño a 256 px", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500"><rect width="1000" height="500" fill="#c00"/></svg>');
    const png = await convertirAPng(svg);
    expect(esPng(png)).toBe(true);
    const m = await sharp(png).metadata();
    expect(m.width).toBe(256);
    expect(m.height).toBe(128);
  });

  it("guarda en caché por clave y devuelve el mismo buffer", async () => {
    const webp = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } }).webp().toBuffer();
    const a = await convertirAPng(webp, "logo-1");
    const b = await convertirAPng(Buffer.from("no es una imagen"), "logo-1");
    expect(b).toBe(a);
  });

  it("falla con datos que no son imagen", async () => {
    await expect(convertirAPng(Buffer.from("hola"))).rejects.toThrow();
  });
});
