"use server";

import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { contextoDeAccion, ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { anularPermiso, registrarPermiso } from "@/lib/server/permisos-asistencia";

const ROLES = ["direccion", "profesor", "administrativo"] as const;

export async function registrarPermisoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  await ejecutarYVolver("/permisos", async () => {
    const r = await registrarPermiso(ctx, {
      alumnoId: texto(formData, "alumnoId"), desde: texto(formData, "desde"), hasta: texto(formData, "hasta"),
      todoElDia: formData.get("alcance") !== "horas", horaDesde: texto(formData, "horaDesde"), horaHasta: texto(formData, "horaHasta"),
      motivo: texto(formData, "motivo"),
    });
    if (!r.ok) throw new ErrorDeNegocio(r.error);
    return r.mensaje;
  });
}

export async function anularPermisoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  await ejecutarYVolver("/permisos", async () => {
    const r = await anularPermiso(ctx, { permisoId: texto(formData, "permisoId"), motivo: texto(formData, "motivo") });
    if (!r.ok) throw new ErrorDeNegocio(r.error);
    return r.mensaje;
  });
}
