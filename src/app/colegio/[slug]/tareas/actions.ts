"use server";

import { revalidatePath } from "next/cache";
import type { Resultado } from "@/lib/resultado";
import { requireFeature } from "@/lib/server/plan";
import { crearTarea, eliminarTarea } from "@/lib/server/tareas";
import { requireTenantContext } from "@/lib/server/tenant";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "");

async function contexto(slug: string) {
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "tareas");
  return ctx;
}

export async function crearTareaAction(slug: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await crearTarea(await contexto(slug), {
    cursoId: texto(f, "cursoId"), titulo: texto(f, "titulo"), descripcion: texto(f, "descripcion"), fechaEntrega: texto(f, "fechaEntrega"),
  });
  if (r.ok) revalidatePath("/colegio/[slug]/tareas", "page");
  return r;
}

export async function eliminarTareaAction(slug: string, tareaId: string): Promise<Resultado> {
  const r = await eliminarTarea(await contexto(slug), tareaId);
  if (r.ok) revalidatePath("/colegio/[slug]/tareas", "page");
  return r;
}
