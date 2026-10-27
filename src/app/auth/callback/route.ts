import { NextResponse, type NextRequest } from "next/server";
import { ipDeCabeceras, registrarIngreso } from "@/lib/server/auth";
import { supabaseServidor } from "@/lib/server/supabase";

// Intercambia el código de Supabase Auth (recuperar contraseña, invitación) por una sesión.
// Ese intercambio es un ingreso: queda en login_intentos y en profiles.ultimo_ingreso_at (specs/02).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const siguiente = request.nextUrl.searchParams.get("next") ?? "/restablecer";
  if (code) {
    const supabase = await supabaseServidor();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) await registrarIngreso({ id: data.user.id, email: data.user.email }, ipDeCabeceras(request.headers));
  }
  const destino = siguiente.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/restablecer";
  return NextResponse.redirect(new URL(destino, request.url));
}
