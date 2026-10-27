import { describe, expect, it } from "vitest";
import { estadoDeLlegada, tokenDesdeQr } from "@/lib/server/porteria";

const TOKEN = "A".repeat(20) + "b_-" + "9".repeat(20);

describe("lectura del QR en portería", () => {
  it("extrae el token de la URL del carnet o acepta el token solo", () => {
    expect(tokenDesdeQr(`http://lvh.me:3001/q/${TOKEN}`)).toBe(TOKEN);
    expect(tokenDesdeQr(`https://khipuescolar.pe/q/${TOKEN}?x=1`)).toBe(TOKEN);
    expect(tokenDesdeQr(` ${TOKEN} `)).toBe(TOKEN);
  });

  it("rechaza textos que no son carnets", () => {
    expect(tokenDesdeQr("https://otra-pagina.com")).toBeNull();
    expect(tokenDesdeQr("hola")).toBeNull();
    expect(tokenDesdeQr(`http://x/q/${TOKEN}extra`)).toBeNull();
  });

  it("marca tarde desde la hora límite del colegio", () => {
    expect(estadoDeLlegada("07:59", "08:00")).toBe("llego");
    expect(estadoDeLlegada("08:00", "08:00")).toBe("tarde");
    expect(estadoDeLlegada("07:40", "07:30")).toBe("tarde");
  });
});
