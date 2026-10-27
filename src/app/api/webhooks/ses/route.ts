import { NextResponse } from "next/server";
import { confirmarSuscripcion, procesarEventoSes, verificarFirmaSns, type MensajeSns } from "@/lib/server/notificaciones/ses";

// Eventos de Amazon SES publicados por SNS (specs/06). Solo se aceptan mensajes con firma SNS válida.
export async function POST(request: Request) {
  let mensaje: MensajeSns;
  try {
    mensaje = JSON.parse(await request.text()) as MensajeSns;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!(await verificarFirmaSns(mensaje))) return NextResponse.json({ error: "Firma inválida" }, { status: 403 });

  if (mensaje.Type === "SubscriptionConfirmation") {
    const ok = await confirmarSuscripcion(mensaje);
    return NextResponse.json({ confirmado: ok }, { status: ok ? 200 : 400 });
  }
  if (mensaje.Type !== "Notification") return NextResponse.json({ ok: true });

  let evento: unknown;
  try {
    evento = JSON.parse(mensaje.Message);
  } catch {
    return NextResponse.json({ ok: true, ignorado: true });
  }
  const estado = await procesarEventoSes(evento as Parameters<typeof procesarEventoSes>[0]);
  return NextResponse.json({ ok: true, estado });
}
