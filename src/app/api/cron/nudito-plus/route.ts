import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { nuditoPlusDisponible } from "@/lib/planes";
import { generarResumenesSemanales } from "@/lib/server/nudito-plus/resumenes";

// Resúmenes semanales de Nudito+ para las familias (specs/29). Lo llama el cron con «Authorization: Bearer <CRON_SECRET>».
// Nudito+ está APAGADO (NUDITO_PLUS_DISPONIBLE, lib/planes.ts): la ruta responde sin trabajo. La entrada de vercel.json
// se mantiene a propósito para que reactivarlo sea solo cambiar la constante.
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
  return NextResponse.json(await generarResumenesSemanales());
}

export const GET = manejar;
export const POST = manejar;
