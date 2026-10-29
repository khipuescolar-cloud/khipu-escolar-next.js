"use server";

import { after } from "next/server";
import { ejecutarYVolver } from "@/lib/server/accion-formulario";
import { contextoDeAccion } from "@/lib/server/contexto-accion";
import { procesarExportaciones, solicitarExportacionDireccion } from "@/lib/server/exportar";

export async function prepararExportacionAction() {
  const ctx = await contextoDeAccion(["direccion"]);
  await ejecutarYVolver("/configuracion/exportar", async () => {
    const e = await solicitarExportacionDireccion(ctx);
    // Se prepara al momento, sin esperar al cron (en Vercel Hobby el cron corre una vez al día).
    after(() => procesarExportaciones(new Date(), { tenantId: ctx.tenant.id }));
    return e.estado === "procesando" ? "Ya estamos preparando tu exportación." : "Listo. Preparamos tu exportación; en unos minutos podrás descargarla aquí.";
  });
}
