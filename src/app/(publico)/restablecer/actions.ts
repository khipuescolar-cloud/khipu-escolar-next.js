"use server";

import { redirect } from "next/navigation";
import { activarInvitaciones } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { supabaseServidor } from "@/lib/server/supabase";

export async function restablecerAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect("/restablecer?error=1");
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error || !data.user) redirect("/restablecer?error=1");
  await activarInvitaciones(data.user.id);
  await db.profile.updateMany({ where: { id: data.user.id }, data: { debeCambiarPassword: false } });
  redirect("/elegir-colegio");
}
