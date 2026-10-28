import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { registrarEjecucionCron } from "@/lib/server/plataforma-monitoreo";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { cerrarResueltosInactivos } from "@/lib/server/soporte";

// Worker de avisos (specs/06). Lo llama el cron con «Authorization: Bearer <CRON_SECRET>».
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
    // Mesa de ayuda (specs/23): las resueltas sin actividad hace 7 días pasan a cerradas.
    const soporteCerradas = await cerrarResueltosInactivos();
    const resumen = { ...(await procesarCola()), soporteCerradas };
    await registrarEjecucionCron("avisos", "ok", Date.now() - inicio);
    return NextResponse.json(resumen);
  } catch (error) {
    await registrarEjecucionCron("avisos", "error", Date.now() - inicio);
    throw error;
  }
}

export const GET = manejar;
export const POST = manejar;
