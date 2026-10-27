import { describe, expect, it } from "vitest";
import { enmascararTelefono, formatearTelefono, normalizarTelefonoPeru } from "@/lib/telefono";

describe("normalizarTelefonoPeru", () => {
  it.each([
    ["987654321", "+51987654321"],
    ["987 654 321", "+51987654321"],
    ["+51 987-654-321", "+51987654321"],
    ["51987654321", "+51987654321"],
    ["0051987654321", "+51987654321"],
    ["(+51) 987654321", "+51987654321"],
  ])("acepta %s", (entrada, esperado) => expect(normalizarTelefonoPeru(entrada)).toBe(esperado));

  it.each(["", "  ", "12345", "887654321", "01 234 5678", "+34 612 345 678", "9876543210", "98765432a", "+5198765432"])("rechaza «%s»", (entrada) =>
    expect(normalizarTelefonoPeru(entrada)).toBeNull(),
  );

  it("rechaza null y undefined", () => {
    expect(normalizarTelefonoPeru(null)).toBeNull();
    expect(normalizarTelefonoPeru(undefined)).toBeNull();
  });

  it("enmascara y formatea", () => {
    expect(enmascararTelefono("+51987654321")).toBe("+51 *** *** 321");
    expect(enmascararTelefono("raro")).toBe("***");
    expect(formatearTelefono("+51987654321")).toBe("+51 987 654 321");
  });
});
