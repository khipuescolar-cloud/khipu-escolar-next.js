"use server";

import { configDesdeFormulario } from "@/lib/nudito-seguimiento";
import { ejecutarYVolver } from "@/lib/server/accion-formulario";
import { contextoDeAccion } from "@/lib/server/contexto-accion";
import { guardarConfigNudito } from "@/lib/server/nudito/config-colegio";
import { requireFeature } from "@/lib/server/plan";

// Configuración institucional de Nudito (specs/44). Solo dirección; la validación y la auditoría viven en lib/server.
export async function guardarConfigNuditoAction(f: FormData): Promise<never> {
  const ctx = await contextoDeAccion(["direccion"]);
  requireFeature(ctx, "nudito_plus");
  return ejecutarYVolver("/configuracion/nudito", async () => {
    const r = await guardarConfigNudito(ctx, configDesdeFormulario(f));
    return r.activo ? "Guardamos la configuración. Nudito está activo." : "Guardamos la configuración. Nudito está apagado.";
  });
}
