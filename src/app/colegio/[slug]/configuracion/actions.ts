"use server";

import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { actualizarAsistenciaPorCurso, actualizarConfiguracion } from "@/lib/server/configuracion";
import { ErrorDeNegocio, contextoDeAccion } from "@/lib/server/contexto-accion";
import { quitarLogoColegio, subirLogoColegio } from "@/lib/server/logo";

export async function guardarConfiguracionAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion"]);
  await ejecutarYVolver("/configuracion", async () => {
    await actualizarConfiguracion(ctx, {
      horaLimiteTardanza: texto(formData, "horaLimiteTardanza"),
      plazoJustificacionDiasHabiles: texto(formData, "plazoJustificacionDiasHabiles") || undefined,
      escalaCalificacion: texto(formData, "escalaCalificacion") as "literal",
      emailDomains: texto(formData, "emailDomains"),
      gradoMinimoCuentaAlumno: texto(formData, "gradoMinimoCuentaAlumno") || undefined,
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

export async function guardarAsistenciaPorCursoAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion"]);
  await ejecutarYVolver("/configuracion", async () => {
    const niveles = await actualizarAsistenciaPorCurso(ctx, formData.getAll("niveles").map(String));
    return niveles.length === 0 ? "Asistencia por curso desactivada: solo se toma la asistencia al colegio." : "Asistencia por curso guardada.";
  });
}
