"use server";

import { revalidatePath } from "next/cache";
import { texto } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { crearAnuncio, editarAnuncio, eliminarAnuncio, type EntradaAnuncio } from "@/lib/server/plataforma-anuncios";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import type { EstadoFormulario } from "../actions";

function datos(f: FormData): EntradaAnuncio {
  return {
    titulo: texto(f, "titulo"),
    cuerpo: texto(f, "cuerpo"),
    nivel: texto(f, "nivel") as "info",
    audiencia: texto(f, "audiencia") as "todos",
    planes: f.getAll("planes").map(String) as ("basico" | "fase2" | "promax")[],
    desde: texto(f, "desde"),
    hasta: texto(f, "hasta"),
  };
}

export async function guardarAnuncioAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  const id = texto(f, "id");
  try {
    if (id) await editarAnuncio(admin, id, datos(f));
    else await crearAnuncio(admin, datos(f));
    revalidatePath("/plataforma/anuncios");
    return { ok: id ? "Anuncio actualizado." : "Anuncio creado." };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
}

export async function eliminarAnuncioAction(f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  try {
    await eliminarAnuncio(admin, texto(f, "id"));
    revalidatePath("/plataforma/anuncios");
    return ok("Anuncio eliminado.");
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}
