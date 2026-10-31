// Transporte de correo (specs/06): pool SMTP con SES/Gmail, conexión simple con Mailpit local.
import { describe, expect, it } from "vitest";
import { cerrarTransporteCorreo, opcionesTransporte } from "@/lib/server/notificaciones/email";

describe("opcionesTransporte", () => {
  it("Mailpit local (sin usuario): sin pool, como siempre", () => {
    const o = opcionesTransporte({ SMTP_HOST: "127.0.0.1", SMTP_PORT: "54325", SMTP_SECURE: "false", SMTP_USER: "" });
    expect(o).toEqual({ host: "127.0.0.1", port: 54325, secure: false, auth: undefined });
  });

  it("SES o Gmail (con usuario): pool con 3 conexiones y 100 mensajes por conexión", () => {
    const o = opcionesTransporte({ SMTP_HOST: "email-smtp.us-east-1.amazonaws.com", SMTP_PORT: "465", SMTP_SECURE: "true", SMTP_USER: "u", SMTP_PASS: "p" });
    expect(o).toMatchObject({ secure: true, auth: { user: "u", pass: "p" }, pool: true, maxConnections: 3, maxMessages: 100 });
  });

  it("SMTP_POOL y los máximos se pueden forzar; valores inválidos usan los de por defecto", () => {
    expect(opcionesTransporte({ SMTP_USER: "u", SMTP_POOL: "false" })).not.toHaveProperty("pool");
    expect(opcionesTransporte({ SMTP_POOL: "true", SMTP_MAX_CONNECTIONS: "5", SMTP_MAX_MESSAGES: "x" })).toMatchObject({ pool: true, maxConnections: 5, maxMessages: 100 });
  });

  it("cerrar sin transporte creado no falla", () => {
    expect(() => cerrarTransporteCorreo()).not.toThrow();
  });
});
