import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("cabeceras de seguridad (next.config.ts)", () => {
  it("se aplican a todas las rutas con anti-clickjacking, nosniff, referrer y cámara solo del mismo origen", async () => {
    const reglas = await nextConfig.headers!();
    const todas = reglas.find((r) => r.source === "/:path*");
    const valor = (k: string) => todas?.headers.find((h) => h.key === k)?.value;
    expect(valor("X-Frame-Options")).toBe("DENY");
    expect(valor("Content-Security-Policy")).toBe("frame-ancestors 'none'");
    expect(valor("X-Content-Type-Options")).toBe("nosniff");
    expect(valor("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(valor("Strict-Transport-Security")).toMatch(/^max-age=\d+/);
    expect(valor("Permissions-Policy")).toContain("camera=(self)");
  });
});
