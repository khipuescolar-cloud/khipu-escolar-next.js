"use server";

import { revalidatePath } from "next/cache";
import { texto } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { cambiarModuloDePlan, editarPlan } from "@/lib/server/plataforma-planes";
import { fallo, ok, type Resultado } from "@/lib/resultado";

// Acciones de «Planes y módulos» (specs/19). La lógica y la auditoría viven en src/lib/server/plataforma-planes.ts.

async function conResultado(fn: () => Promise<string>): Promise<Resultado> {
  try {
    const mensaje = await fn();
    revalidatePath("/plataforma/planes");
    return ok(mensaje);
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}

export async function editarPlanAction(_previo: Resultado | null, f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return conResultado(async () => {
    await editarPlan(admin, texto(f, "plan"), {
      nombre: texto(f, "nombre"),
      descripcion: texto(f, "descripcion"),
      precioPorAlumno: texto(f, "precioPorAlumno"),
      precioMinimoMensual: texto(f, "precioMinimoMensual"),
      maxAlumnos: texto(f, "maxAlumnos"),
      activo: f.get("activo") === "on",
    });
    return "Plan actualizado.";
  });
}

export async function cambiarModuloDePlanAction(f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return conResultado(async () => {
    const incluir = texto(f, "incluir") === "si";
    const { afectados } = await cambiarModuloDePlan(admin, texto(f, "plan"), texto(f, "modulo"), incluir);
    const colegios = afectados === 1 ? "1 colegio" : `${afectados} colegios`;
    return incluir ? `Módulo incluido en el plan (${colegios}).` : `Módulo quitado del plan (${colegios}).`;
  });
}
