import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { limiteCanalDePago } from "@/lib/server/notificaciones/limites";
import { SmsChannel, SMS_MAX_CARACTERES, smsConfigurado, textoSms } from "@/lib/server/notificaciones/sms";
import { WhatsAppChannel, armarSolicitudWhatsapp, limpiarParametro, plantillaMeta, whatsappConfigurado } from "@/lib/server/notificaciones/whatsapp";
import { extraerEstadosWhatsapp, firmaWhatsappValida, verificarSuscripcionWhatsapp } from "@/lib/server/notificaciones/whatsapp-webhook";
import { EnvioPermanenteError } from "@/lib/server/notificaciones/tipos";

const ENTORNO_WA = { WHATSAPP_TOKEN: "tok-prueba", WHATSAPP_PHONE_NUMBER_ID: "1234567890", WHATSAPP_API_VERSION: "v21.0" };
const ENTORNO_SMS = { SMS_PROVEEDOR: "twilio", TWILIO_ACCOUNT_SID: "ACprueba", TWILIO_AUTH_TOKEN: "secreto", TWILIO_FROM: "+15005550006" };
const respuesta = (cuerpo: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(cuerpo), { status }));
const mensaje = { asunto: "x", html: "", texto: "", push: { titulo: "", cuerpo: "" } };

describe("plantillas de WhatsApp", () => {
  it("mapea nuestras plantillas a las de Meta con sus parámetros", () => {
    expect(plantillaMeta("asistencia_llego", { colegio: "San Martín", alumno: "Mateo", hora: "08:05" })).toEqual({ nombre: "khipu_asistencia_llego", parametros: ["Mateo", "8:05 a. m.", "San Martín"] });
    expect(plantillaMeta("asistencia_tarde", { colegio: "C", alumno: "Mateo", hora: "13:10" })?.parametros).toEqual(["Mateo", "1:10 p. m.", "C"]);
    expect(plantillaMeta("asistencia_falta", { colegio: "C", alumno: "Mateo", momento: "a Matemática" })).toEqual({ nombre: "khipu_asistencia_falta", parametros: ["Mateo", "a Matemática", "C"] });
    expect(plantillaMeta("comunicado", { colegio: "C", titulo: "Paseo" })).toEqual({ nombre: "khipu_comunicado", parametros: ["Paseo", "C"] });
    expect(plantillaMeta("mensaje_nuevo", { colegio: "C", remitente: "Lucia", alumno: "Mateo" })?.nombre).toBe("khipu_mensaje_nuevo");
    expect(plantillaMeta("libreta_publicada", { colegio: "C", periodo: "I Bimestre 2026" })).toEqual({ nombre: "khipu_libreta", parametros: ["tu hijo", "I Bimestre 2026", "C"] });
  });

  it("las plantillas sin versión de WhatsApp devuelven null", () => {
    for (const n of ["resumen_llegadas", "tarea_nueva", "bienvenida", "alerta_rebote", "invitacion", "no_existe"]) expect(plantillaMeta(n, {})).toBeNull();
  });

  it("limpia los parámetros que Meta rechazaría", () => {
    expect(limpiarParametro("a\nb\t c    d")).toBe("a b c d");
    expect(limpiarParametro("")).toBe("-");
    expect(limpiarParametro("x".repeat(2000))).toHaveLength(1024);
  });

  it("arma el cuerpo de la solicitud de plantilla", () => {
    expect(armarSolicitudWhatsapp("+51987654321", { nombre: "khipu_comunicado", parametros: ["Paseo", "C"] })).toEqual({
      messaging_product: "whatsapp", recipient_type: "individual", to: "51987654321", type: "template",
      template: { name: "khipu_comunicado", language: { code: "es" }, components: [{ type: "body", parameters: [{ type: "text", text: "Paseo" }, { type: "text", text: "C" }] }] },
    });
  });
});

