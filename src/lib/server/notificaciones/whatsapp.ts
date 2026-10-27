import "server-only";
import { hora12 } from "@/lib/fechas";
import { EnvioPermanenteError, type EnvioAviso, type NotificationChannel, type ResultadoEnvio } from "./tipos";

// WhatsApp Cloud API de Meta (specs/06). Solo mensajes de PLANTILLA aprobada (fuera de la ventana de 24 h
// Meta no permite texto libre). El destinatario de la fila `avisos` es el teléfono en E.164 (+51…).
// APAGADO por defecto: el colegio lo activa en Configuración y el servidor necesita las variables WHATSAPP_*.

const VERSION_POR_DEFECTO = "v21.0";
/** Idioma de las plantillas en Meta (`es` = Español; `es_PE` = Español (Perú)). */
export const IDIOMA_PLANTILLA = "es";

export type PlantillaMeta = { nombre: string; parametros: string[] };

/** Meta no admite saltos de línea, tabulaciones ni más de 4 espacios seguidos en un parámetro; máx. 1024 caracteres. */
export function limpiarParametro(valor: string): string {
  return valor.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 1024) || "-";
}

const texto = (valor: unknown, defecto = "-"): string => (typeof valor === "string" && valor.trim() ? valor : defecto);

/**
 * Nuestra plantilla → plantilla aprobada en Meta y sus parámetros del cuerpo ({{1}}, {{2}}…), en orden.
 * Devuelve null si ese aviso no se envía por WhatsApp.
 *   khipu_asistencia_llego  {{1}} alumno · {{2}} hora · {{3}} colegio
 *   khipu_asistencia_tarde  {{1}} alumno · {{2}} hora · {{3}} colegio
 *   khipu_asistencia_falta  {{1}} alumno · {{2}} momento («a la 1.ª hora») · {{3}} colegio
 *   khipu_comunicado        {{1}} título · {{2}} colegio
 *   khipu_mensaje_nuevo     {{1}} remitente · {{2}} alumno · {{3}} colegio
 *   khipu_libreta           {{1}} alumno («tu hijo» si falta) · {{2}} periodo · {{3}} colegio
 */
export function plantillaMeta(plantilla: string, payload: Record<string, unknown>): PlantillaMeta | null {
  const colegio = texto(payload.colegio, "Tu colegio");
  const hora = typeof payload.hora === "string" && /^\d{2}:\d{2}$/.test(payload.hora) ? hora12(payload.hora) : "-";
  let r: PlantillaMeta | null;
  switch (plantilla) {
    case "asistencia_llego":
      r = { nombre: "khipu_asistencia_llego", parametros: [texto(payload.alumno), hora, colegio] };
      break;
    case "asistencia_tarde":
      r = { nombre: "khipu_asistencia_tarde", parametros: [texto(payload.alumno), hora, colegio] };
      break;
    case "asistencia_falta":
      r = { nombre: "khipu_asistencia_falta", parametros: [texto(payload.alumno), texto(payload.momento, "a la 1.ª hora"), colegio] };
      break;
    case "comunicado":
      r = { nombre: "khipu_comunicado", parametros: [texto(payload.titulo), colegio] };
      break;
    case "mensaje_nuevo":
      r = { nombre: "khipu_mensaje_nuevo", parametros: [texto(payload.remitente), texto(payload.alumno), colegio] };
      break;
    case "libreta_publicada":
      r = { nombre: "khipu_libreta", parametros: [texto(payload.alumno, "tu hijo"), texto(payload.periodo), colegio] };
      break;
    default:
      return null;
  }
  return { nombre: r.nombre, parametros: r.parametros.map(limpiarParametro) };
}

export function whatsappSoportaPlantilla(plantilla: string): boolean {
  return plantillaMeta(plantilla, {}) !== null;
}

export function whatsappConfigurado(entorno: Record<string, string | undefined> = process.env): boolean {
  return Boolean(entorno.WHATSAPP_TOKEN && entorno.WHATSAPP_PHONE_NUMBER_ID);
}

/** Cuerpo del POST a /messages. */
export function armarSolicitudWhatsapp(para: string, plantilla: PlantillaMeta) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: para.replace(/^\+/, ""),
    type: "template",
    template: {
      name: plantilla.nombre,
      language: { code: IDIOMA_PLANTILLA },
      components: [{ type: "body", parameters: plantilla.parametros.map((text) => ({ type: "text", text })) }],
    },
  };
}

/** Códigos de error de Meta que no se arreglan reintentando (número sin WhatsApp, plantilla inexistente, token inválido…). */
const ERRORES_PERMANENTES = new Set([100, 131008, 131009, 131026, 131030, 131037, 131042, 131047, 131051, 132000, 132001, 132005, 132007, 132012, 190, 200, 10]);

export class WhatsAppChannel implements NotificationChannel {
  readonly canal = "whatsapp" as const;

  constructor(
    private readonly entorno: Record<string, string | undefined> = process.env,
    private readonly peticion: typeof fetch = (...args) => fetch(...args),
  ) {}

  async enviar({ destinatario, plantilla, payload }: EnvioAviso): Promise<ResultadoEnvio> {
    const token = this.entorno.WHATSAPP_TOKEN;
    const numeroId = this.entorno.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !numeroId) throw new EnvioPermanenteError("WhatsApp sin credenciales en el servidor (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID)");
    const meta = plantilla ? plantillaMeta(plantilla, payload ?? {}) : null;
    if (!meta) throw new EnvioPermanenteError(`La plantilla «${plantilla ?? "?"}» no se envía por WhatsApp`);

    const version = (this.entorno.WHATSAPP_API_VERSION || VERSION_POR_DEFECTO).replace(/^(?!v)/, "v");
    const respuesta = await this.peticion(`https://graph.facebook.com/${version}/${numeroId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(armarSolicitudWhatsapp(destinatario, meta)),
      signal: AbortSignal.timeout(15_000),
    });
    const cuerpo = (await respuesta.json().catch(() => ({}))) as { messages?: { id?: string }[]; error?: { message?: string; code?: number } };
    if (!respuesta.ok) {
      const detalle = `WhatsApp ${respuesta.status}${cuerpo.error?.code ? ` (código ${cuerpo.error.code})` : ""}: ${cuerpo.error?.message ?? "sin detalle"}`;
      const permanente = (respuesta.status >= 400 && respuesta.status < 500 && respuesta.status !== 429) && (cuerpo.error?.code === undefined || ERRORES_PERMANENTES.has(cuerpo.error.code));
      if (permanente) throw new EnvioPermanenteError(detalle);
      throw new Error(detalle);
    }
    return { providerMessageId: cuerpo.messages?.[0]?.id };
  }
}
