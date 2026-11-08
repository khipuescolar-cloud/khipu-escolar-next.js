"use server";

import { revalidatePath } from "next/cache";
import { fallo, type Resultado } from "@/lib/resultado";
import { requireFeature } from "@/lib/server/plan";
import { asignarPlantilla, eliminarPlantilla, guardarPlantilla } from "@/lib/server/plantillas-horario";
import { requireTenantContext } from "@/lib/server/tenant";

async function contexto(slug: string) {
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo"]);
  requireFeature(ctx, "horario");
  return ctx;
}

function refrescar<T extends Resultado>(r: T): T {
  if (r.ok) {
    revalidatePath("/colegio/[slug]/agenda/horario", "layout");
    revalidatePath("/colegio/[slug]/inicio", "page");
  }
  return r;
}

/** Crea (id vacío) o actualiza una plantilla. Los recreos y salones llegan como JSON en campos ocultos. */
export async function guardarPlantillaAction(slug: string, id: string | null, _previo: Resultado | null, f: FormData): Promise<Resultado & { id?: string }> {
  const ctx = await contexto(slug);
  let recreos: unknown;
  let salonIds: unknown;
  try {
    recreos = JSON.parse(String(f.get("recreos") ?? "[]"));
    salonIds = JSON.parse(String(f.get("salonIds") ?? "[]"));
  } catch {
    return fallo("No pudimos leer el formulario. Recarga la página e intenta otra vez.");
  }
  const texto = (k: string) => String(f.get(k) ?? "");
  return refrescar(
    await guardarPlantilla(ctx, id, {
      nombre: texto("nombre"), horaEntrada: texto("horaEntrada"), horaSalida: texto("horaSalida"), duracionClase: texto("duracionClase"),
      horaLimiteFalta: texto("horaLimiteFalta"), recreos, salonIds,
    }),
  );
}

export async function eliminarPlantillaAction(slug: string, id: string): Promise<Resultado> {
  return refrescar(await eliminarPlantilla(await contexto(slug), id));
}

export async function asignarPlantillaAction(slug: string, salonId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  return refrescar(await asignarPlantilla(await contexto(slug), salonId, String(f.get("plantillaId") ?? "")));
}
