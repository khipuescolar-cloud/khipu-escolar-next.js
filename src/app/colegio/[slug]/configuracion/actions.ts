"use server";

import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { actualizarConfiguracion } from "@/lib/server/configuracion";
import { ErrorDeNegocio, contextoDeAccion } from "@/lib/server/contexto-accion";
import { quitarLogoColegio, subirLogoColegio } from "@/lib/server/logo";

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

export async function subirLogoAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion"]);
  const archivo = formData.get("logo");
  await ejecutarYVolver("/configuracion", async () => {
    if (!(archivo instanceof File) || archivo.size === 0) throw new ErrorDeNegocio("Elige una imagen para el logo.");
    await subirLogoColegio(ctx, Buffer.from(await archivo.arrayBuffer()));
    return "Logo actualizado.";
  });
}

export async function quitarLogoAction() {
  const ctx = await contextoDeAccion(["direccion"]);
  await ejecutarYVolver("/configuracion", async () => {
    await quitarLogoColegio(ctx);
    return "Logo quitado.";
  });
}
