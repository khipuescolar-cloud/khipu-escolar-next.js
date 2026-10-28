"use server";

import { revalidatePath } from "next/cache";
import { texto } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { agregarFeriado, guardarHorarioNudito, quitarFeriado } from "@/lib/server/plataforma-configuracion";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import type { EstadoFormulario } from "../actions";

export async function agregarFeriadoAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  try {
    await agregarFeriado(admin, {
      fecha: texto(f, "fecha"),
      nombre: texto(f, "nombre"),
      alcance: texto(f, "alcance") as "nacional",
      region: texto(f, "region"),
      tenantId: texto(f, "tenantId"),
    });
    revalidatePath("/plataforma/configuracion");
    return { ok: "Día agregado. Ya cuenta como no laborable en los plazos de justificación." };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
}

export async function quitarFeriadoAction(f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  try {
    await quitarFeriado(admin, texto(f, "id"));
    revalidatePath("/plataforma/configuracion");
    return ok("Día quitado de la lista.");
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}

export async function guardarHorarioNuditoAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  try {
    await guardarHorarioNudito(admin, { inicio: texto(f, "inicio"), fin: texto(f, "fin") });
    revalidatePath("/plataforma/configuracion");
    return { ok: "Horario de Nudito guardado." };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
}
