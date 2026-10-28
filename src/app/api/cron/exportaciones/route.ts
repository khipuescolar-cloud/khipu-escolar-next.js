import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { registrarEjecucionCron } from "@/lib/server/plataforma-monitoreo";
import { procesarExportaciones } from "@/lib/server/exportar";

// Worker de exportaciones del colegio (specs/15). Lo llama el cron con «Authorization: Bearer <CRON_SECRET>».
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
  const inicio = Date.now();
  try {
    const resumen = await procesarExportaciones();
    await registrarEjecucionCron("exportaciones", "ok", Date.now() - inicio);
    return NextResponse.json(resumen);
  } catch (error) {
    await registrarEjecucionCron("exportaciones", "error", Date.now() - inicio);
    throw error;
  }
}

export const GET = manejar;
export const POST = manejar;
