import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { textoAFirmar, urlDeAwsValida, verificarFirmaSns, type MensajeSns } from "@/lib/server/notificaciones/ses";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
const CERT_URL = "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc.pem";

function firmado(m: Omit<MensajeSns, "Signature">, algoritmo = "RSA-SHA256"): MensajeSns {
  const Signature = createSign(algoritmo).update(textoAFirmar({ ...m, Signature: "" })).sign(privateKey, "base64");
  return { ...m, Signature };
}

const base = {
  Type: "Notification",
  MessageId: "m-1",
  TopicArn: "arn:aws:sns:us-east-1:123:ses-eventos",
  Message: JSON.stringify({ eventType: "Delivery" }),
  Timestamp: "2026-10-26T12:00:00.000Z",
  SignatureVersion: "2",
  SigningCertURL: CERT_URL,
};

describe("webhook SES: firma SNS", () => {
  it("solo acepta certificados de sns.<región>.amazonaws.com por https", () => {
    expect(urlDeAwsValida(CERT_URL)).toBe(true);
    expect(urlDeAwsValida("http://sns.us-east-1.amazonaws.com/x.pem")).toBe(false);
    expect(urlDeAwsValida("https://sns.us-east-1.amazonaws.com.evil.com/x.pem")).toBe(false);
    expect(urlDeAwsValida("https://evil.com/sns.us-east-1.amazonaws.com/x.pem")).toBe(false);
    expect(urlDeAwsValida("https://s3.amazonaws.com/x.pem")).toBe(false);
  });

  it("acepta un mensaje firmado (v1 SHA1 y v2 SHA256)", async () => {
    const obtener = async () => pem;
    expect(await verificarFirmaSns(firmado(base), obtener)).toBe(true);
    expect(await verificarFirmaSns(firmado({ ...base, SignatureVersion: "1" }, "RSA-SHA1"), obtener)).toBe(true);
  });

  it("rechaza mensajes alterados o con certificado fuera de AWS", async () => {
    const obtener = async () => pem;
    const m = firmado(base);
    expect(await verificarFirmaSns({ ...m, Message: JSON.stringify({ eventType: "Open" }) }, obtener)).toBe(false);
    expect(await verificarFirmaSns({ ...m, SigningCertURL: "https://evil.com/c.pem" }, obtener)).toBe(false);
    expect(await verificarFirmaSns({ ...m, SignatureVersion: "3" }, obtener)).toBe(false);
  });

  it("firma la confirmación de suscripción con SubscribeURL y Token", () => {
    const texto = textoAFirmar({ ...base, Type: "SubscriptionConfirmation", Signature: "", Token: "t", SubscribeURL: "https://sns.us-east-1.amazonaws.com/?Action=Confirm" });
    expect(texto).toContain("SubscribeURL\nhttps://sns.us-east-1.amazonaws.com/?Action=Confirm\n");
    expect(texto).toContain("Token\nt\n");
  });
});
