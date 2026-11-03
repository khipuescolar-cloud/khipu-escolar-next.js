"use server";

import { revalidatePath } from "next/cache";
import { marcarTodasLeidas } from "@/lib/server/notificaciones/bandeja";
import { requireTenantContext } from "@/lib/server/tenant";

export async function marcarTodasLeidasAction(slug: string) {
  await marcarTodasLeidas(await requireTenantContext(slug, ["apoderado"]));
  revalidatePath("/colegio/[slug]", "layout");
}
