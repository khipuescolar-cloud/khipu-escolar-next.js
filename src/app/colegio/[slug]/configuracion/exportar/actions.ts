"use server";

import { ejecutarYVolver } from "@/lib/server/accion-formulario";
import { contextoDeAccion } from "@/lib/server/contexto-accion";
import { solicitarExportacionDireccion } from "@/lib/server/exportar";

export async function prepararExportacionAction() {
  const ctx = await contextoDeAccion(["direccion"]);
  await ejecutarYVolver("/configuracion/exportar", async () => {
    const e = await solicitarExportacionDireccion(ctx);
    return e.estado === "procesando" ? "Ya estamos preparando tu exportación." : "Listo. Preparamos tu exportación; en unos minutos podrás descargarla aquí.";
  });
}
