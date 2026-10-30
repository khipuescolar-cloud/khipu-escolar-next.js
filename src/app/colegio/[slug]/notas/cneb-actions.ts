"use server";

// Acciones de capacidades y desempeños del CNEB (specs/30). La lógica y los permisos viven en src/lib/server/cneb.ts.
import { revalidatePath } from "next/cache";
import type { Resultado } from "@/lib/resultado";
import {
  crearCapacidad, crearDesempeno, editarCapacidad, editarDesempeno, eliminarCapacidad, eliminarDesempeno, fijarGradoSalon, importarCneb,
  moverCapacidad, moverCompetencia, moverDesempeno,
} from "@/lib/server/cneb";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "");
type Direccion = "arriba" | "abajo";
const direccionValida = (d: string): Direccion => (d === "arriba" ? "arriba" : "abajo");

async function contexto(slug: string) {
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "notas");
  return ctx;
}

function refrescar(r: Resultado) {
  if (r.ok) {
    revalidatePath("/colegio/[slug]/notas", "layout");
    revalidatePath("/colegio/[slug]/libreta", "layout");
  }
  return r;
}

export async function fijarGradoAction(slug: string, salonId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  return refrescar(await fijarGradoSalon(await contexto(slug), { salonId, grado: texto(f, "grado") }));
}

export async function importarCnebAction(slug: string, cursoId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  return refrescar(await importarCneb(await contexto(slug), cursoId, texto(f, "area") || undefined));
}

export async function crearCapacidadAction(slug: string, competenciaId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  return refrescar(await crearCapacidad(await contexto(slug), { competenciaId, nombre: texto(f, "nombre"), descripcion: texto(f, "descripcion") }));
}

export async function editarCapacidadAction(slug: string, capacidadId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  return refrescar(await editarCapacidad(await contexto(slug), capacidadId, { nombre: texto(f, "nombre"), descripcion: texto(f, "descripcion") }));
}

export async function eliminarCapacidadAction(slug: string, capacidadId: string): Promise<Resultado> {
  return refrescar(await eliminarCapacidad(await contexto(slug), capacidadId));
}

export async function crearDesempenoAction(slug: string, competenciaId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  return refrescar(await crearDesempeno(await contexto(slug), {
    competenciaId, capacidadId: texto(f, "capacidadId"), descripcion: texto(f, "descripcion"), codigo: texto(f, "codigo"),
  }));
}

export async function editarDesempenoAction(slug: string, desempenoId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  return refrescar(await editarDesempeno(await contexto(slug), desempenoId, {
    capacidadId: texto(f, "capacidadId"), descripcion: texto(f, "descripcion"), codigo: texto(f, "codigo"),
  }));
}

export async function eliminarDesempenoAction(slug: string, desempenoId: string): Promise<Resultado> {
  return refrescar(await eliminarDesempeno(await contexto(slug), desempenoId));
}

export async function moverAction(slug: string, tipo: "competencia" | "capacidad" | "desempeno", id: string, direccion: string): Promise<Resultado> {
  const ctx = await contexto(slug);
  const d = direccionValida(direccion);
  const r = tipo === "competencia" ? await moverCompetencia(ctx, id, d) : tipo === "capacidad" ? await moverCapacidad(ctx, id, d) : await moverDesempeno(ctx, id, d);
  return refrescar(r);
}
