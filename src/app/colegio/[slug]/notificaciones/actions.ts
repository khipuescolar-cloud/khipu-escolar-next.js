"use server";

import { revalidatePath } from "next/cache";
import { marcarTodasLeidas, ROLES_BANDEJA } from "@/lib/server/notificaciones/bandeja";
import { requireTenantContext } from "@/lib/server/tenant";

export async function marcarTodasLeidasAction(slug: string) {
  await marcarTodasLeidas(await requireTenantContext(slug, ROLES_BANDEJA));
  revalidatePath("/colegio/[slug]", "layout");
}
