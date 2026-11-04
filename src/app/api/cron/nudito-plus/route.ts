import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { nuditoPlusDisponible } from "@/lib/planes";
import { purgarRetencion } from "@/lib/server/nudito/retencion";
import { generarResumenesPractica, generarResumenesSemanales } from "@/lib/server/nudito-plus/resumenes";

// Cron semanal de Nudito, tutor de Khipu Pro (specs/44). Lo llama el cron con «Authorization: Bearer <CRON_SECRET>»:
// 1) resúmenes semanales para las familias (práctica con el tutor: sesiones y dominios; y el chat antiguo de Nudito+);
// 2) purga de retención (intentos, ejercicios, mensajes de sesión y fotos vencidos según `retencion_dias` de cada colegio).
export const maxDuration = 300;

function autorizado(request: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = Buffer.from(request.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

async function manejar(request: Request) {
  if (!autorizado(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!nuditoPlusDisponible()) return NextResponse.json({ desactivado: true, creados: 0 });
  const practica = await generarResumenesPractica();
  const chat = await generarResumenesSemanales();
  const retencion = await purgarRetencion();
  return NextResponse.json({ ...chat, practica, retencion });
}

export const GET = manejar;
export const POST = manejar;
