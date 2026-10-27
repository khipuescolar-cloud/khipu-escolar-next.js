import { NextResponse } from "next/server";
import { aplicarEstadosWhatsapp, extraerEstadosWhatsapp, firmaWhatsappValida, verificarSuscripcionWhatsapp } from "@/lib/server/notificaciones/whatsapp-webhook";

// Webhook de WhatsApp Cloud API (specs/06). GET: verificación al registrar el webhook en Meta.
// POST: estados del mensaje (entregado, leído, fallido) con firma X-Hub-Signature-256.

export async function GET(request: Request) {
  const challenge = verificarSuscripcionWhatsapp(new URL(request.url).searchParams, process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
  if (challenge === null) return new NextResponse("Prohibido", { status: 403 });
  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: Request) {
  const cuerpo = await request.text();
  if (!firmaWhatsappValida(cuerpo, request.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 403 });
  }
  let datos: unknown;
  try {
    datos = JSON.parse(cuerpo);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const actualizados = await aplicarEstadosWhatsapp(extraerEstadosWhatsapp(datos));
  return NextResponse.json({ ok: true, actualizados });
}
