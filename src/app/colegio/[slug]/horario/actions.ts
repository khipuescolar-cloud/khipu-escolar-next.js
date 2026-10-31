"use server";

import { revalidatePath } from "next/cache";
import { fallo, type Resultado } from "@/lib/resultado";
import { asignarBloque, copiarHorario, crearPeriodosSugeridos, guardarPeriodos, quitarBloque } from "@/lib/server/horario";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "");

async function contexto(slug: string) {
  const ctx = await requireTenantContext(slug, ["direccion"]);
  requireFeature(ctx, "horario");
  return ctx;
}

function refrescar(r: Resultado) {
  if (r.ok) {
    revalidatePath("/colegio/[slug]/horario", "page");
    revalidatePath("/colegio/[slug]/inicio", "page");
  }
  return r;
}

function casillero(f: FormData) {
  return { salonId: texto(f, "salonId"), dia: texto(f, "dia"), periodoId: texto(f, "periodoId") };
}

/** Guardar un casillero; con `accion=vaciar` lo vacía. */
export async function casilleroAction(slug: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  if (texto(f, "accion") === "vaciar") return refrescar(await quitarBloque(ctx, casillero(f)));
  const esCurso = texto(f, "tipo") !== "otro";
  return refrescar(
    await asignarBloque(ctx, {
      ...casillero(f),
      cursoId: esCurso ? texto(f, "cursoId") : "",
      titulo: esCurso ? "" : texto(f, "titulo"),
      profesorId: esCurso ? "" : texto(f, "profesorId"),
      aula: texto(f, "aula"),
    }),
  );
}

export async function copiarAction(slug: string, destinoId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  return refrescar(await copiarHorario(await contexto(slug), destinoId, texto(f, "origenId")));
}

export async function periodosAction(slug: string, nivel: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  let lista: unknown;
  try {
    lista = JSON.parse(texto(f, "periodos"));
  } catch {
    return fallo("No pudimos leer las horas. Recarga la página e intenta otra vez.");
  }
  return refrescar(await guardarPeriodos(ctx, nivel, lista));
}

export async function sugeridasAction(slug: string, nivel: string): Promise<Resultado> {
  return refrescar(await crearPeriodosSugeridos(await contexto(slug), nivel));
}
