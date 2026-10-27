"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ipDeCabeceras, registrarIngreso } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { supabaseServidor } from "@/lib/server/supabase";
import { usuarioActual } from "@/lib/server/tenant";

/** Solo se permite volver a rutas propias (relativas o de nuestro dominio). */
function destinoSeguro(siguiente: string): string {
  const base = process.env.APP_BASE_DOMAIN ?? "lvh.me:3000";
  if (siguiente.startsWith("/") && !siguiente.startsWith("//")) return siguiente;
  try {
    const u = new URL(siguiente);
    if (u.host === base || u.host.endsWith(`.${base}`)) return siguiente;
  } catch {}
  return "/elegir-colegio";
}

export async function cambiarPasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");
  const siguiente = destinoSeguro(String(formData.get("siguiente") ?? "/elegir-colegio"));
  const volver = (error: string) => redirect(`/cambiar-password?error=${error}&siguiente=${encodeURIComponent(siguiente)}`);

  const user = await usuarioActual();
  if (!user) redirect("/login");
  if (password.length < 8) volver("corta");
  if (password !== confirmacion) volver("distintas");
  if (user.numeroDocumento && password.includes(user.numeroDocumento)) volver("documento");

  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) volver("guardar");
  await db.profile.update({ where: { id: user.id }, data: { debeCambiarPassword: false } });
  await registrarIngreso(user, ipDeCabeceras(await headers()));
  redirect(siguiente);
}
