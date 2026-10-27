"use server";

import { revalidatePath } from "next/cache";
import { generarCarnetsSalon, regenerarCarnet, revocarCarnet } from "@/lib/server/porteria";
import { requireTenantContext } from "@/lib/server/tenant";

export async function generarCarnetsAction(slug: string, salonId: string) {
  const ctx = await requireTenantContext(slug, ["direccion"]);
  await generarCarnetsSalon(ctx, salonId);
  revalidatePath("/colegio/[slug]/gestion/carnets", "layout");
}

export async function regenerarCarnetAction(slug: string, alumnoId: string) {
  const ctx = await requireTenantContext(slug, ["direccion"]);
  await regenerarCarnet(ctx, alumnoId);
  revalidatePath("/colegio/[slug]/gestion/carnets", "layout");
}

export async function revocarCarnetAction(slug: string, alumnoId: string) {
  const ctx = await requireTenantContext(slug, ["direccion"]);
  await revocarCarnet(ctx, alumnoId);
  revalidatePath("/colegio/[slug]/gestion/carnets", "layout");
}
