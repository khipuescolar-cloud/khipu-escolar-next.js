"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { Resultado } from "@/lib/resultado";
import { adjuntosDeFormData, idsParaQuitar } from "@/lib/server/adjuntos";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { requireFeature } from "@/lib/server/plan";
import { actualizarTarea, crearTarea, eliminarTarea } from "@/lib/server/tareas";
import { requireTenantContext } from "@/lib/server/tenant";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "");

async function contexto(slug: string) {
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "tareas");
  return ctx;
}

export async function crearTareaAction(slug: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  const avisarFamilias = f.get("avisarFamilias") === "on";
  const r = await crearTarea(ctx, {
    cursoId: texto(f, "cursoId"), titulo: texto(f, "titulo"), descripcion: texto(f, "descripcion"), fechaEntrega: texto(f, "fechaEntrega"),
    avisarFamilias,
  }, await adjuntosDeFormData(f));
  if (r.ok) {
    revalidatePath("/colegio/[slug]/tareas", "page");
    if (avisarFamilias) {
      after(async () => {
        try {
          await procesarCola({ tenantId: ctx.tenant.id });
        } catch (error) {
          console.error("[avisos] error al procesar la cola", error);
        }
      });
    }
  }
  return r;
}

export async function eliminarTareaAction(slug: string, tareaId: string): Promise<Resultado> {
  const r = await eliminarTarea(await contexto(slug), tareaId);
  if (r.ok) revalidatePath("/colegio/[slug]/tareas", "page");
  return r;
}

export async function actualizarTareaAction(slug: string, tareaId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await actualizarTarea(await contexto(slug), tareaId, {
    titulo: texto(f, "titulo"), descripcion: texto(f, "descripcion"), fechaEntrega: texto(f, "fechaEntrega"),
  }, { nuevos: await adjuntosDeFormData(f), quitar: idsParaQuitar(f) });
  if (r.ok) revalidatePath("/colegio/[slug]/tareas", "page");
  return r;
}
