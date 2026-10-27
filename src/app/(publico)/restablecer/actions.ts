"use server";

import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/server/supabase";

export async function restablecerAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect("/restablecer?error=1");
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/restablecer?error=1");
  redirect("/elegir-colegio");
}