describe("WhatsAppChannel", () => {
  const envio = { avisoId: "a", destinatario: "+51987654321", remitente: "C", mensaje, plantilla: "comunicado", payload: { colegio: "C", titulo: "Paseo" } };

  it("hace POST a la Graph API con el token y devuelve el id del mensaje", async () => {
    const peticion = vi.fn(() => respuesta({ messages: [{ id: "wamid.ABC" }] }));
    const r = await new WhatsAppChannel(ENTORNO_WA, peticion as unknown as typeof fetch).enviar(envio);
    expect(r).toEqual({ providerMessageId: "wamid.ABC" });
    const [url, init] = peticion.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v21.0/1234567890/messages");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-prueba");
    expect(JSON.parse(init.body as string)).toMatchObject({ to: "51987654321", type: "template", template: { name: "khipu_comunicado" } });
  });

  it("sin credenciales falla de forma permanente y sin llamar a la red", async () => {
    const peticion = vi.fn();
    await expect(new WhatsAppChannel({}, peticion as unknown as typeof fetch).enviar(envio)).rejects.toBeInstanceOf(EnvioPermanenteError);
    expect(peticion).not.toHaveBeenCalled();
    expect(whatsappConfigurado({})).toBe(false);
    expect(whatsappConfigurado(ENTORNO_WA)).toBe(true);
  });

  it("distingue errores permanentes (número sin WhatsApp) de transitorios (500, 429)", async () => {
    const canal = (r: () => Promise<Response>) => new WhatsAppChannel(ENTORNO_WA, r as unknown as typeof fetch);
    await expect(canal(() => respuesta({ error: { code: 131026, message: "no es usuario" } }, 400)).enviar(envio)).rejects.toBeInstanceOf(EnvioPermanenteError);
    const transitorio = await canal(() => respuesta({ error: { code: 1, message: "caído" } }, 500)).enviar(envio).catch((e: unknown) => e);
    expect(transitorio).toBeInstanceOf(Error);
    expect(transitorio).not.toBeInstanceOf(EnvioPermanenteError);
    expect(await canal(() => respuesta({ error: { code: 130429, message: "límite" } }, 429)).enviar(envio).catch((e: unknown) => e)).not.toBeInstanceOf(EnvioPermanenteError);
  });

  it("rechaza una plantilla sin versión de WhatsApp", async () => {
    await expect(new WhatsAppChannel(ENTORNO_WA, vi.fn() as unknown as typeof fetch).enviar({ ...envio, plantilla: "tarea_nueva" })).rejects.toBeInstanceOf(EnvioPermanenteError);
  });
});

describe("SMS", () => {
  it("el texto cabe en 160 caracteres, sin tildes y solo con el nombre de pila", () => {
    const t = textoSms("asistencia_falta", { colegio: "Colegio Nuevo Horizonte", alumno: "Mateo", momento: "a la 1.ª hora" }) as string;
    expect(t).toBe("Colegio Nuevo Horizonte: Mateo no llego hoy a la 1.a hora. Justifica en Khipu Escolar.");
    expect(t).not.toMatch(/[^\x20-\x7e]/);
    expect(textoSms("asistencia_llego", { colegio: "C", alumno: "Mateo", hora: "08:05" })).toBe("C: Mateo llego al colegio a las 8:05 am.");
    for (const n of ["asistencia_llego", "asistencia_tarde", "asistencia_falta", "comunicado", "mensaje_nuevo", "libreta_publicada"]) {
      expect((textoSms(n, { colegio: "Institución Educativa Particular ".repeat(8), alumno: "Mateo", momento: "a Matemática", hora: "08:00" }) as string).length).toBeLessThanOrEqual(SMS_MAX_CARACTERES);
    }
  });

  it("el SMS de comunicado no filtra el título", () => {
    expect(textoSms("comunicado", { colegio: "C", titulo: "Reunión confidencial" })).not.toContain("confidencial");
  });

  it("plantillas sin SMS devuelven null", () => {
    expect(textoSms("resumen_llegadas", {})).toBeNull();
    expect(textoSms("bienvenida", {})).toBeNull();
  });

  it("hace POST a Twilio con Basic auth y formulario", async () => {
    const peticion = vi.fn(() => respuesta({ sid: "SM123" }, 201));
    const r = await new SmsChannel(ENTORNO_SMS, peticion as unknown as typeof fetch).enviar({
      avisoId: "a", destinatario: "+51987654321", remitente: "C", mensaje, plantilla: "comunicado", payload: { colegio: "C" },
    });
    expect(r).toEqual({ providerMessageId: "SM123" });
    const [url, init] = peticion.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACprueba/Messages.json");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("ACprueba:secreto").toString("base64")}`);
    const form = new URLSearchParams(init.body as string);
    expect(form.get("To")).toBe("+51987654321");
    expect(form.get("From")).toBe("+15005550006");
    expect(form.get("Body")).toContain("comunicado");
  });

  it("sin proveedor configurado falla de forma permanente; errores de Twilio se clasifican", async () => {
    const envio = { avisoId: "a", destinatario: "+51987654321", remitente: "C", mensaje, plantilla: "comunicado", payload: {} };
    expect(smsConfigurado({})).toBe(false);
    await expect(new SmsChannel({}, vi.fn() as unknown as typeof fetch).enviar(envio)).rejects.toBeInstanceOf(EnvioPermanenteError);
    await expect(new SmsChannel(ENTORNO_SMS, (() => respuesta({ code: 21211, message: "inválido" }, 400)) as unknown as typeof fetch).enviar(envio)).rejects.toBeInstanceOf(EnvioPermanenteError);
    expect(await new SmsChannel(ENTORNO_SMS, (() => respuesta({ message: "x" }, 503)) as unknown as typeof fetch).enviar(envio).catch((e: unknown) => e)).not.toBeInstanceOf(EnvioPermanenteError);
  });
});

