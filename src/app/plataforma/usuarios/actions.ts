"use server";

import { revalidatePath } from "next/cache";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import {
  cambiarEstadoMembresiaUsuario, enviarRecuperacionUsuario, forzarCambioPasswordUsuario, restablecerPasswordUsuario,
} from "@/lib/server/plataforma-usuarios";
import { fallo, ok, type Resultado } from "@/lib/resultado";

// Acciones de soporte a personas (specs/21). Cada una exige super administrador y queda auditada.

async function ejecutar(f: FormData, mensaje: string, fn: (admin: Awaited<ReturnType<typeof requireAdminPlataforma>>) => Promise<void>): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  try {
    await fn(admin);
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
  revalidatePath(`/plataforma/usuarios/${String(f.get("userId") ?? "")}`);
  return ok(mensaje);
}

const id = (f: FormData, n: string) => String(f.get(n) ?? "");

export async function restablecerPasswordAction(f: FormData) {
  return ejecutar(f, "Listo: la contraseña volvió a ser su documento y deberá cambiarla al entrar.", (a) => restablecerPasswordUsuario(a, id(f, "userId")));
}

export async function enviarRecuperacionAction(f: FormData) {
  return ejecutar(f, "Enviamos el enlace de recuperación a su correo.", (a) => enviarRecuperacionUsuario(a, id(f, "userId")));
}

export async function forzarCambioPasswordAction(f: FormData) {
  return ejecutar(f, "La persona deberá cambiar su contraseña en su próximo ingreso.", (a) => forzarCambioPasswordUsuario(a, id(f, "userId")));
}

export async function cambiarMembresiaAction(f: FormData) {
  const activa = id(f, "activa") === "1";
  return ejecutar(f, activa ? "Membresía reactivada." : "Membresía desactivada.", (a) => cambiarEstadoMembresiaUsuario(a, id(f, "membershipId"), activa));
}
