"use server";

import { revalidatePath } from "next/cache";
import { texto } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { cambiarModuloDeRol, restablecerRoles } from "@/lib/server/plataforma-roles";
import { fallo, ok, type Resultado } from "@/lib/resultado";

// Acciones de «Roles y permisos» (specs/19). La lógica y la auditoría viven en src/lib/server/plataforma-roles.ts.

async function conResultado(fn: () => Promise<string>): Promise<Resultado> {
  try {
    const mensaje = await fn();
    revalidatePath("/plataforma/roles");
    return ok(mensaje);
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}

export async function cambiarModuloDeRolAction(f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return conResultado(async () => {
    const habilitado = texto(f, "habilitado") === "si";
    await cambiarModuloDeRol(admin, { rol: texto(f, "rol") as "direccion", modulo: texto(f, "modulo"), habilitado });
    return habilitado ? "Módulo habilitado para el rol en todos los colegios." : "Módulo desactivado para el rol en todos los colegios.";
  });
}

export async function restablecerRolesAction(): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return conResultado(async () => {
    const n = await restablecerRoles(admin);
    return n === 0 ? "Los roles ya estaban con los valores por defecto." : "Roles restablecidos a los valores por defecto.";
  });
}
