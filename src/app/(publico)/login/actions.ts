"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esCorreoPersonal, urlPlataforma } from "@/lib/dominio";
import { colegioPorDominio, iniciarSesion, ipDeCabeceras } from "@/lib/server/auth";

export type EstadoLogin = { error?: string; email?: string };

const esquema = z.object({
  email: z.email("Escribe un correo válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

const MENSAJES = {
  credenciales: "El correo o la contraseña no coinciden.",
  bloqueado: "Hubo demasiados intentos. Espera 15 minutos o recupera tu contraseña.",
  "sin-colegio": "Tu cuenta no está vinculada a ningún colegio activo. Escribe a tu colegio.",
} as const;

export async function loginAction(_prev: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const datos = esquema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!datos.success) return { error: datos.error.issues[0].message, email };

  const ip = ipDeCabeceras(await headers());
  const resultado = await iniciarSesion(datos.data.email, datos.data.password, ip);
  if (!resultado.ok) return { error: MENSAJES[resultado.error], email };

  const siguiente =
    resultado.destino.tipo === "plataforma"
      ? urlPlataforma("/")
      : resultado.destino.tipo === "elegir"
        ? "/elegir-colegio"
        : `/entrando?colegio=${resultado.destino.slug}`;
  // Contraseña inicial (su documento): primero debe cambiarla.
  if (resultado.debeCambiarPassword) redirect(`/cambiar-password?siguiente=${encodeURIComponent(siguiente)}`);
  redirect(siguiente);
}

/** Muestra el colegio detectado por el dominio del correo. Para correos personales no revela nada. */
export async function detectarColegio(email: string): Promise<{ nombre: string } | { personal: true } | null> {
  if (!z.email().safeParse(email).success) return null;
  if (esCorreoPersonal(email)) return { personal: true };
  const colegio = await colegioPorDominio(email);
  return colegio ? { nombre: colegio.nombre } : null;
}
