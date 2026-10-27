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
};

export type ResultadoEnvio = { providerMessageId?: string };

/** Error que no vale la pena reintentar (destino inválido o dado de baja). */
export class EnvioPermanenteError extends Error {}

/** Interfaz común de canales (correo y push hoy; WhatsApp o SMS después). */
export interface NotificationChannel {
  readonly canal: CanalAviso;
  enviar(envio: EnvioAviso): Promise<ResultadoEnvio>;
}
