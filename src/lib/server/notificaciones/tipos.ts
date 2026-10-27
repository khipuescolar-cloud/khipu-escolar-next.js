import type { CanalAviso } from "@/generated/prisma/enums";
import type { Mensaje } from "../email/plantillas";

/** Lo que un canal necesita para enviar un aviso ya renderizado. */
export type EnvioAviso = {
  avisoId: string;
  destinatario: string;
  /** Nombre visible del remitente: el colegio. */
  remitente: string;
  mensaje: Mensaje;
  /** Para el encabezado List-Unsubscribe. */
  urlPreferencias?: string;
  /** Plantilla y payload ya completado: WhatsApp y SMS arman su texto con ellos (no usan el HTML del correo). */
  plantilla?: string;
  payload?: Record<string, unknown>;
};

export type ResultadoEnvio = { providerMessageId?: string };

/** Error que no vale la pena reintentar (destino inválido o dado de baja). */
export class EnvioPermanenteError extends Error {}

/** Interfaz común de canales (correo, push, WhatsApp y SMS). */
export interface NotificationChannel {
  readonly canal: CanalAviso;
  enviar(envio: EnvioAviso): Promise<ResultadoEnvio>;
}
