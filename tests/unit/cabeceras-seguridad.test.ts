import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("cabeceras de seguridad (next.config.ts)", () => {
  it("se aplican a todas las rutas con anti-clickjacking, nosniff, referrer y cámara solo del mismo origen", async () => {
    const reglas = await nextConfig.headers!();
    const todas = reglas.find((r) => r.source === "/((?!archivos/).*)");
    const valor = (k: string) => todas?.headers.find((h) => h.key === k)?.value;
    expect(valor("X-Frame-Options")).toBe("DENY");
    expect(valor("Content-Security-Policy")).toBe("frame-ancestors 'none'");
    expect(valor("X-Content-Type-Options")).toBe("nosniff");
    expect(valor("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(valor("Strict-Transport-Security")).toMatch(/^max-age=\d+/);
    expect(valor("Permissions-Policy")).toContain("camera=(self)");
  });

  it("solo la vista previa de archivos (`/archivos/<id>?vista=1`) se puede incrustar, y únicamente desde el mismo origen", async () => {
    const reglas = await nextConfig.headers!();
    const previa = reglas.find((r) => r.source === "/archivos/:id" && r.has?.some((h) => h.key === "vista" && h.value === "1"));
    const descarga = reglas.find((r) => r.source === "/archivos/:id" && r.missing?.length);
    const valor = (r: typeof previa, k: string) => r?.headers.find((h) => h.key === k)?.value;
    expect(valor(previa, "X-Frame-Options")).toBe("SAMEORIGIN");
    expect(valor(previa, "Content-Security-Policy")).toBe("frame-ancestors 'self'");
    expect(valor(previa, "X-Content-Type-Options")).toBe("nosniff");
    expect(valor(descarga, "X-Frame-Options")).toBe("DENY");
    expect(valor(descarga, "Content-Security-Policy")).toBe("frame-ancestors 'none'");
    // Ninguna otra ruta queda sin la regla estricta.
    expect(reglas.filter((r) => r.headers.some((h) => h.value === "SAMEORIGIN"))).toHaveLength(1);
  });
});
