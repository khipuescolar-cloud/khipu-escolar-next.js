import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { EnvioAviso, NotificationChannel, ResultadoEnvio } from "./tipos";

// Correo con Nodemailer: Mailpit en local, Amazon SES SMTP (o Gmail) en el piloto (variables SMTP_*).
// Un solo transporte por proceso (nivel de módulo): con SES/Gmail es un **pool** de conexiones SMTP reutilizadas (sin un
// handshake TLS + AUTH por correo). El ritmo lo sigue poniendo `procesarCola` (EMAIL_RATE_PER_SECOND), no el pool.

let transporte: Transporter | null = null;

type Entorno = Record<string, string | undefined>;

const entero = (valor: string | undefined, porDefecto: number) => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : porDefecto;
};

/**
 * Opciones del transporte. `SMTP_POOL` = "true" | "false"; si no se define, se usa pool cuando hay usuario SMTP (SES, Gmail)
 * y no en local (Mailpit o el SMTP nulo de las pruebas de estrés, sin usuario). `SMTP_MAX_CONNECTIONS` (3 por defecto; Gmail
 * corta con más) y `SMTP_MAX_MESSAGES` (100 por conexión, luego se reabre) solo aplican con pool.
 */
export function opcionesTransporte(env: Entorno = process.env) {
  const usuario = env.SMTP_USER;
  const pool = env.SMTP_POOL ? env.SMTP_POOL === "true" : !!usuario;
  return {
    host: env.SMTP_HOST ?? "127.0.0.1",
    port: Number(env.SMTP_PORT ?? 54325),
    secure: env.SMTP_SECURE === "true",
    auth: usuario ? { user: usuario, pass: env.SMTP_PASS ?? "" } : undefined,
    ...(pool ? { pool: true as const, maxConnections: entero(env.SMTP_MAX_CONNECTIONS, 3), maxMessages: entero(env.SMTP_MAX_MESSAGES, 100) } : {}),
  };
}

function crearTransporte(): Transporter {
  return nodemailer.createTransport(opcionesTransporte());
}

/** Cierra el transporte compartido (y sus conexiones del pool). Para scripts y tests: el servidor lo mantiene abierto. */
export function cerrarTransporteCorreo(): void {
  transporte?.close();
  transporte = null;
}

export class EmailChannel implements NotificationChannel {
  readonly canal = "correo" as const;

  constructor(private readonly transport: Transporter = (transporte ??= crearTransporte())) {}

  async enviar({ avisoId, destinatario, remitente, mensaje, urlPreferencias }: EnvioAviso): Promise<ResultadoEnvio> {
    const desde = process.env.EMAIL_FROM_ADDRESS ?? "avisos@khipuescolar.pe";
    const info = await this.transport.sendMail({
      from: { name: remitente, address: desde },
      to: destinatario,
      subject: mensaje.asunto,
      html: mensaje.html,
      text: mensaje.texto,
      headers: {
        // Permite cruzar los eventos de SES con la fila de `avisos` (además del Message-ID).
        "X-Khipu-Aviso": avisoId,
        ...(urlPreferencias ? { "List-Unsubscribe": `<${urlPreferencias}>` } : {}),
      },
    });
    return { providerMessageId: info.messageId };
  }
}
