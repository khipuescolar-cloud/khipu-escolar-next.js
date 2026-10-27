"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { urlRaiz } from "@/lib/dominio";
import { cerrarSesion } from "@/lib/server/auth";
import { COOKIE_ROL } from "@/lib/server/tenant";

export async function salirAction() {
  await cerrarSesion();
  redirect(urlRaiz("/login"));
}

/** Solo guarda la preferencia: requireTenantContext valida que el rol exista para el usuario. */
export async function cambiarRolAction(formData: FormData) {
  const rol = String(formData.get("rol") ?? "");
  (await cookies()).set(COOKIE_ROL, rol, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/inicio");
}
