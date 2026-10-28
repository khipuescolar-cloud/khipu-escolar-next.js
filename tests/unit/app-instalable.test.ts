import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { DIAS_SIN_TARJETA, detectarPlataforma, esIOS, tarjetaVisible } from "@/lib/app-instalable";
import { declaracionesAssetLinks } from "@/lib/app-tiendas";

const UA = {
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ipadModerno: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
};

describe("detectarPlataforma (instalación guiada)", () => {
  it("no ofrece nada si ya se abre como app (Android o iOS)", () => {
    expect(detectarPlataforma({ userAgent: UA.android, modoApp: true, avisoNativo: true })).toBe("instalada");
    expect(detectarPlataforma({ userAgent: UA.iphone, standaloneIOS: true })).toBe("instalada");
  });
  it("usa el aviso nativo cuando el navegador lo ofrece (Android, Windows)", () => {
    expect(detectarPlataforma({ userAgent: UA.android, avisoNativo: true })).toBe("nativa");
    expect(detectarPlataforma({ userAgent: UA.windows, avisoNativo: true })).toBe("nativa");
  });
  it("en iPhone y iPad muestra los pasos de Safari", () => {
    expect(detectarPlataforma({ userAgent: UA.iphone })).toBe("ios");
    expect(detectarPlataforma({ userAgent: UA.ipadModerno, maxTouchPoints: 5 })).toBe("ios");
  });
  it("una Mac sin pantalla táctil es escritorio; Android sin aviso usa el menú", () => {
    expect(esIOS({ userAgent: UA.ipadModerno, maxTouchPoints: 0 })).toBe(false);
    expect(detectarPlataforma({ userAgent: UA.ipadModerno })).toBe("escritorio");
    expect(detectarPlataforma({ userAgent: UA.android })).toBe("android");
    expect(detectarPlataforma({ userAgent: UA.windows })).toBe("escritorio");
  });
});

describe("tarjeta del inicio", () => {
  const dia = 24 * 60 * 60 * 1000;
  it("sale si nunca se cerró y vuelve tras 30 días", () => {
    const ahora = Date.UTC(2026, 9, 28);
    expect(tarjetaVisible(null, ahora)).toBe(true);
    expect(tarjetaVisible(Number.NaN, ahora)).toBe(true);
    expect(tarjetaVisible(ahora - 5 * dia, ahora)).toBe(false);
    expect(tarjetaVisible(ahora - DIAS_SIN_TARJETA * dia, ahora)).toBe(true);
  });
});

describe("manifest.ts", () => {
  const m = manifest();
  it("identidad, colores y modo app", () => {
    expect(m).toMatchObject({
      name: "Khipu Escolar", short_name: "Khipu", id: "/?origen=app", start_url: "/?origen=app", scope: "/",
      display: "standalone", theme_color: "#1E2A78", background_color: "#FAF7F2", lang: "es-PE",
    });
    expect(m.display_override).toEqual(["window-controls-overlay", "standalone"]);
    expect(m.categories).toEqual(["education", "productivity"]);
  });
  it("íconos 192 y 512 en versión normal y maskable, con rutas relativas al origen", () => {
    for (const purpose of ["any", "maskable"] as const) {
      for (const sizes of ["192x192", "512x512"]) {
        expect(m.icons?.some((i) => i.purpose === purpose && i.sizes === sizes)).toBe(true);
      }
    }
    expect(m.icons?.every((i) => i.src.startsWith("/"))).toBe(true);
  });
  it("atajos con ícono de 96 px y capturas angosta y ancha", () => {
    expect(m.shortcuts?.map((s) => s.name)).toEqual(["Pasar lista", "Mensajes", "Comunicados", "Inicio"]);
    expect(m.shortcuts?.every((s) => s.icons?.[0]?.sizes === "96x96")).toBe(true);
    expect(m.screenshots?.some((s) => s.form_factor === "narrow" && s.sizes === "390x844")).toBe(true);
    expect(m.screenshots?.some((s) => s.form_factor === "wide" && s.sizes === "1366x768")).toBe(true);
  });
});

describe("assetlinks.json (Google Play / TWA)", () => {
  const huella = Array.from({ length: 32 }, () => "AB").join(":");
  it("vacío sin variables o con datos inválidos", () => {
    expect(declaracionesAssetLinks(undefined, undefined)).toEqual([]);
    expect(declaracionesAssetLinks("pe.khipuescolar.app", "")).toEqual([]);
    expect(declaracionesAssetLinks("sin-punto", huella)).toEqual([]);
    expect(declaracionesAssetLinks("pe.khipuescolar.app", "no-es-huella")).toEqual([]);
  });
  it("declara el paquete con una o varias huellas", () => {
    const [d] = declaracionesAssetLinks("pe.khipuescolar.app", ` ${huella.toLowerCase()} , ${huella}`);
    expect(d.relation).toEqual(["delegate_permission/common.handle_all_urls"]);
    expect(d.target).toEqual({ namespace: "android_app", package_name: "pe.khipuescolar.app", sha256_cert_fingerprints: [huella, huella] });
  });
});
