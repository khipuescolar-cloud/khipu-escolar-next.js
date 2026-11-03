"use server";

import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { actualizarAsistenciaPorCurso, actualizarConfiguracion, actualizarReglasAcademicas } from "@/lib/server/configuracion";
import { ErrorDeNegocio, contextoDeAccion } from "@/lib/server/contexto-accion";
import { quitarLogoColegio, subirLogoColegio } from "@/lib/server/logo";

export async function guardarConfiguracionAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion"]);
  await ejecutarYVolver("/configuracion", async () => {
    await actualizarConfiguracion(ctx, {
      horaLimiteTardanza: texto(formData, "horaLimiteTardanza"),
      horaLimiteFalta: texto(formData, "horaLimiteFalta") || undefined,
      controlIngresoAutomatico: formData.get("controlIngresoAutomatico") === "on",
      plazoJustificacionDias: texto(formData, "plazoJustificacionDias") || undefined,
      escalaCalificacion: texto(formData, "escalaCalificacion") as "literal",
      sugerenciaPeriodo: (texto(formData, "sugerenciaPeriodo") || undefined) as "ninguna" | undefined,
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

export async function guardarReglasAcademicasAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion"]);
  await ejecutarYVolver("/configuracion", async () => {
    await actualizarReglasAcademicas(ctx, {
      consecuenciaVencimiento: texto(formData, "consecuenciaVencimiento"),
    });
    return "Reglas académicas guardadas.";
  });
}
