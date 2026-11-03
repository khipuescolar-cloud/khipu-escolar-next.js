import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { registrarEjecucionCron } from "@/lib/server/plataforma-monitoreo";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { procesarControlIngreso } from "@/lib/server/control-ingreso";
import { cerrarResueltosInactivos } from "@/lib/server/soporte";
import { procesarVencimientosNudito } from "@/lib/server/nudito-plus/licencias";
import { procesarVencimientosNsp } from "@/lib/server/nsp";
import { procesarEventosAcademicos } from "@/lib/server/eventos-academicos";

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
    // Nudito+ (specs/28): licencias vencidas y recordatorio «vence en 3 días» (se encolan antes de procesar la cola).
    const nuditoPlus = await procesarVencimientosNudito();
    // Control de ingreso (specs/05): «aún no llega» y faltas automáticas; se encolan antes de procesar la cola.
    const controlIngreso = await procesarControlIngreso();
    // NSP (specs/37): consecuencia por vencimiento del plazo de justificación (idempotente).
    const vencimientosNsp = await procesarVencimientosNsp();
    // Notificaciones académicas (specs/38): eventos del outbox que el after() de la acción no alcanzó a procesar.
    // El resumen académico diario se retiró el 2026-11-03 (se reemplazó por estas notificaciones por evento).
    const eventosAcademicos = await procesarEventosAcademicos();
    const resumen = { ...(await procesarCola()), soporteCerradas, nuditoPlus, controlIngreso, vencimientosNsp, eventosAcademicos };
    await registrarEjecucionCron("avisos", "ok", Date.now() - inicio);
    return NextResponse.json(resumen);
  } catch (error) {
    await registrarEjecucionCron("avisos", "error", Date.now() - inicio);
    throw error;
  }
}

export const GET = manejar;
export const POST = manejar;
