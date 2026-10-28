"use server";

import { revalidatePath } from "next/cache";
import { texto } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { cambiarModuloDeColegio } from "@/lib/server/plataforma-planes";
import { fallo, ok, type Resultado } from "@/lib/resultado";

/** Agrega, quita o restablece un módulo de un colegio (specs/19). Auditado en src/lib/server/plataforma-planes.ts. */
export async function cambiarModuloDeColegioAction(_previo: Resultado | null, f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  const tenantId = texto(f, "tenantId");
  try {
    const mensaje = await cambiarModuloDeColegio(admin, tenantId, {
      modulo: texto(f, "modulo"),
      accion: texto(f, "accion") as "agregar",
      motivo: texto(f, "motivo"),
    });
    revalidatePath(`/plataforma/colegios/${tenantId}`);
    return ok(mensaje);
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}
