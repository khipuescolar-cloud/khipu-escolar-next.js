import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { EnvioAviso, NotificationChannel, ResultadoEnvio } from "./tipos";

// Correo con Nodemailer: Mailpit en local, Amazon SES SMTP en el piloto (variables SMTP_*).

let transporte: Transporter | null = null;

function crearTransporte(): Transporter {
  const usuario = process.env.SMTP_USER;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "127.0.0.1",
    port: Number(process.env.SMTP_PORT ?? 54325),
    secure: process.env.SMTP_SECURE === "true",
    auth: usuario ? { user: usuario, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
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
