"use server";

import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { actualizarConfiguracion } from "@/lib/server/configuracion";
import { contextoDeAccion } from "@/lib/server/contexto-accion";

export async function guardarConfiguracionAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion"]);
  await ejecutarYVolver("/configuracion", async () => {
    await actualizarConfiguracion(ctx, {
      horaEnvioAvisos: texto(formData, "horaEnvioAvisos"),
      horaLimiteTardanza: texto(formData, "horaLimiteTardanza"),
      modoAvisos: texto(formData, "modoAvisos") as "todos",
      escalaCalificacion: texto(formData, "escalaCalificacion") as "literal",
      emailDomains: texto(formData, "emailDomains"),
    });
    return "Configuración guardada.";
  });
}
