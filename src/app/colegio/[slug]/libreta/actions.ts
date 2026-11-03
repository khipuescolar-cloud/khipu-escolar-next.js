"use server";

import { revalidatePath } from "next/cache";
import type { Resultado } from "@/lib/resultado";
import { guardarComentarioTutor } from "@/lib/server/libreta";
import { requireTenantContext } from "@/lib/server/tenant";

export async function guardarComentarioTutorAction(slug: string, alumnoId: string, periodoId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await guardarComentarioTutor(await requireTenantContext(slug), { alumnoId, periodoId, texto: String(f.get("texto") ?? "") });
  if (r.ok) revalidatePath("/colegio/[slug]/libreta", "layout");
  return r;
}
