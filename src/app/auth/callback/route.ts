import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/server/supabase";

// Intercambia el código de Supabase Auth (recuperar contraseña, invitación) por una sesión.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const siguiente = request.nextUrl.searchParams.get("next") ?? "/restablecer";
  if (code) {
    const supabase = await supabaseServidor();
    await supabase.auth.exchangeCodeForSession(code);
  }
  const destino = siguiente.startsWith("/") ? siguiente : "/restablecer";
  return NextResponse.redirect(new URL(destino, request.url));
}
