import "server-only";
import { hora12 } from "@/lib/fechas";
import { EnvioPermanenteError, type EnvioAviso, type NotificationChannel, type ResultadoEnvio } from "./tipos";

// SMS con proveedor genérico; hoy solo Twilio REST (SMS_PROVEEDOR=twilio). specs/06.
// Texto corto (≤ 160 caracteres, sin tildes para quedarse en GSM-7) y sin datos sensibles: solo el nombre de pila del alumno.
// El destinatario de la fila `avisos` es el teléfono en E.164 (+51…). APAGADO por defecto.

export const SMS_MAX_CARACTERES = 160;

const texto = (valor: unknown, defecto = ""): string => (typeof valor === "string" && valor.trim() ? valor.trim() : defecto);

/** Quita tildes y signos fuera de GSM-7 («ó» → «o», «1.ª» → «1.a»). */
export function aGsm7(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ª/g, "a")
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Texto del SMS para una plantilla, o null si ese aviso no se manda por SMS. Siempre ≤ 160 caracteres. */
export function textoSms(plantilla: string, payload: Record<string, unknown>): string | null {
  const colegio = texto(payload.colegio, "Colegio");
  const alumno = texto(payload.alumno, "Tu hijo");
  const hora = typeof payload.hora === "string" && /^\d{2}:\d{2}$/.test(payload.hora) ? hora12(payload.hora).replace("a. m.", "am").replace("p. m.", "pm") : "";
  let cuerpo: string;
  switch (plantilla) {
    case "asistencia_llego":
      cuerpo = `${alumno} llego al colegio${hora ? ` a las ${hora}` : ""}.`;
      break;
    case "asistencia_tarde":
      cuerpo = `${alumno} llego tarde hoy${hora ? ` (${hora})` : ""}.`;
      break;
    case "asistencia_falta":
      cuerpo = `${alumno} no llego hoy ${texto(payload.momento, "a la 1.ª hora")}. Justifica en Khipu Escolar.`;
      break;
    case "comunicado":
      cuerpo = "Tienes un comunicado nuevo. Revisalo en Khipu Escolar.";
      break;
    case "mensaje_nuevo":
      cuerpo = "Tienes un mensaje nuevo. Revisalo en Khipu Escolar.";
      break;
    case "libreta_publicada":
      cuerpo = "Ya esta disponible la libreta. Revisala en Khipu Escolar.";
      break;
    default:
      return null;
  }
  const limpio = aGsm7(cuerpo);
  const encabezado = aGsm7(colegio);
  const completo = `${encabezado}: ${limpio}`;
  if (completo.length <= SMS_MAX_CARACTERES) return completo;
  // Recorta el nombre del colegio primero; el mensaje se conserva.
  const sitio = SMS_MAX_CARACTERES - limpio.length - 2;
  if (sitio >= 4) return `${encabezado.slice(0, sitio - 3).trimEnd()}...: ${limpio}`.slice(0, SMS_MAX_CARACTERES);
  return limpio.slice(0, SMS_MAX_CARACTERES);
}

export function smsSoportaPlantilla(plantilla: string): boolean {
  return textoSms(plantilla, {}) !== null;
}

export function smsConfigurado(entorno: Record<string, string | undefined> = process.env): boolean {
  return entorno.SMS_PROVEEDOR === "twilio" && Boolean(entorno.TWILIO_ACCOUNT_SID && entorno.TWILIO_AUTH_TOKEN && entorno.TWILIO_FROM);
}

/** Códigos de error de Twilio que no se arreglan reintentando (número inválido, bloqueado, sin permiso geográfico…). */
const ERRORES_PERMANENTES = new Set([21211, 21408, 21610, 21612, 21614, 21408, 30003, 30005, 30006, 20003, 20404]);

export class SmsChannel implements NotificationChannel {
  readonly canal = "sms" as const;

  constructor(
    private readonly entorno: Record<string, string | undefined> = process.env,
    private readonly peticion: typeof fetch = (...args) => fetch(...args),
  ) {}

  async enviar({ destinatario, plantilla, payload }: EnvioAviso): Promise<ResultadoEnvio> {
    if (!smsConfigurado(this.entorno)) {
      throw new EnvioPermanenteError("SMS sin proveedor configurado en el servidor (SMS_PROVEEDOR=twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)");
    }
    const cuerpo = plantilla ? textoSms(plantilla, payload ?? {}) : null;
    if (!cuerpo) throw new EnvioPermanenteError(`La plantilla «${plantilla ?? "?"}» no se envía por SMS`);

    const sid = this.entorno.TWILIO_ACCOUNT_SID as string;
    const credencial = Buffer.from(`${sid}:${this.entorno.TWILIO_AUTH_TOKEN}`).toString("base64");
    const respuesta = await this.peticion(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${credencial}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: destinatario, From: this.entorno.TWILIO_FROM as string, Body: cuerpo }).toString(),
      signal: AbortSignal.timeout(15_000),
    });
    const datos = (await respuesta.json().catch(() => ({}))) as { sid?: string; code?: number; message?: string };
    if (!respuesta.ok) {
      const detalle = `Twilio ${respuesta.status}${datos.code ? ` (código ${datos.code})` : ""}: ${datos.message ?? "sin detalle"}`;
      const permanente = respuesta.status >= 400 && respuesta.status < 500 && respuesta.status !== 429 && (datos.code === undefined || ERRORES_PERMANENTES.has(datos.code));
      if (permanente) throw new EnvioPermanenteError(detalle);
      throw new Error(detalle);
    }
    return { providerMessageId: datos.sid };
  }
}
