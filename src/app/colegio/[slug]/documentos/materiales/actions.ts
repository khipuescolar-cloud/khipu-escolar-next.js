"use server";

import { revalidatePath } from "next/cache";
import { forbidden, unstable_rethrow } from "next/navigation";
import { requireTenantContext } from "@/lib/server/tenant";
import { requireFeature } from "@/lib/server/plan";
import { iniciarSubida, confirmarSubida } from "@/lib/server/almacenamiento";
import {
  crearMaterial, actualizarMaterial, nuevaVersionMaterial, publicarMaterial, archivarMaterial,
  moverMaterialAPapelera, restaurarMaterial, eliminarDefinitivoMaterial,
  crearSubcarpetaMaterial, moverMaterialACarpeta,
} from "@/lib/server/materiales";
import type { EntradaArchivo } from "@/lib/server/almacenamiento";

type Resultado = { ok: true; id?: string; numero?: number } | { ok: false; error: string };
const texto = (f: FormData, k: string) => String(f.get(k) ?? "");
const ids = (f: FormData, k: string) => f.getAll(k).filter((v): v is string => typeof v === "string");
async function contexto(slug: string) {
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "documentos");
  return ctx;
}
async function archivosDe(f: FormData): Promise<EntradaArchivo[]> {
  const archivos = await Promise.all(f.getAll("archivos").filter((v): v is File => v instanceof File && v.size > 0).map(async (v) => ({ nombre: v.name, buffer: Buffer.from(await v.arrayBuffer()) })));
  return [...archivos, ...ids(f, "subidaIds").map((subidaId) => ({ subidaId }))];
}
async function ejecutar(fn: () => Promise<{ id?: string; numero?: number } | void>): Promise<Resultado> {
  try {
    const valor = await fn();
    revalidatePath("/documentos/materiales");
    return { ok: true, ...(valor ?? {}) };
  } catch (e) {
    unstable_rethrow(e);
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo completar la operación." };
  }
}
export async function crearMaterialAction(slug: string, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  return ejecutar(async () => crearMaterial(ctx, { titulo: texto(f, "titulo"), descripcion: texto(f, "descripcion"), unidadTema: texto(f, "unidadTema"), cursoIds: ids(f, "cursoIds"), carpetaId: texto(f, "carpetaId") || null, archivos: await archivosDe(f), publicar: f.get("publicar") === "on", avisar: f.get("avisar") === "on" }));
}
export async function crearSubcarpetaMaterialAction(slug: string, e: { cursoId: string; parentId?: string | null; nombre: string }): Promise<Resultado> {
  const ctx = await contexto(slug);
  return ejecutar(() => crearSubcarpetaMaterial(ctx, e));
}
export async function moverMaterialACarpetaAction(slug: string, materialId: string, cursoId: string, carpetaId: string | null): Promise<Resultado> {
  const ctx = await contexto(slug);
  return ejecutar(() => moverMaterialACarpeta(ctx, materialId, cursoId, carpetaId));
}
export async function nuevaVersionMaterialAction(slug: string, id: string, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  return ejecutar(async () => nuevaVersionMaterial(ctx, id, { archivos: await archivosDe(f), nota: texto(f, "nota") }));
}
export async function actualizarMaterialAction(slug: string, id: string, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  return ejecutar(() => actualizarMaterial(ctx, id, { titulo: texto(f, "titulo"), descripcion: texto(f, "descripcion"), unidadTema: texto(f, "unidadTema"), cursoIds: ids(f, "cursoIds") }));
}
export async function publicarMaterialAction(slug: string, id: string): Promise<Resultado> { const ctx = await contexto(slug); return ejecutar(() => publicarMaterial(ctx, id)); }
export async function archivarMaterialAction(slug: string, id: string): Promise<Resultado> { const ctx = await contexto(slug); return ejecutar(() => archivarMaterial(ctx, id)); }
export async function moverMaterialAPapeleraAction(slug: string, id: string): Promise<Resultado> { const ctx = await contexto(slug); return ejecutar(() => moverMaterialAPapelera(ctx, id)); }
export async function restaurarMaterialAction(slug: string, id: string): Promise<Resultado> { const ctx = await contexto(slug); return ejecutar(() => restaurarMaterial(ctx, id)); }
export async function eliminarDefinitivoMaterialAction(slug: string, id: string): Promise<Resultado> { const ctx = await contexto(slug); return ejecutar(() => eliminarDefinitivoMaterial(ctx, id)); }
export async function iniciarSubidaMaterialAction(slug: string, e: { nombre: string; bytes: number; mimeDeclarado: string }) {
  const ctx = await contexto(slug);
  if (ctx.rol !== "profesor" || ctx.soporte) forbidden();
  return iniciarSubida(ctx, { categoria: "material_clase", ...e });
}
export async function confirmarSubidaMaterialAction(slug: string, subidaId: string) {
  const ctx = await contexto(slug);
  if (ctx.rol !== "profesor" || ctx.soporte) forbidden();
  return confirmarSubida(ctx, subidaId);
}
