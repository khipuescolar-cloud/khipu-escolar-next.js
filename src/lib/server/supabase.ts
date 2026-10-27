import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Cliente de Supabase Auth ligado a las cookies del request.
 * Las cookies se emiten con COOKIE_DOMAIN (.lvh.me / .khipuescolar.pe) para que la sesión
 * sirva en el dominio raíz y en todos los subdominios de colegio.
 * Solo se usa para Auth: los datos se leen y escriben con Prisma.
 */
export async function supabaseServidor() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookieOptions: { domain: env.cookieDomain, sameSite: "lax", path: "/" },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // En Server Components no se pueden escribir cookies; el proxy refresca la sesión.
        }
      },
    },
  });
}

/** Cliente con service role: crear usuarios, invitar, cambiar contraseñas. Solo servidor. */
export function supabaseAdmin() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
