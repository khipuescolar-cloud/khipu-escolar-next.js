import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { registrarEjecucionCron } from "@/lib/server/plataforma-monitoreo";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { procesarControlIngreso } from "@/lib/server/control-ingreso";
import { cerrarResueltosInactivos } from "@/lib/server/soporte";
import { procesarVencimientosNudito } from "@/lib/server/nudito-plus/licencias";
import { licenciasFamiliaresNudito } from "@/lib/planes";
import { procesarVencimientosNsp } from "@/lib/server/nsp";
import { procesarEventosAcademicos } from "@/lib/server/eventos-academicos";
import { procesarTareasProgramadas } from "@/lib/server/notificaciones/avisos-tareas";

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
    // Licencias familiares de Nudito+ (specs/28): INERTES (NUDITO_LICENCIAS_FAMILIARES = false, lib/planes.ts). No se
    // marcan vencidas ni se envían recordatorios de renovación; las filas se conservan como histórico.
    const nuditoPlus = licenciasFamiliaresNudito() ? await procesarVencimientosNudito() : { desactivado: true };
    // Control de ingreso (specs/05): «aún no llega» y faltas automáticas; se encolan antes de procesar la cola.
    const controlIngreso = await procesarControlIngreso();
    // NSP (specs/37): consecuencia por vencimiento del plazo de justificación (idempotente).
    const vencimientosNsp = await procesarVencimientosNsp();
    // Notificaciones académicas (specs/38): eventos del outbox que el after() de la acción no alcanzó a procesar.
    // El resumen académico diario se retiró el 2026-11-03 (se reemplazó por estas notificaciones por evento).
    const eventosAcademicos = await procesarEventosAcademicos();
    // Tareas programadas (specs/39): aviso «tarea publicada» al llegar su `publicar_en` (consulta acotada, sin correo).
    const tareasProgramadas = await procesarTareasProgramadas();
    const resumen = { ...(await procesarCola()), soporteCerradas, nuditoPlus, controlIngreso, vencimientosNsp, eventosAcademicos, tareasProgramadas };
    await registrarEjecucionCron("avisos", "ok", Date.now() - inicio);
    return NextResponse.json(resumen);
  } catch (error) {
    await registrarEjecucionCron("avisos", "error", Date.now() - inicio);
    throw error;
  }
}

export const GET = manejar;
export const POST = manejar;
