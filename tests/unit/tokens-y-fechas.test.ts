import { describe, expect, it } from "vitest";
import { fechaCorta, hora12, momentoEnZona, restarDias } from "@/lib/fechas";
import { firmar, firmaValida, formatoTokenValido, generarToken, hashToken, tokenDerivado } from "@/lib/server/tokens";

const SECRETO = "secreto-de-prueba-con-32-caracteres!!";

describe("tokens de justificar y carnet", () => {
  it("genera tokens aleatorios de 32 bytes en base64url", () => {
    const a = generarToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(formatoTokenValido(a)).toBe(true);
    expect(generarToken()).not.toBe(a);
  });

  it("guarda solo el hash SHA-256: determinista y distinto del token", () => {
    const t = generarToken();
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toContain(t);
  });

  it("el token derivado depende del propósito, el id y el secreto", () => {
    const id = "6f1c1d3e-0000-4000-8000-000000000001";
    const carnet = tokenDerivado("carnet", id, SECRETO);
    expect(formatoTokenValido(carnet)).toBe(true);
    expect(tokenDerivado("carnet", id, SECRETO)).toBe(carnet);
    expect(tokenDerivado("justificar", id, SECRETO)).not.toBe(carnet);
    expect(tokenDerivado("carnet", id, `${SECRETO}x`)).not.toBe(carnet);
  });

  it("verifica firmas de URL y rechaza las alteradas", () => {
    const f = firmar("archivo:1:99", SECRETO);
    expect(firmaValida("archivo:1:99", f, SECRETO)).toBe(true);
    expect(firmaValida("archivo:1:100", f, SECRETO)).toBe(false);
    expect(firmaValida("archivo:1:99", "corta", SECRETO)).toBe(false);
  });

  it("rechaza tokens con formato inválido", () => {
    expect(formatoTokenValido("")).toBe(false);
    expect(formatoTokenValido("a".repeat(42))).toBe(false);
    expect(formatoTokenValido(`${"a".repeat(42)}/`)).toBe(false);
  });
});

describe("fechas y horas del colegio", () => {
  it("usa la hora de Lima (UTC−5)", () => {
    expect(momentoEnZona(new Date("2026-10-26T12:52:00Z"), "America/Lima")).toEqual({ isoFecha: "2026-10-26", hora: "07:52" });
    expect(momentoEnZona(new Date("2026-10-27T03:30:00Z"), "America/Lima")).toEqual({ isoFecha: "2026-10-26", hora: "22:30" });
  });

  it("formatea la hora como en los avisos", () => {
    expect(hora12("07:52")).toBe("7:52 a. m.");
    expect(hora12("12:00")).toBe("12:00 p. m.");
    expect(hora12("00:05")).toBe("12:05 a. m.");
    expect(hora12("13:05")).toBe("1:05 p. m.");
  });

  it("resta días y formatea fechas cortas", () => {
    expect(restarDias("2026-03-01", 1)).toBe("2026-02-28");
    expect(fechaCorta("2026-10-26")).toBe("26/10/2026");
  });
});