describe("topes diarios de canales de pago", () => {
  it("usa la variable de entorno o el valor por defecto", () => {
    expect(limiteCanalDePago("whatsapp", { WHATSAPP_DAILY_LIMIT: "50" })).toBe(50);
    expect(limiteCanalDePago("sms", { SMS_DAILY_LIMIT: "0" })).toBe(0);
    expect(limiteCanalDePago("whatsapp", {})).toBe(1000);
    expect(limiteCanalDePago("sms", { SMS_DAILY_LIMIT: "abc" })).toBe(300);
  });
});

describe("webhook de WhatsApp", () => {
  const secreto = "app-secret-prueba";
  const cuerpo = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ id: "wamid.1", status: "delivered", timestamp: "1790000000" }] } }] }] });
  const firma = (c: string, s = secreto) => `sha256=${createHmac("sha256", s).update(c).digest("hex")}`;

  it("acepta la firma correcta", () => expect(firmaWhatsappValida(cuerpo, firma(cuerpo), secreto)).toBe(true));
  it("rechaza cuerpo alterado, secreto distinto, cabecera ausente o mal formada y servidor sin secreto", () => {
    expect(firmaWhatsappValida(cuerpo + " ", firma(cuerpo), secreto)).toBe(false);
    expect(firmaWhatsappValida(cuerpo, firma(cuerpo, "otro"), secreto)).toBe(false);
    expect(firmaWhatsappValida(cuerpo, null, secreto)).toBe(false);
    expect(firmaWhatsappValida(cuerpo, "sha256=abc", secreto)).toBe(false);
    expect(firmaWhatsappValida(cuerpo, firma(cuerpo).replace("sha256=", ""), secreto)).toBe(false);
    expect(firmaWhatsappValida(cuerpo, firma(cuerpo, ""), undefined)).toBe(false);
  });

  it("verifica la suscripción con hub.verify_token", () => {
    const q = (o: Record<string, string>) => new URLSearchParams(o);
    expect(verificarSuscripcionWhatsapp(q({ "hub.mode": "subscribe", "hub.verify_token": "t", "hub.challenge": "123" }), "t")).toBe("123");
    expect(verificarSuscripcionWhatsapp(q({ "hub.mode": "subscribe", "hub.verify_token": "x", "hub.challenge": "123" }), "t")).toBeNull();
    expect(verificarSuscripcionWhatsapp(q({ "hub.mode": "subscribe", "hub.verify_token": "t", "hub.challenge": "123" }), undefined)).toBeNull();
    expect(verificarSuscripcionWhatsapp(q({ "hub.verify_token": "t" }), "t")).toBeNull();
  });

  it("extrae estados y errores del POST; ignora lo demás", () => {
    const [e] = extraerEstadosWhatsapp(JSON.parse(cuerpo));
    expect(e).toMatchObject({ messageId: "wamid.1", estado: "delivered" });
    expect(e.momento.getTime()).toBe(1790000000 * 1000);
    const fallido = extraerEstadosWhatsapp({ entry: [{ changes: [{ value: { statuses: [{ id: "w2", status: "failed", errors: [{ code: 131026, title: "Message undeliverable" }] }] } }] }] });
    expect(fallido[0].error).toBe("WhatsApp: Message undeliverable (código 131026)");
    expect(extraerEstadosWhatsapp({ entry: [{ changes: [{ value: { messages: [{ id: "m" }] } }] }] })).toEqual([]);
    expect(extraerEstadosWhatsapp(null)).toEqual([]);
    expect(extraerEstadosWhatsapp({ entry: [{ changes: [{ value: { statuses: [{ id: "w", status: "raro" }] } }] }] })).toEqual([]);
  });
});
