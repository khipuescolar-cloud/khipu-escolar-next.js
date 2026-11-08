import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { procesarLoteInterno } from "@/lib/server/nudito/lecciones/preparacion";

export const maxDuration = 300;
function autorizado(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = Buffer.from(request.headers.get("authorization") ?? "");
  const esperado = Buffer.from("Bearer " + secreto);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}
async function manejar(request: Request) {
  if (!autorizado(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const trabajos = await db.nuditoTrabajoContenido.findMany({ where: { estado: { in: ["pendiente", "en_proceso"] } }, orderBy: { createdAt: "asc" }, take: 3, select: { id: true, tenantId: true } });
  const resultados = [];
  for (const trabajo of trabajos) {
    const resultado = await procesarLoteInterno(trabajo.tenantId, trabajo.id);
    resultados.push({ trabajoId: resultado.id, estado: resultado.estado, procesados: resultado.procesados });
  }
  return NextResponse.json({ trabajos: resultados });
}
export const GET = manejar;
export const POST = manejar;
