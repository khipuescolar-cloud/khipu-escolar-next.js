"use server";

import { revalidatePath } from "next/cache";
import { texto } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { agregarMiembro, cambiarActivoMiembro } from "@/lib/server/plataforma-equipo";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import type { EstadoFormulario } from "../actions";

export async function agregarMiembroAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  try {
    const r = await agregarMiembro(admin, { email: texto(f, "email"), nombres: texto(f, "nombres"), apellidos: texto(f, "apellidos"), documento: texto(f, "documento") });
    revalidatePath("/plataforma/equipo");
    if (!r.cuentaNueva) return { ok: "Listo. Ya tenía cuenta: conserva su contraseña y deberá cambiarla al entrar." };
    if (r.enlaceEnviado) return { ok: "Listo. Le enviamos un enlace al correo para crear su contraseña." };
    return { ok: "Listo. Su contraseña inicial es su número de documento y deberá cambiarla al entrar." };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
}

async function cambiar(f: FormData, activo: boolean): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  try {
    await cambiarActivoMiembro(admin, texto(f, "adminId"), activo);
    revalidatePath("/plataforma/equipo");
    return ok(activo ? "Miembro reactivado." : "Miembro desactivado.");
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}

export async function desactivarMiembroAction(f: FormData): Promise<Resultado> {
  return cambiar(f, false);
}

export async function reactivarMiembroAction(f: FormData): Promise<Resultado> {
  return cambiar(f, true);
}
