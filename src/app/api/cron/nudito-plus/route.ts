import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { generarResumenesSemanales } from "@/lib/server/nudito-plus/resumenes";

// Resúmenes semanales de Nudito+ para las familias (specs/29). Lo llama el cron con «Authorization: Bearer <CRON_SECRET>».
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
  return NextResponse.json(await generarResumenesSemanales());
}

export const GET = manejar;
export const POST = manejar;
