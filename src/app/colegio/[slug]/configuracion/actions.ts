"use server";

import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { actualizarConfiguracion } from "@/lib/server/configuracion";
import { ErrorDeNegocio, contextoDeAccion } from "@/lib/server/contexto-accion";
import { actualizarCanalesPago } from "@/lib/server/notificaciones/canales-pago";
import { quitarLogoColegio, subirLogoColegio } from "@/lib/server/logo";

export async function guardarConfiguracionAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion"]);
  await ejecutarYVolver("/configuracion", async () => {
    await actualizarConfiguracion(ctx, {
      horaLimiteTardanza: texto(formData, "horaLimiteTardanza"),
      plazoJustificacionDiasHabiles: texto(formData, "plazoJustificacionDiasHabiles") || undefined,
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

export async function guardarCanalesPagoAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion"]);
  await ejecutarYVolver("/configuracion", async () => {
    await actualizarCanalesPago(ctx, { whatsappActivo: formData.get("whatsappActivo") === "on", smsActivo: formData.get("smsActivo") === "on" });
    return "Canales de pago guardados.";
  });
}
