import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { purgarPapeleraVencida } from "@/lib/server/almacenamiento/papelera";
import { barrerSubidasVencidas, reconciliarCuotas } from "@/lib/server/almacenamiento";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto ?? ""}`);
  if (!secreto || actual.length !== esperado.length || !timingSafeEqual(actual, esperado)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const vencidas = await barrerSubidasVencidas();
  const papelera = await purgarPapeleraVencida();
  const ajustes = new Date().getUTCDay() === 0 ? await reconciliarCuotas() : [];
  return NextResponse.json({ vencidas: vencidas.expiradas, papelera, ajustes: ajustes.length });
}
