import "server-only";
import webpush, { WebPushError } from "web-push";
import { db } from "../db";
import { EnvioPermanenteError, type EnvioAviso, type NotificationChannel, type ResultadoEnvio } from "./tipos";

// Web Push con VAPID. El destinatario de la fila `avisos` es el endpoint de la suscripción.

function configurar(): boolean {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:soporte@khipuescolar.pe", publica, privada);
  return true;
}

export class PushChannel implements NotificationChannel {
  readonly canal = "push" as const;

  async enviar({ destinatario, remitente, mensaje }: EnvioAviso): Promise<ResultadoEnvio> {
    if (!configurar()) throw new EnvioPermanenteError("Push sin claves VAPID configuradas");
    const suscripcion = await db.pushSuscripcion.findUnique({ where: { endpoint: destinatario } });
    if (!suscripcion) throw new EnvioPermanenteError("La suscripción push ya no existe");
    const cuerpo = JSON.stringify({
      titulo: `${remitente}: ${mensaje.push.titulo}`,
      cuerpo: mensaje.push.cuerpo,
      url: mensaje.push.url ?? "/",
    });
    try {
      await webpush.sendNotification(
        { endpoint: suscripcion.endpoint, keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth } },
        cuerpo,
        { TTL: 60 * 60 * 12 },
      );
    } catch (error) {
      // 404/410: el navegador dio de baja la suscripción.
      if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
        await db.pushSuscripcion.deleteMany({ where: { endpoint: destinatario } });
        throw new EnvioPermanenteError("Suscripción push vencida");
      }
      throw error;
    }
    return {};
  }
}
