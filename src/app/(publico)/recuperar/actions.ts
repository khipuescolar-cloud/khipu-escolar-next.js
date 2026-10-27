"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { pedirRecuperacion } from "@/lib/server/auth";

export async function pedirRecuperacionAction(formData: FormData) {
  const email = z.email().safeParse(formData.get("email"));
  if (email.success) await pedirRecuperacion(email.data);
  redirect("/recuperar?enviado=1");
}
