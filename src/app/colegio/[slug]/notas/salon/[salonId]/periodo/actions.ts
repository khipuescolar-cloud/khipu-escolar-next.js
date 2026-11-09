"use server";
import { revalidatePath } from "next/cache";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { solicitarReportesPeriodo } from "@/lib/server/calificacion-periodo";
import { requireTenantContext } from "@/lib/server/tenant";

export async function solicitarReportesPeriodoAction(slug: string, entrada: unknown) {
  try {
    const resultado = await solicitarReportesPeriodo(await requireTenantContext(slug), entrada);
    revalidatePath("/colegio/[slug]/notas/salon/[salonId]/periodo", "page");
    return { ok: true as const, ...resultado };
  } catch (error) {
    if (error instanceof ErrorDeNegocio) return { ok: false as const, error: error.message };
    throw error;
  }
}
