"use server";

import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { contextoDeAccion, ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { registrarIncidencia } from "@/lib/server/incidencias";

export async function registrarIncidenciaAction(formData: FormData) {
  const ctx = await contextoDeAccion(["direccion", "profesor", "administrativo"]);
  await ejecutarYVolver("/incidencias", async () => {
    const r = await registrarIncidencia(ctx, {
      alumnoId: texto(formData, "alumnoId"), fecha: texto(formData, "fecha"), hora: texto(formData, "hora"), tipo: texto(formData, "tipo"),
      descripcion: texto(formData, "descripcion"), retiro: formData.get("retiro") === "on", horaRetiro: texto(formData, "horaRetiro"),
      cursoIds: formData.getAll("cursoIds").map(String),
    });
    if (!r.ok) throw new ErrorDeNegocio(r.error);
    return r.mensaje;
  });
}
