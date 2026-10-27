import { describe, expect, it } from "vitest";
import { detectarMime, MAX_BYTES_ARCHIVO, validarArchivo } from "@/lib/server/storage/validacion";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

describe("validación de adjuntos por magic bytes", () => {
  it("reconoce jpg, png, webp y pdf por su firma", () => {
    expect(detectarMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectarMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(detectarMime(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
    expect(detectarMime(new TextEncoder().encode("%PDF-1.7\n..."))).toBe("application/pdf");
  });

  it("rechaza archivos disfrazados (la extensión no importa, solo el contenido)", () => {
    expect(detectarMime(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectarMime(bytes(0x4d, 0x5a))).toBeNull(); // ejecutable
    expect(validarArchivo(new TextEncoder().encode("GIF89a......"))).toEqual({ ok: false, error: "tipo-no-permitido" });
  });

  it("rechaza archivos vacíos o de más de 5 MB", () => {
    expect(validarArchivo(new Uint8Array())).toEqual({ ok: false, error: "vacio" });
    const grande = new Uint8Array(MAX_BYTES_ARCHIVO + 1);
    grande.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(validarArchivo(grande)).toEqual({ ok: false, error: "muy-grande" });
    expect(validarArchivo(grande.subarray(0, MAX_BYTES_ARCHIVO))).toEqual({ ok: true, mimeType: "application/pdf" });
  });
});
