"use server";

import { revalidatePath } from "next/cache";
import { actualizarEvento, crearEvento, eliminarEvento } from "@/lib/server/agenda";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import type { Resultado } from "@/lib/resultado";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "");

async function contexto(slug: string) {
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "agenda");
  return ctx;
}

export async function crearEventoAction(slug: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await crearEvento(await contexto(slug), {
    titulo: texto(f, "titulo"), descripcion: texto(f, "descripcion"), tipo: texto(f, "tipo"),
    fecha: texto(f, "fecha"), hora: texto(f, "hora"), salonId: texto(f, "salonId"),
  });
  if (r.ok) revalidatePath("/colegio/[slug]/agenda", "page");
  return r;
}

export async function eliminarEventoAction(slug: string, eventoId: string): Promise<Resultado> {
  const r = await eliminarEvento(await contexto(slug), eventoId);
  if (r.ok) revalidatePath("/colegio/[slug]/agenda", "page");
  return r;
}

export async function actualizarEventoAction(slug: string, eventoId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await actualizarEvento(await contexto(slug), eventoId, {
    titulo: texto(f, "titulo"), descripcion: texto(f, "descripcion"), tipo: texto(f, "tipo"), fecha: texto(f, "fecha"), hora: texto(f, "hora"),
  });
  if (r.ok) revalidatePath("/colegio/[slug]/agenda", "page");
  return r;
}
